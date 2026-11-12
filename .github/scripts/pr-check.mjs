#!/usr/bin/env node
// Pull request check for the Disposable registry.
//   node pr-check.mjs --base <base checkout> --head <pull request checkout> --author <login>
// Runs from the BASE branch checkout, so a pull request cannot change the rules that judge it.
// It only reads files from the pull request; nothing from the pull request is executed.
import { readdir, readFile, appendFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { checkFolder, parseDisposable } from '../../skills/disposable/scripts/check.mjs';

async function listFiles(root, dir = root) {
  const out = new Map();
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) for (const [k, v] of await listFiles(root, full)) out.set(k, v);
    else out.set(relative(root, full).split('\\').join('/'), entry.isSymbolicLink() ? 'symlink' : (await readFile(full)).toString('base64'));
  }
  return out;
}

async function meta(root, slug) {
  try { return parseDisposable(await readFile(join(root, 'tools', slug, 'DISPOSABLE.md'), 'utf8')).meta || null; } catch { return null; }
}
const logins = value => (value || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);

export async function prCheck({ base, head, author }) {
  const team = (await readFile(join(base, '.github', 'team.txt'), 'utf8').catch(() => '')).split('\n').map(v => v.replace(/#.*/, '').trim().toLowerCase()).filter(Boolean);
  const who = (author || '').toLowerCase(), isTeam = team.includes(who);
  const [before, after] = await Promise.all([listFiles(base), listFiles(head)]);
  const changed = [...new Set([...before.keys(), ...after.keys()])].filter(p => before.get(p) !== after.get(p)).sort();
  const problems = [], notes = [];
  const outside = changed.filter(p => !p.startsWith('tools/'));
  if (outside.length && !isTeam) problems.push(`Only the Disposable team changes files outside tools/: ${outside.join(', ')}`);
  const slugs = [...new Set(changed.filter(p => p.startsWith('tools/')).map(p => p.split('/')[1]))];
  // Hidden files would merge unseen: the format check, scan and index all skip them. Reject them here.
  for (const slug of slugs) {
    const hidden = [...after.keys()].filter(p => p.startsWith(`tools/${slug}/`) && p.split('/').slice(1).some(part => part.startsWith('.'))).map(p => p.slice(`tools/${slug}/`.length));
    if (hidden.length) problems.push(`tools/${slug}: hidden files are not accepted: ${hidden.join(', ')}. Remove them, or rename them or their folder without the leading dot`);
  }
  if (!slugs.length && !outside.length) notes.push('No changes found.');
  for (const slug of slugs) {
    const old = await meta(base, slug), next = await meta(head, slug);
    const removed = ![...after.keys()].some(p => p.startsWith(`tools/${slug}/`));
    if (old) {
      if (!isTeam && !logins(old.maintainers).includes(who)) problems.push(`tools/${slug}: @${author} is not in its maintainers (${old.maintainers}); a maintainer or the Disposable team must approve this change`);
      if (!removed && next && next.added !== old.added) problems.push(`tools/${slug}: keep added as ${old.added}`);
    } else if (!removed && !isTeam && !logins(next?.maintainers).includes(who)) {
      problems.push(`tools/${slug}: add your GitHub login (${author}) to maintainers`);
    }
    if (removed) { notes.push(`tools/${slug} is removed. It stays in git history.`); continue; }
    const result = await checkFolder(join(head, 'tools', slug));
    for (const p of result.problems) problems.push(`tools/${slug}: ${p}`);
    for (const f of result.findings) notes.push(`tools/${slug}: risk signal ${f}. After merge the tool stays off the site until the team records a review in reviewed.json.`);
  }
  if (slugs.length > 1) notes.push('This pull request changes more than one tool; one tool per pull request is easier to review.');
  return { changed, slugs, problems, notes, isTeam };
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const arg = name => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : ''; };
  const result = await prCheck({ base: resolve(arg('base')), head: resolve(arg('head')), author: arg('author') });
  const lines = [
    `## Disposable check`, '',
    result.problems.length ? `**${result.problems.length} problem(s) to fix**` : '**No problems found.**', '',
    ...result.problems.map(p => `- ${p}`),
    ...(result.notes.length ? ['', '**Notes**', ...result.notes.map(n => `- ${n}`)] : []),
    '', 'Checks are limited static text checks. Passing is not a safety guarantee.',
  ];
  console.log(lines.join('\n'));
  for (const p of result.problems) console.log(`::error::${p.replace(/[\r\n]/g, ' ')}`);
  for (const n of result.notes.filter(n => n.includes('risk signal'))) console.log(`::warning::${n.replace(/[\r\n]/g, ' ')}`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  process.exit(result.problems.length ? 1 : 0);
}
