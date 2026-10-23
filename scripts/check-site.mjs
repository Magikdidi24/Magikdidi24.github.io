#!/usr/bin/env node
/*
  check-site: quality gate for the static build. No dependencies, no network.

    node scripts/check-site.mjs [distDir] [--site=https://example.com]

  distDir defaults to "dist". The site origin comes from --site, else from the
  canonical links of the pages, else from robots.txt. The run exits with code 1
  when it finds an error. Warnings are printed and never fail the run.
  External links are listed, never fetched.

  Errors
    links   an internal URL (relative, root-relative or same-origin absolute) in
            href, src, srcset, poster, CSS url(), metadata or JSON-LD that does
            not resolve to a file (a directory resolves to its index.html); a
            #fragment with no matching id on the target page; a relative URL in
            404.html, which GitHub Pages serves at any depth
    meta    no lang on <html>; not exactly one h1; a title of 70 characters or
            more; a meta description outside 50 to 160 characters; invalid
            JSON-LD; an indexable page without a canonical link to itself
    images  an img without alt, width or height
    http    any http:// URL
    crawl   robots.txt missing or without a Sitemap line; a sitemap entry that
            does not resolve; a noindex page or 404.html listed in the sitemap

  Warnings: glued words, where a letter
  or punctuation meets a letter across an inline element boundary with no
  space ("Tokyo.<a>samuel@") or an {expression} is glued to text
  ("Tokyo.Samuel"): Astro drops those line breaks, write {' '}; duplicate ids;
  skipped heading levels; id references (aria-*, for) to missing ids;
  target="_blank"; missing Open Graph tags; duplicate titles or descriptions;
  indexable pages missing from the sitemap; directory links without a
  trailing slash.
*/

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------------ */
/* HTML tokenizer and URL helpers (also used by preview-relative.mjs)        */
/* ------------------------------------------------------------------------ */

const RAW_TEXT = new Set(['script', 'style']);
const RCDATA = new Set(['title', 'textarea']);
const END_TAG = /<\/([A-Za-z][^\s/>]*)[^>]*>/y;

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u{00a0}',
  ensp: '\u{2002}', emsp: '\u{2003}', thinsp: '\u{2009}', hairsp: '\u{200a}', zwnj: '\u{200c}', zwj: '\u{200d}', shy: '\u{00ad}',
  hyphen: '\u{2010}', dash: '\u{2010}', ndash: '\u{2013}', mdash: '\u{2014}', horbar: '\u{2015}', minus: '\u{2212}',
  lsquo: '\u{2018}', rsquo: '\u{2019}', sbquo: '\u{201a}', ldquo: '\u{201c}', rdquo: '\u{201d}', bdquo: '\u{201e}',
  laquo: '\u{00ab}', raquo: '\u{00bb}', lsaquo: '\u{2039}', rsaquo: '\u{203a}', hellip: '\u{2026}',
  middot: '\u{00b7}', centerdot: '\u{00b7}', bull: '\u{2022}', times: '\u{00d7}', divide: '\u{00f7}',
  deg: '\u{00b0}', plusmn: '\u{00b1}', micro: 'µ', para: '\u{00b6}', sect: '\u{00a7}',
  copy: '\u{00a9}', reg: '\u{00ae}', trade: '\u{2122}', cent: '\u{00a2}', pound: '\u{00a3}', euro: '\u{20ac}', yen: '\u{00a5}',
  larr: '\u{2190}', uarr: '\u{2191}', rarr: '\u{2192}', darr: '\u{2193}', harr: '\u{2194}', nearr: '\u{2197}',
  lArr: '\u{21d0}', rArr: '\u{21d2}', hArr: '\u{21d4}', leftarrow: '\u{2190}', LeftArrow: '\u{2190}',
  rightarrow: '\u{2192}', RightArrow: '\u{2192}', srarr: '\u{2192}', ShortRightArrow: '\u{2192}',
  aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä', aring: 'å', aelig: 'æ', ccedil: 'ç',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï',
  ntilde: 'ñ', oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', oslash: 'ø', oelig: 'œ',
  uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü', yacute: 'ý', yuml: 'ÿ', szlig: 'ß',
  Agrave: 'À', Acirc: 'Â', AElig: 'Æ', Ccedil: 'Ç', Eacute: 'É', Egrave: 'È', Ecirc: 'Ê',
  Icirc: 'Î', Ocirc: 'Ô', OElig: 'Œ', Ugrave: 'Ù', Ucirc: 'Û',
};

/** Decodes HTML character references (numeric and the common named ones). */
export function decodeEntities(text) {
  if (!text.includes('&')) return text;
  return text.replace(/&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([A-Za-z][A-Za-z0-9]*));?/g, (match, dec, hex, name) => {
    if (name !== undefined) {
      return match.endsWith(';') && Object.hasOwn(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : match;
    }
    const cp = dec !== undefined ? Number.parseInt(dec, 10) : Number.parseInt(hex, 16);
    if (!(cp > 0 && cp <= 0x10ffff) || (cp >= 0xd800 && cp <= 0xdfff)) return '\u{fffd}';
    return String.fromCodePoint(cp);
  });
}

function parseStartTag(src, lt) {
  const n = src.length;
  let i = lt + 1;
  while (i < n && !/[\s/>]/.test(src[i])) i++;
  const name = src.slice(lt + 1, i).toLowerCase();
  const attrs = [];
  while (i < n) {
    const ch = src[i];
    if (ch === '>') return { type: 'start', name, attrs, start: lt, end: i + 1, selfClosing: src[i - 1] === '/' };
    if (ch === '/' || /\s/.test(ch)) {
      i++;
      continue;
    }
    const nameStart = i++;
    while (i < n && !/[\s/>=]/.test(src[i])) i++;
    const attr = { name: src.slice(nameStart, i).toLowerCase(), value: '', raw: '', quote: '', valueStart: -1, valueEnd: -1 };
    let j = i;
    while (j < n && /\s/.test(src[j])) j++;
    if (src[j] === '=') {
      j++;
      while (j < n && /\s/.test(src[j])) j++;
      const q = src[j];
      if (q === '"' || q === "'") {
        const close = src.indexOf(q, j + 1);
        attr.quote = q;
        attr.valueStart = j + 1;
        attr.valueEnd = close === -1 ? n : close;
        i = close === -1 ? n : close + 1;
      } else {
        let k = j;
        while (k < n && !/[\s>]/.test(src[k])) k++;
        attr.valueStart = j;
        attr.valueEnd = k;
        i = k;
      }
      attr.raw = src.slice(attr.valueStart, attr.valueEnd);
      attr.value = decodeEntities(attr.raw);
    }
    attrs.push(attr);
  }
  return { type: 'start', name, attrs, start: lt, end: n, selfClosing: false };
}

/**
 * Splits HTML into start tags (with attribute offsets), end tags, text,
 * comments and doctypes. Script and style contents are single raw text
 * tokens; title and textarea contents are single text tokens.
 */
export function tokenizeHtml(src) {
  const tokens = [];
  const n = src.length;
  let i = 0;
  let textStart = 0;
  const flushText = (end) => {
    if (end > textStart) tokens.push({ type: 'text', start: textStart, end, raw: src.slice(textStart, end), parent: null, rawText: false });
  };
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt === -1) break;
    const next = src[lt + 1] ?? '';
    if (src.startsWith('<!--', lt)) {
      flushText(lt);
      const close = src.indexOf('-->', lt + 4);
      i = textStart = close === -1 ? n : close + 3;
      tokens.push({ type: 'comment', start: lt, end: i });
    } else if (next === '!' || next === '?') {
      flushText(lt);
      if (src.startsWith('<![CDATA[', lt)) {
        const close = src.indexOf(']]>', lt + 9);
        const end = close === -1 ? n : close;
        tokens.push({ type: 'text', start: lt + 9, end, raw: src.slice(lt + 9, end), parent: null, rawText: true });
        i = textStart = close === -1 ? n : close + 3;
      } else {
        const close = src.indexOf('>', lt);
        i = textStart = close === -1 ? n : close + 1;
        tokens.push({ type: 'doctype', start: lt, end: i });
      }
    } else if (next === '/') {
      END_TAG.lastIndex = lt;
      const m = END_TAG.exec(src);
      if (m) {
        flushText(lt);
        i = textStart = lt + m[0].length;
        tokens.push({ type: 'end', name: m[1].toLowerCase(), start: lt, end: i });
      } else {
        i = lt + 1;
      }
    } else if (/[A-Za-z]/.test(next)) {
      flushText(lt);
      const tag = parseStartTag(src, lt);
      tokens.push(tag);
      i = textStart = tag.end;
      if (RAW_TEXT.has(tag.name) || RCDATA.has(tag.name)) {
        const close = new RegExp(`</${tag.name}(?=[\\s/>])`, 'gi');
        close.lastIndex = i;
        const m = close.exec(src);
        const end = m ? m.index : n;
        tokens.push({ type: 'text', start: i, end, raw: src.slice(i, end), parent: tag.name, rawText: RAW_TEXT.has(tag.name) });
        i = textStart = end;
      }
    } else {
      i = lt + 1; // a literal "<" in text
    }
  }
  flushText(n);
  return tokens;
}

/** URL candidates of a srcset value, with offsets into the value. */
export function parseSrcset(value) {
  const out = [];
  const n = value.length;
  let i = 0;
  while (i < n) {
    while (i < n && /[\s,]/.test(value[i])) i++;
    if (i >= n) break;
    const start = i;
    while (i < n && !/\s/.test(value[i])) i++;
    let end = i;
    while (end > start && value[end - 1] === ',') end--;
    out.push({ url: value.slice(start, end), start, end });
    if (end === i) {
      // Skip the descriptors up to the next comma outside parentheses.
      let depth = 0;
      while (i < n) {
        const c = value[i++];
        if (c === '(') depth++;
        else if (c === ')') depth = Math.max(0, depth - 1);
        else if (c === ',' && depth === 0) break;
      }
    }
  }
  return out;
}

const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]*))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/gi;

/** URLs in CSS text (url() and @import "..."), with offsets into the text. */
export function cssUrls(css) {
  const out = [];
  for (const m of css.matchAll(CSS_URL)) {
    const url = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '';
    const start = m.index + m[0].indexOf(url, m[0].startsWith('@') ? 7 : 4);
    out.push({ url, start, end: start + url.length });
  }
  return out;
}

/**
 * root: "/x", relative: "x" or "../x", fragment: "#x", absolute: http(s) or
 * protocol-relative "//host", scheme: mailto, tel, data, javascript..., empty.
 */
export function classifyUrl(value) {
  const v = value.trim();
  if (v === '') return { type: 'empty' };
  if (v.startsWith('#')) return { type: 'fragment' };
  if (v.startsWith('//')) return { type: 'absolute', url: `https:${v}` };
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(v)?.[1].toLowerCase();
  if (scheme === 'http' || scheme === 'https') return { type: 'absolute', url: v };
  if (scheme) return { type: 'scheme', scheme };
  return { type: v.startsWith('/') ? 'root' : 'relative' };
}

/** Every file under dir, as a sorted list of POSIX paths relative to dir. */
export function listFiles(dir) {
  const out = [];
  const walk = (abs, rel) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(abs, entry.name), childRel);
      else if (entry.isFile()) out.push(childRel);
    }
  };
  walk(dir, '');
  return out.sort();
}

/**
 * Maps a decoded URL path to a file the way GitHub Pages serves it:
 * "/a/" is a/index.html; "/a" is the file a, else a/index.html (after a
 * redirect to "/a/"), else a.html.
 */
export function resolveFile(files, urlPath) {
  const rel = urlPath.replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) {
    const file = `${rel}index.html`;
    return files.has(file) ? { file, redirect: false } : null;
  }
  if (files.has(rel)) return { file: rel, redirect: false };
  if (files.has(`${rel}/index.html`)) return { file: `${rel}/index.html`, redirect: true };
  if (files.has(`${rel}.html`)) return { file: `${rel}.html`, redirect: false };
  return null;
}

/** The URL path a built file is served at: a/index.html is "/a/". */
export function urlPathOf(file) {
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
  return `/${file}`;
}

/* ------------------------------------------------------------------------ */
/* Text context for messages                                                */
/* ------------------------------------------------------------------------ */

function context(text, index, length) {
  const before = text.slice(Math.max(0, index - 32), index).replace(/\s+/g, ' ').trimStart();
  const after = text.slice(index + length, index + length + 32).replace(/\s+/g, ' ').trimEnd();
  const lead = index > 32 ? '...' : '';
  const tail = index + length + 32 < text.length ? '...' : '';
  return `"${lead}${before}${text.slice(index, index + length)}${after}${tail}"`;
}

/* ------------------------------------------------------------------------ */
/* The checker                                                              */
/* ------------------------------------------------------------------------ */

const URL_ATTRS = new Set(['href', 'src', 'poster', 'action', 'formaction', 'cite', 'xlink:href', 'background', 'longdesc', 'manifest']);
const SRCSET_ATTRS = new Set(['srcset', 'imagesrcset']);
const URL_METAS = new Set([
  'og:url', 'og:image', 'og:image:url', 'og:image:secure_url', 'og:video', 'og:video:url',
  'og:video:secure_url', 'og:audio', 'og:audio:url', 'twitter:image', 'twitter:image:src', 'twitter:player',
]);
const IDREF_ATTRS = new Set([
  'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-flowto', 'aria-details',
  'aria-errormessage', 'aria-activedescendant', 'for', 'list', 'form', 'headers', 'popovertarget', 'commandfor',
]);
const TEXT_FILE = /\.(css|js|mjs|json|xml|txt|svg|webmanifest)$/i;
// Glued words: Astro drops a line break between text and an element or an
// {expression}, so "Tokyo.\n<a>samuel@..." renders as "Tokyo.samuel@...".
// GLUE_TAGS mark element boundaries inside a line of text; FLOW_BREAK
// elements start a new line of text (or are not text at all). <var> is left
// out on purpose: formulas put variables next to each other ("λR(x)").
const GLUE_TAGS = new Set(['a', 'strong', 'em', 'b', 'i', 'code', 'abbr', 'time', 'kbd', 'cite', 'q', 'mark', 'small', 's', 'u', 'dfn', 'samp']);
const FLOW_BREAK = new Set([
  'address', 'article', 'aside', 'audio', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'dd', 'details',
  'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'head', 'header', 'hr', 'html', 'iframe', 'img', 'input', 'label', 'legend', 'li', 'main', 'math', 'meter', 'nav', 'noscript',
  'object', 'ol', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'script', 'section', 'select', 'style',
  'summary', 'svg', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'title', 'tr', 'ul', 'video',
]);
// Inside one text node: "Tokyo.Samuel" or "Berthelot,Tokyo" (an {expression} glued to text).
const GLUED_IN_TEXT = /(\p{Ll})([.,;:!?])(\p{Lu}\p{Ll})/gu;

const CHECKS = [
  ['links', 'Internal links, assets and fragments'],
  ['meta', 'Page metadata (lang, one h1, title, description, canonical, JSON-LD)'],
  ['images', 'Images (alt, width, height)'],
  ['http', 'No http:// URLs'],
  ['crawl', 'robots.txt and sitemap'],
];

class Checker {
  constructor(dist, siteArg) {
    this.dist = dist;
    this.files = new Set(listFiles(dist));
    this.problems = [];
    this.external = new Map(); // url -> Set of files
    this.pages = new Map(); // file -> page
    this.site = this.detectSite(siteArg);
    this.origin = this.site?.origin ?? 'https://site.invalid';
    // A copy made by preview-relative.mjs uses relative URLs everywhere, 404.html included.
    this.isPreview = this.files.has('.preview-relative');
  }

  error(check, where, message) {
    this.problems.push({ level: 'error', check, where, message });
  }

  warn(check, where, message) {
    this.problems.push({ level: 'warning', check, where, message });
  }

  read(file) {
    return readFileSync(path.join(this.dist, file), 'utf8');
  }

  /* -- Site origin ------------------------------------------------------ */

  detectSite(siteArg) {
    if (siteArg) {
      try {
        return { origin: new URL(siteArg).origin, source: '--site' };
      } catch {
        throw new Error(`--site is not a URL: ${siteArg}`);
      }
    }
    const counts = new Map();
    for (const file of this.files) {
      if (!file.endsWith('.html')) continue;
      for (const tag of this.read(file).match(/<link\b[^>]*>/gi) ?? []) {
        if (!/\brel\s*=\s*["']?canonical\b/i.test(tag)) continue;
        const href = /\bhref\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1];
        try {
          const origin = new URL(href).origin;
          counts.set(origin, (counts.get(origin) ?? 0) + 1);
        } catch {
          // not absolute; reported by the metadata check
        }
      }
    }
    if (counts.size > 0) {
      const [origin] = [...counts].sort((a, b) => b[1] - a[1])[0];
      return { origin, source: 'canonical links' };
    }
    if (this.files.has('robots.txt')) {
      const line = /^\s*sitemap:\s*(\S+)/im.exec(this.read('robots.txt'))?.[1];
      try {
        return { origin: new URL(line).origin, source: 'robots.txt' };
      } catch {
        // no usable Sitemap line; reported by the crawl check
      }
    }
    return null;
  }

  /* -- Pages ------------------------------------------------------------ */

  analyze(file) {
    if (this.pages.has(file)) return this.pages.get(file);
    const src = this.read(file);
    const page = {
      file,
      url: new URL(urlPathOf(file), this.origin),
      isDocument: /<html[\s>]|<!doctype\s+html/i.test(src),
      lang: null,
      titles: [],
      headings: [],
      metas: [],
      canonicals: [],
      ids: new Map(),
      idrefs: [],
      imgs: [],
      refs: [],
      blank: [],
      jsonld: [],
      base: null,
      noindex: false,
      redirect: false,
    };
    this.pages.set(file, page);

    const tokens = tokenizeHtml(src);
    let svgDepth = 0;
    let templateDepth = 0;
    let preDepth = 0;
    let codeDepth = 0;
    let heading = null;

    // The visible text of the current line of text, and the offsets where an
    // inline element opens or closes in it.
    let flow = '';
    let marks = [];
    const flushFlow = () => {
      const seen = new Set();
      for (const mark of marks) {
        if (seen.has(mark.pos)) continue;
        seen.add(mark.pos);
        if (/[\p{L}.,:;!?]/u.test(flow[mark.pos - 1] ?? '') && /\p{L}/u.test(flow[mark.pos] ?? '')) {
          this.warn('text', file, `no space at ${mark.tag}: ${context(flow, mark.pos, 0)}`);
        }
      }
      flow = '';
      marks = [];
    };
    const markBoundary = (tag) => {
      if (FLOW_BREAK.has(tag.replace(/[</>]/g, ''))) flushFlow();
      else if (GLUE_TAGS.has(tag.replace(/[</>]/g, '')) && templateDepth === 0 && svgDepth === 0 && preDepth === 0) {
        marks.push({ pos: flow.length, tag });
      }
    };

    tokens.forEach((tok, index) => {
      if (tok.type === 'start') {
        const attrs = {};
        for (const attr of tok.attrs) if (!(attr.name in attrs)) attrs[attr.name] = attr.value;
        const tag = tok.name;
        markBoundary(`<${tag}>`);
        if ((tag === 'svg' || tag === 'math') && !tok.selfClosing) svgDepth++; // foreign content
        if (tag === 'template') templateDepth++;
        if (tag === 'pre') preDepth++;
        if (tag === 'code') codeDepth++;
        if (templateDepth > 0) return;

        if (tag === 'html') page.lang = attrs.lang?.trim() || null;
        if ('id' in attrs) page.ids.set(attrs.id, (page.ids.get(attrs.id) ?? 0) + 1);
        if (tag === 'a' && attrs.name && !page.ids.has(attrs.name)) page.ids.set(attrs.name, 1);
        if (/^h[1-6]$/.test(tag) && svgDepth === 0) {
          heading = { level: Number(tag[1]), text: '' };
          page.headings.push(heading);
        }
        if (tag === 'img') page.imgs.push({ attrs, snippet: src.slice(tok.start, Math.min(tok.end, tok.start + 100)) });
        if (tag === 'base' && attrs.href) page.base = attrs.href;
        if (tag === 'meta') {
          page.metas.push(attrs);
          const key = (attrs.property ?? attrs.name ?? '').toLowerCase();
          if (key === 'robots' && /\b(noindex|none)\b/i.test(attrs.content ?? '')) page.noindex = true;
          if (URL_METAS.has(key) && attrs.content) page.refs.push({ value: attrs.content, kind: `<meta ${key}>` });
          if ((attrs['http-equiv'] ?? '').toLowerCase() === 'refresh') {
            page.redirect = true;
            const target = /url\s*=\s*['"]?([^'"]+)/i.exec(attrs.content ?? '')?.[1];
            if (target) page.refs.push({ value: target.trim(), kind: '<meta refresh>' });
          }
        }
        const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/);
        if (tag === 'link' && rel.includes('canonical')) page.canonicals.push(attrs.href ?? '');
        if ((tag === 'a' || tag === 'area') && (attrs.target ?? '').toLowerCase() === '_blank') page.blank.push(attrs.href ?? '');

        const kind = (name) => (tag === 'link' && attrs.rel ? `<link rel="${attrs.rel}">` : `<${tag} ${name}>`);
        for (const attr of tok.attrs) {
          if (URL_ATTRS.has(attr.name) || (attr.name === 'data' && tag === 'object')) {
            page.refs.push({ value: attr.value, kind: kind(attr.name) });
          } else if (SRCSET_ATTRS.has(attr.name)) {
            for (const c of parseSrcset(attr.value)) page.refs.push({ value: c.url, kind: kind(attr.name) });
          } else if (attr.name === 'style') {
            for (const u of cssUrls(attr.value)) page.refs.push({ value: u.url, kind: `style="" of <${tag}>` });
          }
          if (IDREF_ATTRS.has(attr.name)) {
            page.idrefs.push({ attr: attr.name, tag, ids: attr.value.trim().split(/\s+/).filter(Boolean) });
          }
        }
      } else if (tok.type === 'end') {
        markBoundary(`</${tok.name}>`);
        if ((tok.name === 'svg' || tok.name === 'math') && svgDepth > 0) svgDepth--;
        if (tok.name === 'template' && templateDepth > 0) templateDepth--;
        if (tok.name === 'pre' && preDepth > 0) preDepth--;
        if (tok.name === 'code' && codeDepth > 0) codeDepth--;
        if (heading && tok.name === `h${heading.level}`) heading = null;
      } else if (tok.type === 'text') {
        if (tok.rawText && tok.parent === 'style') {
          if (templateDepth === 0) for (const u of cssUrls(tok.raw)) page.refs.push({ value: u.url, kind: 'url() in inline <style>' });
        } else if (tok.rawText) {
          const opener = tokens[index - 1];
          const type = opener?.type === 'start' ? opener.attrs.find((a) => a.name === 'type')?.value.trim().toLowerCase() : '';
          const isJsonLd = type === 'application/ld+json';
          if (isJsonLd && templateDepth === 0) page.jsonld.push(tok.raw);
        } else {
          const text = decodeEntities(tok.raw);
          if (templateDepth > 0) return;
          if (!tok.parent && svgDepth === 0 && preDepth === 0) {
            flow += text;
            if (codeDepth === 0) {
              for (const m of text.matchAll(GLUED_IN_TEXT)) {
                this.warn('text', file, `no space after "${m[2]}": ${context(text, m.index, m[0].length)}`);
              }
            }
          }
          if (tok.parent === 'title' && svgDepth === 0) page.titles.push(text);
          if (heading) heading.text += text;
        }
      }
    });
    flushFlow();
    return page;
  }

  /* -- URLs ------------------------------------------------------------- */

  /** Checks one URL found in `file`, whose own URL is `base`. */
  checkRef(file, base, value, kind) {
    const c = classifyUrl(value);
    if (c.type === 'empty') {
      this.warn('links', file, `empty URL in ${kind}`);
      return;
    }
    if (c.type === 'scheme') {
      if (c.scheme === 'mailto' || c.scheme === 'tel') this.addExternal(value.trim(), file);
      else if (c.scheme === 'javascript') this.warn('links', file, `javascript: URL in ${kind}`);
      return;
    }
    if (c.type === 'absolute') {
      if (/^http:/i.test(value.trim())) this.error('http', file, `${value.trim()} in ${kind}`);
      let url;
      try {
        url = new URL(c.url);
      } catch {
        this.error('links', file, `${value} in ${kind}: not a valid URL`);
        return;
      }
      if (url.origin === this.origin || (this.site && url.host === new URL(this.origin).host)) {
        this.checkInternal(file, url, value.trim(), kind);
      } else {
        this.addExternal(url.href, file);
      }
      return;
    }
    if (c.type === 'relative' && file === '404.html' && !this.isPreview) {
      this.error('links', file, `${value} in ${kind}: relative URL in 404.html, which GitHub Pages serves at any path; use a root-relative URL`);
    }
    if (c.type === 'fragment' && value.trim() === '#') {
      this.warn('links', file, `href="#" in ${kind} goes nowhere`);
      return;
    }
    let url;
    try {
      url = new URL(value.trim(), base);
    } catch {
      this.error('links', file, `${value} in ${kind}: not a valid URL`);
      return;
    }
    this.checkInternal(file, url, value.trim(), kind, c.type === 'relative');
  }

  checkInternal(file, url, shown, kind, relative = false) {
    let urlPath;
    try {
      urlPath = decodeURIComponent(url.pathname);
    } catch {
      this.error('links', file, `${shown} in ${kind}: malformed percent-encoding`);
      return;
    }
    const label = relative ? `${shown} (resolves to ${url.pathname})` : shown;
    const target = resolveFile(this.files, urlPath);
    if (!target) {
      const lower = urlPath.replace(/^\/+/, '').toLowerCase();
      const hint = [...this.files].find((f) => f.toLowerCase() === lower || f.toLowerCase() === `${lower}index.html`);
      this.error('links', file, `${label} in ${kind}: no such file${hint ? ` (did you mean ${hint}? GitHub Pages is case-sensitive)` : ''}`);
      return;
    }
    if (target.redirect) this.warn('links', file, `${label} in ${kind}: directory without a trailing slash, GitHub Pages answers with a redirect`);
    const fragment = url.hash.slice(1);
    if (!fragment || !target.file.endsWith('.html')) return;
    let id;
    try {
      id = decodeURIComponent(fragment);
    } catch {
      id = fragment;
    }
    if (id.toLowerCase() === 'top' || id.startsWith(':~:')) return;
    const targetPage = this.analyze(target.file);
    if (!targetPage.ids.has(id)) this.error('links', file, `${label} in ${kind}: no element with id="${id}" in ${target.file}`);
  }

  addExternal(url, file) {
    if (!this.external.has(url)) this.external.set(url, new Set());
    this.external.get(url).add(file);
  }

  /* -- Page checks ------------------------------------------------------ */

  checkPage(page) {
    const f = page.file;
    let base = page.url;
    if (page.base) {
      this.warn('links', f, `<base href="${page.base}"> changes how every relative URL resolves`);
      try {
        base = new URL(page.base, page.url);
      } catch {
        // invalid base: keep the page URL
      }
    }
    for (const ref of page.refs) this.checkRef(f, base, ref.value, ref.kind);
    for (const raw of page.jsonld) this.checkJsonLd(page, raw);

    for (const img of page.imgs) {
      const missing = ['alt', 'width', 'height'].filter((a) => !(a in img.attrs));
      if (missing.length) this.error('images', f, `${img.snippet} has no ${missing.join(', ')}`);
      for (const a of ['width', 'height']) {
        if (a in img.attrs && !/^\s*[1-9]\d*\s*$/.test(img.attrs[a])) {
          this.error('images', f, `${img.snippet}: ${a}="${img.attrs[a]}" is not a positive integer`);
        }
      }
    }

    if (page.redirect) return; // a meta refresh page has no content of its own
    this.checkMetadata(page);

    for (const [id, count] of page.ids) if (count > 1) this.warn('a11y', f, `id="${id}" is used ${count} times`);
    for (const ref of page.idrefs) {
      for (const id of ref.ids) {
        if (!page.ids.has(id)) this.warn('a11y', f, `${ref.attr}="${id}" on <${ref.tag}> points to no element`);
      }
    }
    let previous = 0;
    for (const h of page.headings) {
      if (h.level > previous + 1) {
        const text = h.text.replace(/\s+/g, ' ').trim().slice(0, 50);
        this.warn('a11y', f, `h${h.level} "${text}" follows ${previous ? `h${previous}` : 'no heading'}: a level is skipped`);
      }
      previous = h.level;
    }
    for (const href of page.blank) this.warn('design', f, `link to ${href || '(no href)'} opens a new tab (target="_blank"); links open in the same tab`);
  }

  checkMetadata(page) {
    const f = page.file;
    const clean = (s) => s.replace(/\s+/g, ' ').trim();
    const length = (s) => [...s].length;

    if (!page.lang) this.error('meta', f, 'no lang attribute on <html>');
    const h1 = page.headings.filter((h) => h.level === 1).length;
    if (h1 !== 1) this.error('meta', f, `${h1} h1 elements, expected exactly one`);

    if (page.titles.length !== 1) this.error('meta', f, `${page.titles.length} <title> elements, expected one`);
    const title = clean(page.titles[0] ?? '');
    page.title = title;
    if (page.titles.length === 1 && length(title) === 0) this.error('meta', f, 'empty <title>');
    if (length(title) >= 70) this.error('meta', f, `title has ${length(title)} characters, must be under 70: "${title}"`);

    const descriptions = page.metas.filter((m) => (m.name ?? '').toLowerCase() === 'description');
    if (descriptions.length !== 1) this.error('meta', f, `${descriptions.length} meta descriptions, expected one`);
    const description = clean(descriptions[0]?.content ?? '');
    page.description = description;
    const dl = length(description);
    if (descriptions.length === 1 && (dl < 50 || dl > 160)) {
      this.error('meta', f, `meta description has ${dl} characters, must be 50 to 160: "${description}"`);
    }

    const meta = (key) => page.metas.find((m) => (m.property ?? m.name ?? '').toLowerCase() === key)?.content;
    if (page.canonicals.length > 1) this.error('meta', f, `${page.canonicals.length} canonical links, expected one`);
    const canonical = page.canonicals[0];
    if (canonical === undefined) {
      if (!page.noindex) this.error('meta', f, 'no canonical link (required on every indexable page)');
    } else {
      let url = null;
      try {
        url = new URL(canonical);
      } catch {
        this.error('meta', f, `canonical "${canonical}" is not an absolute URL`);
      }
      if (url && this.site && url.origin !== this.origin) {
        this.error('meta', f, `canonical ${canonical} is not on ${this.origin}`);
      } else if (url) {
        let urlPath = url.pathname;
        try {
          urlPath = decodeURIComponent(urlPath);
        } catch {
          // reported by the link check
        }
        const target = resolveFile(this.files, urlPath);
        if (target && target.file !== f) this.error('meta', f, `canonical ${canonical} points to ${target.file}, not to this page`);
        page.canonical = url.pathname;
      }
      const ogUrl = meta('og:url');
      if (ogUrl !== undefined && ogUrl !== canonical) this.warn('meta', f, `og:url ${ogUrl} differs from the canonical ${canonical}`);
    }

    const wanted = ['og:title', 'og:description', 'og:image', 'twitter:card'];
    if (!page.noindex) wanted.push('og:url');
    const missing = wanted.filter((key) => meta(key) === undefined);
    if (missing.length) this.warn('meta', f, `no ${missing.join(', ')}`);
    const ogImage = meta('og:image');
    if (ogImage && !/^https?:\/\//i.test(ogImage)) this.warn('meta', f, `og:image "${ogImage}" is not an absolute URL`);
  }

  checkJsonLd(page, raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      this.error('meta', page.file, `JSON-LD is not valid JSON: ${err.message}`);
      return;
    }
    // Values of keywords such as @id and @context are identifiers, not links:
    // they are only checked for http://.
    const walk = (value, key) => {
      if (typeof value === 'string') {
        if (key.startsWith('@')) {
          if (/^http:\/\//i.test(value)) this.error('http', page.file, `${value} in JSON-LD ${key}`);
        } else if (/^(https?:|mailto:|tel:|\/\/)/i.test(value)) {
          this.checkRef(page.file, page.url, value, `JSON-LD ${key}`);
        }
      } else if (Array.isArray(value)) {
        for (const v of value) walk(v, key);
      } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, k);
      }
    };
    walk(data, '');
  }

  /* -- Other files ------------------------------------------------------ */

  checkTextFile(file) {
    if (!/\.css$/i.test(file)) return;
    const text = this.read(file);
    const base = new URL(urlPathOf(file), this.origin);
    for (const u of cssUrls(text)) this.checkRef(file, base, u.url, 'CSS url()');
  }

  /* -- robots.txt and sitemaps ----------------------------------------- */

  checkCrawl() {
    if (!this.files.has('robots.txt')) {
      this.error('crawl', 'robots.txt', 'robots.txt is missing');
      return;
    }
    const robots = this.read('robots.txt');
    if (/^\s*disallow:\s*\/\s*$/im.test(robots)) this.warn('crawl', 'robots.txt', '"Disallow: /" blocks crawlers from the whole site');
    const sitemaps = [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
    if (sitemaps.length === 0) {
      this.error('crawl', 'robots.txt', 'no Sitemap: line');
      return;
    }
    const listed = new Set();
    const visit = (loc, from, depth) => {
      let url;
      try {
        url = new URL(loc);
      } catch {
        this.error('crawl', from, `sitemap entry "${loc}" is not an absolute URL`);
        return;
      }
      if (/^http:/i.test(loc)) this.error('http', from, `${loc} in sitemap`);
      if (this.site && url.origin !== this.origin) {
        this.error('crawl', from, `${loc} is not on ${this.origin}`);
        return;
      }
      const target = resolveFile(this.files, decodeURIComponent(url.pathname));
      if (!target) {
        this.error('crawl', from, `${loc} does not resolve to a file`);
        return;
      }
      if (target.file.endsWith('.xml') && depth < 3) {
        const xml = this.read(target.file);
        for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) visit(decodeEntities(m[1]), target.file, depth + 1);
      } else {
        listed.add(target.file);
      }
    };
    for (const loc of sitemaps) visit(loc, 'robots.txt', 0);

    for (const page of this.pages.values()) {
      if (!page.isDocument || page.redirect) continue;
      const inSitemap = listed.has(page.file);
      if (page.file === '404.html' && inSitemap) this.error('crawl', page.file, '404.html is listed in the sitemap');
      else if (page.noindex && inSitemap) this.error('crawl', page.file, 'noindex page is listed in the sitemap');
      else if (!page.noindex && page.file !== '404.html' && !inSitemap) this.warn('crawl', page.file, 'indexable page missing from the sitemap');
    }
  }

  /* -- Run ---------------------------------------------------------------- */

  run() {
    const htmlFiles = [...this.files].filter((f) => f.endsWith('.html'));
    for (const file of htmlFiles) this.analyze(file);
    this.documents = [];
    for (const file of htmlFiles) {
      const page = this.pages.get(file);
      if (!page.isDocument) {
        this.warn('files', file, 'not an HTML document (no <html> or doctype); page checks skipped');
        continue;
      }
      this.documents.push(page);
      this.checkPage(page);
    }
    for (const file of this.files) if (TEXT_FILE.test(file)) this.checkTextFile(file);
    this.checkCrawl();

    const seen = { title: new Map(), description: new Map() };
    for (const page of this.documents) {
      if (page.noindex || page.redirect) continue;
      for (const key of ['title', 'description']) {
        if (!page[key]) continue;
        const other = seen[key].get(page[key]);
        if (other) this.warn('meta', page.file, `same ${key} as ${other}: "${page[key]}"`);
        else seen[key].set(page[key], page.file);
      }
    }
  }
}

/* ------------------------------------------------------------------------ */
/* Report                                                                   */
/* ------------------------------------------------------------------------ */

function report(checker, distLabel) {
  const color = process.env.NO_COLOR === undefined && (process.stdout.isTTY || process.env.GITHUB_ACTIONS === 'true' || process.env.FORCE_COLOR);
  const paint = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const red = paint('31;1');
  const green = paint('32');
  const yellow = paint('33;1');
  const dim = paint('2');
  const bold = paint('1');

  // One line per distinct message, with the files it occurs in.
  const group = (problems) => {
    const map = new Map();
    for (const p of problems) {
      const key = `${p.check}\u0000${p.message}`;
      if (!map.has(key)) map.set(key, { ...p, where: [] });
      if (!map.get(key).where.includes(p.where)) map.get(key).where.push(p.where);
    }
    return [...map.values()];
  };
  const printGroup = (g, indent) => {
    console.log(`${indent}${g.message}`);
    console.log(dim(`${indent}  in ${g.where.join(', ')}`));
  };

  const errors = checker.problems.filter((p) => p.level === 'error');
  const warnings = checker.problems.filter((p) => p.level === 'warning');
  const pages = checker.documents;
  const site = checker.site ? `${checker.site.origin} (from ${checker.site.source})` : 'unknown, same-origin URLs treated as external';

  console.log(bold(`check-site ${distLabel}`));
  console.log(`${pages.length} pages, ${checker.files.size} files. Site: ${site}`);
  if (checker.isPreview) console.log('Relative preview (made by preview-relative.mjs): 404.html may use relative URLs.');
  console.log('');
  console.log(bold('Pages'));
  const width = Math.max(...pages.map((p) => p.file.length), 10);
  for (const p of pages) {
    const parts = [];
    if (p.redirect) parts.push('redirect');
    else {
      if (p.noindex) parts.push('noindex');
      parts.push(`title ${[...(p.title ?? '')].length}`, `description ${[...(p.description ?? '')].length}`);
      if (p.canonical) parts.push(`canonical ${p.canonical}`);
    }
    console.log(`  ${p.file.padEnd(width)}  ${dim(parts.join(', '))}`);
  }

  console.log('');
  console.log(bold('Checks'));
  for (const [id, title] of CHECKS) {
    const groups = group(errors.filter((p) => p.check === id));
    if (groups.length === 0) {
      console.log(`  ${green('ok  ')}  ${title}`);
      continue;
    }
    const count = errors.filter((p) => p.check === id).length;
    console.log(`  ${red('FAIL')}  ${title}: ${count} ${count === 1 ? 'error' : 'errors'}`);
    for (const g of groups) printGroup(g, '        ');
  }

  if (warnings.length) {
    console.log('');
    console.log(yellow(`Warnings (${warnings.length}, they do not fail the check)`));
    for (const g of group(warnings)) printGroup({ ...g, message: `[${g.check}] ${g.message}` }, '  ');
  }

  const external = [...checker.external].sort(([a], [b]) => a.localeCompare(b));
  console.log('');
  console.log(bold(`External links, not fetched (${external.length})`));
  for (const [url, files] of external) console.log(`  ${url}  ${dim(`(${files.size} ${files.size === 1 ? 'file' : 'files'})`)}`);

  if (process.env.GITHUB_ACTIONS === 'true') {
    const escape = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    for (const g of group(errors)) console.log(`::error title=check-site (${g.check})::${escape(`${g.message} [in ${g.where.join(', ')}]`)}`);
  }

  console.log('');
  const summary = `${errors.length} ${errors.length === 1 ? 'error' : 'errors'}, ${warnings.length} ${warnings.length === 1 ? 'warning' : 'warnings'}`;
  console.log(errors.length ? red(`FAIL: ${summary}`) : green(`PASS: ${summary}`));
  return errors.length === 0;
}

/* ------------------------------------------------------------------------ */
/* CLI                                                                      */
/* ------------------------------------------------------------------------ */

function main(argv) {
  const positional = argv.filter((a) => !a.startsWith('--'));
  const siteArg = argv.find((a) => a.startsWith('--site='))?.slice('--site='.length);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node scripts/check-site.mjs [distDir] [--site=https://example.com]');
    return 0;
  }
  const distLabel = positional[0] ?? 'dist';
  const dist = path.resolve(distLabel);
  if (!existsSync(dist) || !statSync(dist).isDirectory()) {
    console.error(`check-site: ${distLabel} is not a directory. Build the site first (npm run build).`);
    return 1;
  }
  const checker = new Checker(dist, siteArg);
  checker.run();
  return report(checker, distLabel) ? 0 : 1;
}

// Run only when executed directly, not when preview-relative.mjs imports the helpers.
const isMain = (() => {
  try {
    return realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (isMain) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(`check-site: ${err.message}`);
    process.exitCode = 1;
  }
}
