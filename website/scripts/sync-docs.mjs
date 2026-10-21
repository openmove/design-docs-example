// Builds Starlight pages from ../docs without editing the source files.
// Starlight needs a `title` in front matter; arc42 and MADR use a `#` heading,
// and MADR keeps status and decision-makers in front matter that Starlight
// would otherwise hide.

import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { base, repoUrl } from '../site.config.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const docsDir = path.join(root, 'docs');
const outDir = path.resolve(import.meta.dirname, '..', 'src', 'content', 'docs');

const posix = path.posix;

async function walk(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walk(path.join(dir, entry.name), rel)));
    else files.push(rel);
  }
  return files;
}

function outPath(rel) {
  if (!rel.endsWith('.md')) return rel;
  const dir = posix.dirname(rel);
  const name = posix.basename(rel);
  const file = name === 'README.md' ? 'index.md' : name.toLowerCase();
  return dir === '.' ? file : `${dir.toLowerCase()}/${file}`;
}

function slugOf(rel) {
  const out = outPath(rel).replace(/\.md$/, '');
  if (out === 'index') return '';
  return out.replace(/\/index$/, '');
}

function pageUrl(slug) {
  return slug ? `${base}/${slug}/` : `${base}/`;
}

function splitFrontmatter(text) {
  if (!text.startsWith('---\n')) return { frontmatter: null, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: null, body: text };
  return { frontmatter: text.slice(4, end), body: text.slice(end + 5) };
}

function metadataTable(frontmatter) {
  const rows = frontmatter
    .split('\n')
    .filter((line) => /^[a-z][a-z-]*:/.test(line))
    .map((line) => {
      const colon = line.indexOf(':');
      const value = line.slice(colon + 1).trim().replace(/^"(.*)"$/, '$1');
      return `| **${line.slice(0, colon)}** | ${value.replaceAll('|', '\\|')} |`;
    });
  if (rows.length === 0) return '';
  return ['| Field | Value |', '|-------|-------|', ...rows, '', ''].join('\n');
}

function mapLines(body, fn) {
  let inFence = false;
  return body
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      return inFence ? line : fn(line);
    })
    .join('\n');
}

function rewriteTarget(target, fromRel, files) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) return target;
  const hashAt = target.indexOf('#');
  const target_path = hashAt === -1 ? target : target.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : target.slice(hashAt);
  const fromDir = posix.dirname(fromRel);
  let resolved = posix.normalize(posix.join(fromDir, target_path));

  if (resolved.startsWith('..')) {
    const repoPath = posix.normalize(posix.join('docs', fromDir, target_path));
    return `${repoUrl}/blob/main/${repoPath}${hash}`;
  }
  if (target_path.endsWith('/')) resolved = posix.join(resolved, 'README.md');
  if (resolved.endsWith('.md') && files.has(resolved)) return pageUrl(slugOf(resolved)) + hash;
  return target;
}

function titleFromName(rel) {
  const name = posix.basename(rel, '.md').replace(/[-_]+/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function extractTitle(body, rel) {
  let title = null;
  let inFence = false;
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) inFence = !inFence;
    const match = !inFence && lines[i].match(/^#\s+(.*)$|^#\s*$/);
    if (match) {
      title = (match[1] ?? '').trim();
      lines.splice(i, 1);
      break;
    }
  }
  return { title: title || titleFromName(rel), body: lines.join('\n') };
}

function sidebarFor(rel, title) {
  const name = posix.basename(rel);
  const section = posix.dirname(rel);
  if (section !== 'adr' && section !== 'rfc') return null;
  if (name === 'README.md') return { label: 'Overview', order: 0 };
  if (name.includes('template')) {
    const minimal = name.includes('minimal');
    return { label: minimal ? 'Template (minimal)' : 'Template', order: minimal ? 100001 : 100000 };
  }
  const number = name.match(/^(\d{4})-/);
  if (number) return { label: `${number[1]} · ${title}`, order: Number(number[1]) + 1 };
  return { label: title, order: 99999 };
}

function frontmatterFor(title, rel) {
  const lines = ['---', `title: ${JSON.stringify(title)}`];
  lines.push(`editUrl: ${JSON.stringify(`${repoUrl}/edit/main/docs/${rel}`)}`);
  const sidebar = sidebarFor(rel, title);
  if (sidebar) {
    lines.push('sidebar:', `  label: ${JSON.stringify(sidebar.label)}`, `  order: ${sidebar.order}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

async function convert(rel, files) {
  const text = await readFile(path.join(docsDir, rel), 'utf8');
  const { frontmatter, body: rawBody } = splitFrontmatter(text);
  const body = mapLines(rawBody, (line) =>
    line.replace(/\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (_, target, label = '') =>
      `](${rewriteTarget(target, rel, files)}${label})`,
    ),
  );

  if (frontmatter && /^title:/m.test(frontmatter)) {
    return `---\n${frontmatter}\n---\n${body}`;
  }

  const { title, body: withoutTitle } = extractTitle(body, rel);
  const metadata = frontmatter ? metadataTable(frontmatter) : '';
  return frontmatterFor(title, rel) + metadata + withoutTitle.replace(/^\n+/, '');
}

const all = await walk(docsDir);
const files = new Set(all.filter((rel) => rel.endsWith('.md')));

await rm(outDir, { recursive: true, force: true });
for (const rel of all) {
  const target = path.join(outDir, outPath(rel));
  await mkdir(path.dirname(target), { recursive: true });
  if (rel.endsWith('.md')) await writeFile(target, await convert(rel, files));
  else await copyFile(path.join(docsDir, rel), target);
}

console.log(`Synced ${files.size} pages from docs/ into ${path.relative(root, outDir)}/`);
