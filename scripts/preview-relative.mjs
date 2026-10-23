#!/usr/bin/env node
/*
  preview-relative: copies a static build and makes its internal URLs
  relative, so the site works where "/" is not its root: opened from file://,
  or published as a multi-file preview under a path prefix.

    node scripts/preview-relative.mjs <dist> <out> [--keep-module-scripts]

  What changes in the copy (the build itself is never modified):
  - Root-relative URLs ("/x") become relative to each file ("../x" from a page
    one folder deep): in HTML (href, src, srcset, imagesrcset, poster, action,
    formaction, object data, xlink:href, meta refresh, url() in style
    attributes and <style> blocks) and in CSS files (url(), @import).
  - Links to a directory name its file: "/projects/" becomes
    ".../projects/index.html" and "/#work" becomes ".../index.html#work".
    Queries and fragments are kept.
  - Absolute URLs (canonical, og:url, og:image, external links) stay as they are.
  - Module scripts with no imports are inlined, because browsers refuse to load
    <script type="module" src> from file:// (CORS). With --keep-module-scripts
    they stay as files, which still works over http.
  - Font preloads are removed: their crossorigin request fails from file://,
    and the fonts load from the CSS anyway.

  <out> must not exist, be empty, or be an earlier output of this script, which
  is then replaced. It can never be <dist>, a folder inside it, or above it.
*/

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { classifyUrl, cssUrls, listFiles, parseSrcset, resolveFile, tokenizeHtml, urlPathOf } from './check-site.mjs';

const posix = path.posix;
const MARKER = '.preview-relative';
const URL_ATTRS = new Set(['href', 'src', 'poster', 'action', 'formaction', 'xlink:href']);
const SRCSET_ATTRS = new Set(['srcset', 'imagesrcset']);

function fail(message) {
  console.error(`preview-relative: ${message}`);
  process.exit(1);
}

/* -- Paths ---------------------------------------------------------------- */

const isInside = (child, parent) => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

function prepareOutput(dist, out) {
  if (isInside(out, dist)) fail(`<out> (${out}) must not be the build or a folder inside it.`);
  if (isInside(dist, out)) fail(`<out> (${out}) must not contain the build.`);
  if (existsSync(out)) {
    if (!statSync(out).isDirectory()) fail(`${out} exists and is not a folder.`);
    const entries = readdirSync(out);
    if (entries.length > 0 && !entries.includes(MARKER)) {
      fail(`${out} is not empty and was not made by this script. Choose another folder or empty it.`);
    }
    rmSync(out, { recursive: true, force: true });
  }
  mkdirSync(path.dirname(out), { recursive: true });
  cpSync(dist, out, { recursive: true });
  writeFileSync(path.join(out, MARKER), 'Made by scripts/preview-relative.mjs. Safe to delete.\n');
}

/* -- URLs ----------------------------------------------------------------- */

class Rewriter {
  constructor(out, keepModules) {
    this.out = out;
    this.keepModules = keepModules;
    this.files = new Set(listFiles(out));
    this.stats = { html: 0, css: 0, urls: 0, inlined: 0, preloads: 0 };
    this.warnings = [];
  }

  /** The file a relative or root-relative URL points to, seen from `fromFile`. */
  target(value, fromFile) {
    const v = value.trim();
    const cut = v.search(/[?#]/);
    const pathPart = cut === -1 ? v : v.slice(0, cut);
    if (pathPart === '') return null; // "?q" or "#x": the document itself
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(pathPart, new URL(urlPathOf(fromFile), 'https://preview.invalid')).pathname);
    } catch {
      return null;
    }
    const found = resolveFile(this.files, urlPath);
    if (found) return { file: found.file, suffix: cut === -1 ? '' : v.slice(cut) };
    this.warnings.push(`${fromFile}: ${v} does not resolve to a file in the build; made relative as is`);
    const file = urlPath.replace(/^\/+/, '');
    return { file: file === '' || file.endsWith('/') ? `${file}index.html` : file, suffix: cut === -1 ? '' : v.slice(cut) };
  }

  /** New value for an internal URL, or null to leave it unchanged. */
  relativize(value, fromFile) {
    const kind = classifyUrl(value).type;
    if (kind !== 'root' && kind !== 'relative') return null;
    const t = this.target(value, fromFile);
    if (!t) return null;
    const rel = posix
      .relative(posix.dirname(`/${fromFile}`), `/${t.file}`)
      .split('/')
      .map((seg) => (seg === '..' ? seg : encodeURIComponent(seg)))
      .join('/');
    const result = rel + t.suffix;
    if (result === value.trim()) return null;
    this.stats.urls++;
    return result;
  }

  /** Applies `map` to every URL found by `finder` in text; finder gives offsets. */
  mapUrls(text, finder, fromFile) {
    let result = '';
    let last = 0;
    for (const { url, start, end } of finder(text)) {
      const next = this.relativize(url, fromFile);
      if (next === null) continue;
      result += text.slice(last, start) + next;
      last = end;
    }
    return result + text.slice(last);
  }

  /* -- HTML --------------------------------------------------------------- */

  rewriteHtml(file) {
    const abs = path.join(this.out, file);
    const src = readFileSync(abs, 'utf8');
    const tokens = tokenizeHtml(src);
    const edits = [];
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok.type === 'text' && tok.rawText && tok.parent === 'style') {
        const css = this.mapUrls(tok.raw, cssUrls, file);
        if (css !== tok.raw) edits.push({ start: tok.start, end: tok.end, text: css });
        continue;
      }
      if (tok.type !== 'start') continue;
      const attr = (name) => tok.attrs.find((a) => a.name === name)?.value;

      if (tok.name === 'link' && /(^|\s)preload(\s|$)/i.test(attr('rel') ?? '') && (attr('as') ?? '').toLowerCase() === 'font') {
        edits.push({ start: tok.start, end: tok.end, text: '' });
        this.stats.preloads++;
        continue;
      }
      if (tok.name === 'script' && !this.keepModules && (attr('type') ?? '').trim().toLowerCase() === 'module' && attr('src')) {
        const inline = this.inlineModule(tokens, i, file);
        if (inline) {
          edits.push(inline);
          i += 2; // the empty script body and </script>
          continue;
        }
      }

      const isRefresh = tok.name === 'meta' && (attr('http-equiv') ?? '').toLowerCase() === 'refresh';
      for (const a of tok.attrs) {
        if (a.valueStart < 0) continue;
        let next = null;
        if (URL_ATTRS.has(a.name) || (a.name === 'data' && tok.name === 'object')) {
          next = this.relativize(a.value, file);
        } else if (SRCSET_ATTRS.has(a.name)) {
          next = this.mapUrls(a.value, parseSrcset, file);
        } else if (a.name === 'style') {
          next = this.mapUrls(a.value, cssUrls, file);
        } else if (a.name === 'content' && isRefresh) {
          next = a.value.replace(/(url\s*=\s*['"]?)([^'"]+)/i, (_, lead, url) => lead + (this.relativize(url, file) ?? url));
        }
        if (next === null || next === a.value) continue;
        const encoded = next.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        if (a.quote === '"') edits.push({ start: a.valueStart, end: a.valueEnd, text: encoded });
        else if (a.quote === "'") edits.push({ start: a.valueStart, end: a.valueEnd, text: encoded.replace(/'/g, '&#39;') });
        else edits.push({ start: a.valueStart, end: a.valueEnd, text: `"${encoded}"` });
      }
    }
    if (edits.length === 0) return;
    edits.sort((a, b) => b.start - a.start);
    let html = src;
    for (const e of edits) html = html.slice(0, e.start) + e.text + html.slice(e.end);
    writeFileSync(abs, html);
    this.stats.html++;
  }

  /** Replaces <script type="module" src="..."></script> with an inline module, if it is self-contained. */
  inlineModule(tokens, i, file) {
    const open = tokens[i];
    const body = tokens[i + 1];
    const close = tokens[i + 2];
    if (body?.type !== 'text' || body.raw.trim() !== '' || close?.type !== 'end' || close.name !== 'script') return null;
    const src = open.attrs.find((a) => a.name === 'src').value;
    const kind = classifyUrl(src).type;
    if (kind !== 'root' && kind !== 'relative') return null;
    const t = this.target(src, file);
    if (!t || !this.files.has(t.file)) return null;
    const code = readFileSync(path.join(this.out, t.file), 'utf8');
    if (/\bimport\s*[\s{*"'(]|\bimport\.meta\b/.test(code)) {
      this.warnings.push(`${file}: ${src} imports other modules; kept as a file (it runs over http, not from file://)`);
      return null;
    }
    const attrs = open.attrs
      .filter((a) => !['src', 'integrity', 'crossorigin'].includes(a.name))
      .map((a) => (a.valueStart < 0 ? a.name : `${a.name}="${a.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`))
      .join(' ');
    const safe = code.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
    this.stats.inlined++;
    return { start: open.start, end: close.end, text: `<script ${attrs}>${safe}</script>` };
  }

  /* -- CSS and leftovers ---------------------------------------------------- */

  rewriteCss(file) {
    const abs = path.join(this.out, file);
    const css = readFileSync(abs, 'utf8');
    const next = this.mapUrls(css, cssUrls, file);
    if (next === css) return;
    writeFileSync(abs, next);
    this.stats.css++;
  }

  /** Root-relative URLs that are still there after the rewrite. */
  leftovers() {
    const found = [];
    for (const file of this.files) {
      if (/\.html$/i.test(file)) {
        for (const tok of tokenizeHtml(readFileSync(path.join(this.out, file), 'utf8'))) {
          const urls = [];
          if (tok.type === 'text' && tok.rawText && tok.parent === 'style') urls.push(...cssUrls(tok.raw).map((u) => u.url));
          if (tok.type === 'start') {
            for (const a of tok.attrs) {
              if (SRCSET_ATTRS.has(a.name)) urls.push(...parseSrcset(a.value).map((c) => c.url));
              else if (a.name === 'style') urls.push(...cssUrls(a.value).map((u) => u.url));
              else if (URL_ATTRS.has(a.name)) urls.push(a.value);
            }
          }
          for (const u of urls) if (classifyUrl(u).type === 'root') found.push(`${file}: ${u}`);
        }
      } else if (/\.css$/i.test(file)) {
        for (const u of cssUrls(readFileSync(path.join(this.out, file), 'utf8'))) {
          if (classifyUrl(u.url).type === 'root') found.push(`${file}: ${u.url}`);
        }
      } else if (/\.m?js$/i.test(file)) {
        const js = readFileSync(path.join(this.out, file), 'utf8');
        const m = js.match(/["'`]\/_astro\/[^"'`]+/g);
        if (m) this.warnings.push(`${file}: ${m.length} root-relative /_astro/ string(s) in JavaScript, not rewritten`);
      }
    }
    return found;
  }
}

/* -- CLI ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith('--'));
if (argv.includes('--help') || argv.includes('-h') || positional.length !== 2) {
  console.log('Usage: node scripts/preview-relative.mjs <dist> <out> [--keep-module-scripts]');
  process.exit(positional.length === 2 ? 0 : 1);
}
const dist = path.resolve(positional[0]);
const out = path.resolve(positional[1]);
if (!existsSync(dist) || !statSync(dist).isDirectory()) fail(`${positional[0]} is not a folder. Build the site first (npm run build).`);
if (!existsSync(path.join(dist, 'index.html'))) fail(`${positional[0]} has no index.html; is it a build?`);

prepareOutput(dist, out);
const rewriter = new Rewriter(out, argv.includes('--keep-module-scripts'));
for (const file of rewriter.files) {
  if (/\.html$/i.test(file)) rewriter.rewriteHtml(file);
  else if (/\.css$/i.test(file)) rewriter.rewriteCss(file);
}
const left = rewriter.leftovers();
const s = rewriter.stats;

console.log(`preview-relative: ${positional[0]} to ${positional[1]}`);
console.log(`  ${s.urls} URLs made relative in ${s.html} HTML and ${s.css} CSS files`);
console.log(`  ${s.inlined} module scripts inlined, ${s.preloads} font preloads removed`);
for (const w of rewriter.warnings) console.log(`  warning: ${w}`);
for (const l of left) console.log(`  still root-relative: ${l}`);
console.log(`  Open ${path.join(positional[1], 'index.html')} in a browser, or publish the folder as is.`);
if (left.length > 0) process.exitCode = 1;
