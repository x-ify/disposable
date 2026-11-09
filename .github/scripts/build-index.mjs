// Validate the canonical registry and build its deterministic public index.
// node .github/scripts/build-index.mjs build|check [registryDir]
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseDisposable, validateTool, readFolder, scanText, RULES_VERSION } from '../../skills/disposable/scripts/check.mjs';
import { inspect } from './scan.mjs';
export { parseDisposable };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const defaultRegistry = root;
export const indexPath = resolve(root, 'registry.json');

export async function readTools(registryDir = defaultRegistry) {
  const toolsDir = resolve(registryDir, 'tools');
  const tools = [];
  for (const entry of (await readdir(toolsDir, { withFileTypes: true })).filter(e => e.isDirectory() && !e.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name))) {
    const files = await readFolder(resolve(toolsDir, entry.name));
    const doc = files.find(f => f.path === 'DISPOSABLE.md');
    const parsed = doc?.text != null ? parseDisposable(doc.text) : { problems: ['missing DISPOSABLE.md'] };
    const problems = validateTool(entry.name, parsed, files);
    tools.push({ slug: entry.name, parsed, files, problems });
  }
  return tools;
}

export async function check(registryDir = defaultRegistry) {
  const tools = await readTools(registryDir);
  return tools.filter(t => t.problems.length).map(t => ({ slug: t.slug, problems: t.problems }));
}

export async function build(registryDir = defaultRegistry, fetchImpl = globalThis.fetch, source = { repo: 'x-ify/disposable', commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() }) {
  const tools = await readTools(registryDir);
  const failed = tools.filter(t => t.problems.length);
  if (failed.length) throw new Error('Registry check failed: ' + failed.map(t => `${t.slug}: ${t.problems.join('; ')}`).join(' | '));
  const reviewed = await readReviewed(registryDir);
  const entries = [];
  for (const t of tools) {
    const m = t.parsed.meta, s = t.parsed.sections;
    const data = {
      title: m.title, summary: m.summary, type: m.type, mode: m.mode, device: m.device, locale: m.language, license: m.license,
      maintainers: m.maintainers.split(',').map(v => v.trim()).filter(Boolean), author: m.author, cost: m.cost, support: m.support,
      tags: m.tags || '', origin: m.origin || '', liveUrl: m.live || '', art: m.art || '',
      sourceUrl: m.source || '', sourcePath: m.source_path || '', sourceRef: m.source_commit || '',
      example: s.example, requirements: s.requirements, steps: s.steps, rebuild: s.rebuild, limits: s.limits,
    };
    const hash = createHash('sha256');
    for (const f of t.files) hash.update(f.path + '\0').update(f.buffer || '');
    // Static text checks over every text file in the folder; an external source is fetched at its pinned commit.
    const scan = data.sourceUrl ? await inspect({ ...data, body: data.rebuild }, fetchImpl) : { version: RULES_VERSION, status: 'clear', files: [], bytes: 0, findings: [] };
    {
      for (const f of t.files.filter(f => f.text != null)) { scan.files.push(f.path); scan.bytes += f.bytes; scan.findings.push(...scanText(f.text)); }
      scan.findings = [...new Set(scan.findings)];
      scan.status = scan.findings.length || scan.sourceError ? 'held' : scan.partial ? 'partial' : 'clear';
    }
    delete scan.at; // keep the index deterministic; the version hash identifies what was checked
    const version = hash.digest('hex').slice(0, 12);
    // A held tool is listed only when the Disposable team accepted exactly these findings for exactly this content.
    // Any change to the folder changes the version and voids the review.
    const review = reviewed[t.slug];
    if (scan.status === 'held' && !scan.sourceError && review?.version === version && scan.findings.every(f => review.findings.includes(f)))
      Object.assign(scan, { status: 'reviewed', reviewedReason: review.reason, reviewer: review.reviewer });
    entries.push({ slug: t.slug, version, added: m.added, files: t.files.map(f => ({ path: f.path, bytes: f.bytes })), data, scan });
  }
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(source.repo) || !/^[0-9a-f]{40}$/.test(source.commit)) throw new Error('Invalid index source');
  return { format: 1, source, tools: entries };
}

// reviewed.json: { "tools": { "<slug>": { "version", "findings": [...], "reason", "reviewer" } } }.
// Changed only by the Disposable team through a reviewed pull request.
export async function readReviewed(registryDir = defaultRegistry) {
  let raw;
  try { raw = await readFile(resolve(registryDir, 'reviewed.json'), 'utf8'); } catch { return {}; }
  const tools = JSON.parse(raw).tools || {};
  for (const [slug, r] of Object.entries(tools))
    if (!/^[0-9a-f]{12}$/.test(r.version || '') || !Array.isArray(r.findings) || !r.findings.length || !r.reason || !/^[A-Za-z0-9-]{1,39}$/.test(r.reviewer || ''))
      throw new Error(`reviewed.json: ${slug} needs version (12 hex), findings, reason and reviewer`);
  return tools;
}

export const serialize = index => JSON.stringify(index, null, 1) + '\n';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, dir] = process.argv.slice(2);
  const registryDir = dir ? resolve(dir) : defaultRegistry;
  if (command === 'check') {
    const failed = await check(registryDir);
    for (const f of failed) console.error(`${f.slug}\n  - ${f.problems.join('\n  - ')}`);
    if (failed.length) process.exit(1);
    console.log('Registry check passed.');
  } else if (command === 'build') {
    await writeFile(indexPath, serialize(await build(registryDir)));
    console.log(`Wrote ${relative(root, indexPath)}.`);
  } else {
    console.error('Usage: node .github/scripts/build-index.mjs check|build [registryDir]');
    process.exit(2);
  }
}
