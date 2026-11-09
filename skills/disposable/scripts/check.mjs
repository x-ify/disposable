#!/usr/bin/env node
// Disposable format and risk-signal checker. Zero dependencies, Node 18+.
//   node check.mjs tool <tools/slug folder>   exit 0 when the folder follows the format, 1 with a problem list
//   node check.mjs scan <file>                list risk signals in a downloaded tool (always exit 0; signals are for a person to read)
// This file is the single source of the format rules: the Disposable repository's pull request check imports it.
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TYPES = ['program', 'recipe', 'skill'];
export const MODES = ['browser', 'local', 'ai', 'source'];
export const DEVICES = ['any', 'windows', 'mac', 'linux', 'mobile'];
export const LANGUAGES = ['en', 'ko', 'zh-Hans', 'zh-Hant', 'ja'];
// Disposable redistributes merged content, so only open licenses are accepted.
export const LICENSES = ['CC0-1.0', 'CC-BY-4.0', 'MIT', 'Apache-2.0'];
export const ARTS = ['files', 'table', 'draw', 'notes', 'timer', 'text'];
// Small, reviewable folders: 100 files / 1 MiB keeps a pull request readable; 3 images of 1 MiB cover screenshots.
export const LIMITS = { files: 100, bytes: 1024 * 1024, images: 3, imageBytes: 1024 * 1024 };
const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp']);
// Executables, libraries and archives cannot be reviewed as text; SVG can carry script.
const BLOCKED = new Set(['.exe', '.dll', '.so', '.dylib', '.bin', '.com', '.msi', '.dmg', '.pkg', '.app', '.apk', '.ipa', '.jar', '.class', '.zip', '.tar', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar', '.iso', '.svg', '.wasm']);
export const SECTIONS = { 'Result': 'example', 'Before you start': 'requirements', 'Quick start': 'steps', 'Rebuild': 'rebuild', 'Limits': 'limits' };
const FIELDS = ['title', 'summary', 'type', 'mode', 'device', 'language', 'license', 'maintainers', 'author', 'added', 'cost', 'support', 'tags', 'origin', 'live', 'source', 'source_path', 'source_commit', 'art'];
const REQUIRED = ['title', 'summary', 'type', 'mode', 'device', 'language', 'license', 'maintainers', 'author', 'added', 'cost', 'support'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/; // GitHub login rules

// Risk signals: reasons for a person to look closer, never proof of harm or safety.
// Bump RULES_VERSION whenever RULES change so every stored result says which rules produced it.
export const RULES_VERSION = 'text-patterns-2';
export const RULES = [
  ['credential', /(?:gh[pousr]_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{40,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk-(?:proj-)?[a-zA-Z0-9_-]{24,})/],
  ['destructive-command', /\brm\s+(?:-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*)\s|\b(?:format\s+[a-z]:|mkfs\b|diskpart\b|Remove-Item\b[^\n]*-Recurse[^\n]*-Force)/i],
  ['remote-execution', /(?:curl|wget)\b[^\n]{0,500}\|\s*(?:sudo\s+)?(?:ba)?sh\b|\b(?:iex|Invoke-Expression)\s*[($]/i],
  ['privilege-or-transfer', /\bsudo\b|\bchmod\s+777\b|(?:curl|wget)\b[^\n]{0,300}(?:--data|-d\s|--upload-file)|\bInvoke-WebRequest\b/i],
  // Private key files and credential stores. Legitimate SSH or credential tools can be cleared by review (registry/reviewed.json).
  ['secret-access', /\bid_(?:rsa|ed25519|ecdsa|dsa)\b|\.aws\/credentials|\.netrc\b|\bLogin Data\b|\bcookies\.sqlite\b|\bsecurity\s+find-(?:generic|internet)-password\b/i],
  // Instructions aimed at the reader's agent rather than at the task (English, Korean, Japanese, Chinese).
  ['instruction-override', /\b(?:ignore|disregard|forget)\s+(?:(?:all|any|the|your)\s+)*(?:previous|prior|above|earlier|system)\s+(?:instructions|rules|messages|prompts?)\b|이전\s*(?:의\s*)?(?:지시|지침|명령)\S*\s*무시|(?:以前|これまで)の指示を無視|(?:忽略|无视|無視)(?:之前|先前|以上|上面)的?(?:指令|指示|说明|說明)/i],
  ['hidden-from-person', /\b(?:do not|don't|never)\s+(?:tell|inform)\s+the\s+(?:user|person|human)\b|\b(?:do not|don't|never)\s+mention\s+(?:it|this|that)\s+to\s+the\s+(?:user|person|human)\b|\bkeep\s+(?:it|this|that)\s+(?:secret|hidden)\s+from\s+the\s+(?:user|person|human)\b|사용자(?:에게|한테)\s*(?:알리지|말하지)\s*(?:마|말)|ユーザーに(?:伝え|知らせ)ないで|不要(?:告诉|告訴)(?:用户|用戶)/i],
];
export const scanText = text => RULES.filter(([, pattern]) => pattern.test(text)).map(([code]) => code);

export function safeURL(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hostname === 'localhost' || !u.hostname.includes('.') || /^[\d.]+$/.test(u.hostname) || u.hostname.includes(':')) return '';
    return u.href;
  } catch { return ''; }
}
export function githubRepo(value) {
  try {
    const u = new URL(value);
    const m = u.pathname.replace(/\.git$/, '').replace(/\/$/, '').match(/^\/([\w-]+)\/([\w.-]+)$/);
    if (u.protocol !== 'https:' || u.hostname !== 'github.com' || u.username || u.password || u.port || u.search || u.hash || !m || m[2] === '.' || m[2] === '..') return null;
    return { owner: m[1], repo: m[2], url: `https://github.com/${m[1]}/${m[2]}` };
  } catch { return null; }
}

export function parseDisposable(text) {
  const problems = [];
  const match = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { problems: ['DISPOSABLE.md must start with front matter between --- lines'] };
  const meta = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const pair = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!pair) { problems.push(`front matter line is not "key: value": ${line.slice(0, 60)}`); continue; }
    const [, key, value] = pair;
    if (!FIELDS.includes(key)) problems.push(`unknown front matter key: ${key}`);
    else if (key in meta) problems.push(`duplicate front matter key: ${key}`);
    else meta[key] = value.trim();
  }
  const sections = {};
  const parts = ('\n' + match[2]).split(/\n## /);
  if (parts[0].trim()) problems.push('text before the first ## section');
  for (const part of parts.slice(1)) {
    const [heading, ...rest] = part.split('\n');
    const key = SECTIONS[heading.trim()];
    if (!key) { problems.push(`unknown section: ## ${heading.trim()}`); continue; }
    if (key in sections) problems.push(`duplicate section: ## ${heading.trim()}`);
    sections[key] = rest.join('\n').trim();
  }
  return { meta, sections, problems };
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// files: [{ path, bytes, text (string or null), symlink? }]
export function validateTool(slug, parsed, files, today = new Date().toISOString().slice(0, 10)) {
  const problems = [...parsed.problems];
  const m = parsed.meta || {}, s = parsed.sections || {};
  if (!SLUG.test(slug) || slug.length > 60) problems.push('folder name must be lowercase letters, digits and single hyphens (60 characters max)');
  for (const key of REQUIRED) if (!m[key]) problems.push(`missing front matter: ${key}`);
  for (const [heading, key] of Object.entries(SECTIONS)) if (!s[key]) problems.push(`missing or empty section: ## ${heading}`);
  const long = { title: 100, summary: 240, author: 100, tags: 150, cost: 500, support: 500, source_path: 250 };
  for (const [key, max] of Object.entries(long)) if ((m[key] || '').length > max) problems.push(`${key} is longer than ${max} characters`);
  for (const key of Object.values(SECTIONS)) if ((s[key] || '').length > 12000) problems.push(`section ${key} is longer than 12000 characters`);
  if (m.type && !TYPES.includes(m.type)) problems.push(`type must be one of ${TYPES.join(', ')}`);
  if (m.mode && !MODES.includes(m.mode)) problems.push(`mode must be one of ${MODES.join(', ')}`);
  if (m.device && !DEVICES.includes(m.device)) problems.push(`device must be one of ${DEVICES.join(', ')}`);
  if (m.language && !LANGUAGES.includes(m.language)) problems.push(`language must be one of ${LANGUAGES.join(', ')}`);
  if (m.license && !LICENSES.includes(m.license)) problems.push(`license must be one of ${LICENSES.join(', ')}`);
  if (m.art && !ARTS.includes(m.art)) problems.push(`art must be one of ${ARTS.join(', ')}`);
  if (m.added && !validDate(m.added)) problems.push('added must be a real date as YYYY-MM-DD');
  if (m.added && validDate(m.added) && m.added > today) problems.push('added cannot be in the future');
  const maintainers = (m.maintainers || '').split(',').map(v => v.trim()).filter(Boolean);
  if (m.maintainers && (!maintainers.length || maintainers.length > 10 || maintainers.some(v => !LOGIN.test(v)))) problems.push('maintainers must be 1-10 GitHub logins separated by commas');
  for (const key of ['origin', 'live']) if (m[key] && !safeURL(m[key])) problems.push(`${key} must be a public https:// link`);
  if (m.source && !githubRepo(m.source)) problems.push('source must be https://github.com/owner/repo');
  if (m.source && !/^[0-9a-f]{40}$/.test(m.source_commit || '')) problems.push('source needs source_commit: the full 40-character commit SHA');
  if (!m.source && (m.source_path || m.source_commit)) problems.push('source_path and source_commit need source');
  if (m.source_path && (m.source_path.split('/').some(v => v === '..' || v === '.') || m.source_path.startsWith('/') || /[\\?#\x00-\x1f]/.test(m.source_path))) problems.push('source_path must be a plain relative folder');
  let bytes = 0, images = 0;
  for (const f of files) {
    bytes += f.bytes;
    const ext = extname(f.path).toLowerCase();
    if (f.symlink) problems.push(`symbolic links are not accepted: ${f.path}`);
    else if (BLOCKED.has(ext)) problems.push(`file type not accepted: ${f.path}`);
    else if (IMAGE.has(ext)) { images++; if (f.bytes > LIMITS.imageBytes) problems.push(`image over 1 MiB: ${f.path}`); }
    else if (f.text == null) problems.push(`not a UTF-8 text file: ${f.path}`);
  }
  if (files.length > LIMITS.files) problems.push(`more than ${LIMITS.files} files`);
  if (bytes > LIMITS.bytes) problems.push('folder is larger than 1 MiB');
  if (images > LIMITS.images) problems.push(`more than ${LIMITS.images} images`);
  const own = files.filter(f => f.path !== 'DISPOSABLE.md');
  if (m.type === 'skill' && !m.source && !own.some(f => f.path.split('/').at(-1) === 'SKILL.md')) problems.push('a skill needs SKILL.md in this folder or an external source');
  if (m.type === 'program' && !m.source && !own.some(f => f.text != null)) problems.push('a program needs source files in this folder or an external source');
  return problems;
}

export async function readFolder(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue; // .DS_Store and similar never ship
    const full = resolve(dir, entry.name);
    const path = relative(base, full).split('\\').join('/');
    if (entry.isSymbolicLink()) out.push({ path, bytes: 0, text: null, symlink: true });
    else if (entry.isDirectory()) out.push(...await readFolder(full, base));
    else if (entry.isFile()) {
      const buffer = await readFile(full);
      let text = null;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); if (text.includes('\0')) text = null; } catch { text = null; }
      out.push({ path, bytes: (await stat(full)).size, text, buffer });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export async function checkFolder(dir) {
  const files = await readFolder(dir);
  const doc = files.find(f => f.path === 'DISPOSABLE.md');
  const parsed = doc?.text != null ? parseDisposable(doc.text) : { problems: ['missing DISPOSABLE.md'] };
  const problems = validateTool(basename(resolve(dir)), parsed, files);
  const findings = [...new Set(files.filter(f => f.text != null).flatMap(f => scanText(f.text)))];
  return { files, parsed, problems, findings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, target] = process.argv.slice(2);
  if (command === 'tool' && target) {
    const { problems, findings } = await checkFolder(target);
    for (const p of problems) console.log(`problem: ${p}`);
    for (const f of findings) console.log(`risk signal: ${f} (the pull request will be held for review)`);
    if (problems.length || findings.length) process.exit(1);
    console.log('OK: the folder follows the Disposable format and no risk signal was found.');
  } else if (command === 'scan' && target) {
    const findings = scanText(await readFile(target, 'utf8'));
    console.log(findings.length ? findings.map(f => `risk signal: ${f}`).join('\n') : 'No risk signal found. This is not a safety guarantee; read the full text.');
  } else {
    console.error('Usage: node check.mjs tool <tools/slug folder> | scan <file>');
    process.exit(2);
  }
}
