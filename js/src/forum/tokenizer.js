/**
 * Lightweight client-side tokenizer for common Markdown only.
 * Used for: (1) mapping rendered DOM back to source ranges for click-to-edit,
 * (2) detecting default toolbar templates that should not be rendered until edited.
 * BBCode and unknown [tag] patterns are treated as atomic (no client render; rely on server preview).
 */

/** Known default templates: do not render in preview until user edits. */
const DEFAULT_TEMPLATES = [
  { label: 'link', url: 'https://' },
  { label: 'image', url: 'https://' },
  { label: 'url', url: 'https://' },
  { label: 'alt', url: 'https://' },
];

/** Regex for link: [text](url) - capture group 1=label, 2=url */
const LINK_RE = /\[([^\]]*)\]\((https?:\/\/[^)]*)\)/g;
/** Regex for image: ![alt](url) */
const IMAGE_RE = /!\[([^\]]*)\]\((https?:\/\/[^)]*)\)/g;

/**
 * Check if a link/image token matches a default template (placeholder text/url).
 */
function isDefaultTemplate(type, label, url) {
  if (!url || typeof label !== 'string') return false;
  const u = (url || '').trim().toLowerCase();
  const l = (label || '').trim().toLowerCase();
  for (const t of DEFAULT_TEMPLATES) {
    if (u === t.url.toLowerCase() && (l === t.label.toLowerCase() || (type === 'image' && l === 'alt'))) return true;
  }
  return false;
}

/**
 * Token types we recognize. Unknown BBCode [xxx] is not tokenized here (server handles it).
 */
export const TOKEN_TYPES = {
  HEADING: 'heading',
  BOLD: 'bold',
  ITALIC: 'italic',
  CODE_INLINE: 'code_inline',
  CODE_FENCED: 'code_fenced',
  LINK: 'link',
  IMAGE: 'image',
  BLOCKQUOTE: 'blockquote',
  LIST_UL: 'list_ul',
  LIST_OL: 'list_ol',
  PARAGRAPH: 'paragraph',
};

/**
 * Token: { type, start, end, raw, template?, label?, url?, ... }
 */
function makeToken(type, start, end, raw, extra = {}) {
  return { type, start, end, raw, ...extra };
}

/**
 * Find all link tokens [text](url) in text. Returns array of tokens with label/url.
 */
function tokenizeLinks(text) {
  const tokens = [];
  let m;
  const re = new RegExp(LINK_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    const label = m[1];
    const url = m[2];
    const full = m[0];
    tokens.push(makeToken(TOKEN_TYPES.LINK, m.index, m.index + full.length, full, {
      label,
      url,
      template: isDefaultTemplate('link', label, url),
    }));
  }
  return tokens;
}

/**
 * Find all image tokens ![alt](url).
 */
function tokenizeImages(text) {
  const tokens = [];
  let m;
  const re = new RegExp(IMAGE_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    const alt = m[1];
    const url = m[2];
    const full = m[0];
    tokens.push(makeToken(TOKEN_TYPES.IMAGE, m.index, m.index + full.length, full, {
      label: alt,
      url,
      template: isDefaultTemplate('image', alt, url),
    }));
  }
  return tokens;
}

/**
 * Check if **bold** at position is a default template (exactly "**bold**").
 */
function isBoldTemplate(text, start) {
  const slice = text.slice(start, start + 10);
  return slice === '**bold**' || slice.startsWith('**bold**');
}

/**
 * Tokenize bold **...**. Prefer non-overlapping; first match wins.
 */
function tokenizeBold(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('**', i);
    if (open === -1) break;
    const close = text.indexOf('**', open + 2);
    if (close === -1) break;
    const inner = text.slice(open + 2, close);
    tokens.push(makeToken(TOKEN_TYPES.BOLD, open, close + 2, text.slice(open, close + 2), {
      template: isBoldTemplate(text, open),
    }));
    i = close + 2;
  }
  return tokens;
}

/**
 * Tokenize italic *...* (single asterisk, not overlapping with bold).
 */
function tokenizeItalic(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('*', i);
    if (open === -1) break;
    if (text.slice(open, open + 2) === '**') { i = open + 1; continue; }
    const close = text.indexOf('*', open + 1);
    if (close === -1) break;
    if (close === open + 1) { i = open + 1; continue; }
    tokens.push(makeToken(TOKEN_TYPES.ITALIC, open, close + 1, text.slice(open, close + 1)));
    i = close + 1;
  }
  return tokens;
}

/**
 * Inline code `...`
 */
function tokenizeInlineCode(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('`', i);
    if (open === -1) break;
    const close = text.indexOf('`', open + 1);
    if (close === -1) break;
    tokens.push(makeToken(TOKEN_TYPES.CODE_INLINE, open, close + 1, text.slice(open, close + 1)));
    i = close + 1;
  }
  return tokens;
}

/**
 * Headings: # ... up to ###### at line start.
 */
function tokenizeHeadings(text) {
  const tokens = [];
  const lines = text.split(/\r?\n/);
  let offset = 0;
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const full = line;
      const start = offset;
      const end = offset + full.length;
      tokens.push(makeToken(TOKEN_TYPES.HEADING, start, end, full, { level: m[1].length }));
    }
    offset += line.length + 1;
  }
  return tokens;
}

/**
 * Blockquote lines: lines starting with >
 */
function tokenizeBlockquotes(text) {
  const tokens = [];
  const lines = text.split(/\r?\n/);
  let offset = 0;
  let blockStart = null;
  let blockEnd = null;
  for (const line of lines) {
    if (line.startsWith('>')) {
      if (blockStart === null) blockStart = offset;
      blockEnd = offset + line.length;
    } else {
      if (blockStart !== null && blockEnd !== null) {
        tokens.push(makeToken(TOKEN_TYPES.BLOCKQUOTE, blockStart, blockEnd, text.slice(blockStart, blockEnd)));
      }
      blockStart = null;
      blockEnd = null;
    }
    offset += line.length + 1;
  }
  if (blockStart !== null && blockEnd !== null) {
    tokens.push(makeToken(TOKEN_TYPES.BLOCKQUOTE, blockStart, blockEnd, text.slice(blockStart, blockEnd)));
  }
  return tokens;
}

/**
 * Fenced code blocks ``` ... ```
 */
function tokenizeFencedCode(text) {
  const tokens = [];
  const re = /^```[\s\S]*?^```/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    tokens.push(makeToken(TOKEN_TYPES.CODE_FENCED, m.index, m.index + m[0].length, m[0]));
  }
  return tokens;
}

/**
 * Unordered list lines: ^\s*[-*+]\s
 */
function tokenizeListUl(text) {
  const tokens = [];
  const lines = text.split(/\r?\n/);
  let offset = 0;
  let blockStart = null;
  let blockEnd = null;
  for (const line of lines) {
    if (/^\s*[-*+]\s/.test(line)) {
      if (blockStart === null) blockStart = offset;
      blockEnd = offset + line.length;
    } else {
      if (blockStart !== null && blockEnd !== null) {
        tokens.push(makeToken(TOKEN_TYPES.LIST_UL, blockStart, blockEnd, text.slice(blockStart, blockEnd)));
      }
      blockStart = null;
      blockEnd = null;
    }
    offset += line.length + 1;
  }
  if (blockStart !== null && blockEnd !== null) {
    tokens.push(makeToken(TOKEN_TYPES.LIST_UL, blockStart, blockEnd, text.slice(blockStart, blockEnd)));
  }
  return tokens;
}

/**
 * Ordered list lines: ^\s*\d+\.\s
 */
function tokenizeListOl(text) {
  const tokens = [];
  const lines = text.split(/\r?\n/);
  let offset = 0;
  let blockStart = null;
  let blockEnd = null;
  for (const line of lines) {
    if (/^\s*\d+\.\s/.test(line)) {
      if (blockStart === null) blockStart = offset;
      blockEnd = offset + line.length;
    } else {
      if (blockStart !== null && blockEnd !== null) {
        tokens.push(makeToken(TOKEN_TYPES.LIST_OL, blockStart, blockEnd, text.slice(blockStart, blockEnd)));
      }
      blockStart = null;
      blockEnd = null;
    }
    offset += line.length + 1;
  }
  if (blockStart !== null && blockEnd !== null) {
    tokens.push(makeToken(TOKEN_TYPES.LIST_OL, blockStart, blockEnd, text.slice(blockStart, blockEnd)));
  }
  return tokens;
}

/**
 * Returns all tokens for the given text. Order: links, images, bold, italic, inline code,
 * headings, blockquotes, fenced code, list_ul, list_ol.
 * Overlaps are possible (e.g. bold inside link); consumer should use start/end for mapping.
 */
export function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  const all = [
    ...tokenizeLinks(text),
    ...tokenizeImages(text),
    ...tokenizeBold(text),
    ...tokenizeItalic(text),
    ...tokenizeInlineCode(text),
    ...tokenizeHeadings(text),
    ...tokenizeBlockquotes(text),
    ...tokenizeFencedCode(text),
    ...tokenizeListUl(text),
    ...tokenizeListOl(text),
  ];
  return all.sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Check if position (caret index) is inside any of the given tokens.
 * Token end is exclusive (one past last character).
 */
export function cursorInsideToken(position, tokens) {
  return tokens.some((t) => position >= t.start && position < t.end);
}

/**
 * Find token at or containing the given position (for click-to-edit).
 * Token end is exclusive.
 */
export function getTokenAtPosition(position, tokens) {
  return tokens.find((t) => position >= t.start && position < t.end) || null;
}

/**
 * Check if a token is a default template (do not render until edited).
 */
export function isTemplateToken(token) {
  return token && (token.template === true || (token.type === TOKEN_TYPES.BOLD && token.template));
}
