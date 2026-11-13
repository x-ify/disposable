// Validate the canonical registry and build its deterministic public index.
// node .github/scripts/build-index.mjs build|check [registryDir]
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseDisposable, validateTool, readFolder, scanText, checkSkill, githubRepo, RULES_VERSION } from '../../skills/disposable/scripts/check.mjs';
import { inspect } from './scan.mjs';
export { parseDisposable };

// A skill's entry carries what the site needs to show and install it. The SKILL.md body is capped at this many
// characters; `truncated` says it was cut, and the install link always points at the complete, pinned folder.
export const INSTRUCTIONS_LIMIT = 20000;
const endsMidPair = text => /[\ud800-\udbff]$/.test(text);
const clip = (text, max) => { let out = text.slice(0, max); if (endsMidPair(out)) out = out.slice(0, -1); return out; };
const oneLine = (text, max) => { const flat = text.replace(/\s+/g, ' ').trim(); return flat.length <= max ? flat : clip(flat, max - 1).trimEnd() + '…'; };
// The first `# ` heading outside fenced code.
function firstHeading(markdown) {
  let fence = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*(?:```|~~~)/.test(line)) fence = !fence;
    else if (!fence && /^# +\S/.test(line)) return line.replace(/^# +/, '').replace(/\s+#+\s*$/, '').trim();
  }
  return '';
}
// The tree link the skills CLI installs from (`npx skills add <link>`); one ref segment, so a full commit SHA pins it.
export const treeURL = (repoURL, commit, path = '') => `${repoURL}/tree/${commit}${path ? '/' + path.split('/').filter(Boolean).map(encodeURIComponent).join('/') : ''}`;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const defaultRegistry = root;
export const indexPath = resolve(root, 'registry.json');

// A tool's version: a hash of its folder's paths and bytes. reviewed.json names it, and the pull request check
// prints it so the team can record a review before merging (MAINTAINING.md).
export function folderVersion(files) {
  const hash = createHash('sha256');
  for (const f of files) hash.update(f.path + '\0').update(f.buffer || '');
  return hash.digest('hex').slice(0, 12);
}

export async function readTools(registryDir = defaultRegistry) {
  const toolsDir = resolve(registryDir, 'tools');
  const tools = [];
  // With every tool removed, git keeps no tools/ folder: that is an empty registry, not a failed build.
  const entries = await readdir(toolsDir, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  for (const entry of entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name))) {
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
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(source.repo) || !/^[0-9a-f]{40}$/.test(source.commit)) throw new Error('Invalid index source');
  const tools = await readTools(registryDir);
  const failed = tools.filter(t => t.problems.length);
  if (failed.length) throw new Error('Registry check failed: ' + failed.map(t => `${t.slug}: ${t.problems.join('; ')}`).join(' | '));
  const reviewed = await readReviewed(registryDir);
  const entries = [];
  for (const t of tools) {
    const m = t.parsed.meta, s = t.parsed.sections;
    const maintainers = m.maintainers.split(',').map(v => v.trim()).filter(Boolean), repo = m.source ? githubRepo(m.source) : null;
    // Every key is required except for a skill, whose missing values are derived here (FORMAT.md, Skills).
    const data = {
      title: m.title || '', summary: m.summary || '', type: m.type, mode: m.mode || 'ai', device: m.device || 'any', locale: m.language || 'en', license: m.license,
      maintainers, author: m.author || repo?.owner || maintainers[0], cost: m.cost || '', support: m.support || '',
      tags: m.tags || '', origin: m.origin || '', liveUrl: m.live || '', art: m.art || '',
      sourceUrl: m.source || '', sourcePath: m.source_path || '', sourceRef: m.source_commit || '',
      example: s.example || '', requirements: s.requirements || '', steps: s.steps || '', rebuild: s.rebuild || '', limits: s.limits || '',
    };
    // A skill is the root SKILL.md of this folder, otherwise the one at the root of source_path (read by inspect below).
    const localSkill = data.type === 'skill' ? t.files.find(f => f.path === 'SKILL.md') : null;
    const skillPath = [...data.sourcePath.split('/').filter(Boolean), 'SKILL.md'].join('/');
    let skillText = localSkill ? localSkill.text : null;
    const keepSkill = (path, text) => { if (data.type === 'skill' && !localSkill && path === skillPath) skillText = text; };
    // Static text checks over every text file in the folder; an external source is fetched at its pinned commit.
    const scan = data.sourceUrl ? await inspect({ ...data, body: data.rebuild }, fetchImpl, { onFile: keepSkill, evidence: localSkill ? '' : data.type }) : { version: RULES_VERSION, status: 'clear', files: [], bytes: 0, findings: [] };
    if (data.type === 'skill') {
      // A local SKILL.md already passed the check. An external one that is missing or broken holds the tool, never the build.
      const checked = skillText == null ? null : checkSkill(skillText), valid = checked && !checked.problems.length;
      if (!localSkill && !scan.sourceError && !valid) Object.assign(scan, { sourceError: true, sourceProblem: checked ? checked.problems.join('; ') : 'no SKILL.md at the root of source_path' });
      const meta = valid ? checked.skill.meta : {}, body = valid ? checked.skill.body : '', instructions = clip(body, INSTRUCTIONS_LIMIT);
      data.title ||= oneLine(firstHeading(body) || meta.name || t.slug, 100);
      data.summary ||= oneLine(meta.description || '', 240) || data.title;
      data.skill = {
        name: meta.name || '', description: meta.description || '', instructions, truncated: instructions.length < body.length,
        install: localSkill ? treeURL(`https://github.com/${source.repo}`, source.commit, `tools/${t.slug}`) : repo ? treeURL(repo.url, data.sourceRef, data.sourcePath) : '',
      };
    }
    {
      for (const f of t.files.filter(f => f.text != null)) { scan.files.push(f.path); scan.bytes += f.bytes; scan.findings.push(...scanText(f.text)); }
      scan.findings = [...new Set(scan.findings)];
      scan.status = scan.findings.length || scan.sourceError ? 'held' : scan.partial ? 'partial' : 'clear';
    }
    delete scan.at; // keep the index deterministic; the version hash identifies what was checked
    const version = folderVersion(t.files);
    // A held tool is listed only when the Disposable team accepted exactly these findings for exactly this content.
    // Any change to the folder changes the version and voids the review.
    const review = reviewed[t.slug];
    if (scan.status === 'held' && !scan.sourceError && review?.version === version && scan.findings.every(f => review.findings.includes(f)))
      Object.assign(scan, { status: 'reviewed', reviewedReason: review.reason, reviewer: review.reviewer });
    entries.push({ slug: t.slug, version, added: m.added, files: t.files.map(f => ({ path: f.path, bytes: f.bytes })), data, scan });
  }
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
    const index = await build(registryDir);
    await writeFile(indexPath, serialize(index));
    for (const t of index.tools.filter(t => t.scan.sourceError)) console.warn(`held: ${t.slug}: ${t.scan.sourceProblem}`);
    console.log(`Wrote ${relative(root, indexPath)}.`);
  } else {
    console.error('Usage: node .github/scripts/build-index.mjs check|build [registryDir]');
    process.exit(2);
  }
}
