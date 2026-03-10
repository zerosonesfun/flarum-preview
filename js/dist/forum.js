import app from 'flarum/forum/app';

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
const TOKEN_TYPES = {
  HEADING: 'heading',
  BOLD: 'bold',
  ITALIC: 'italic',
  CODE_INLINE: 'code_inline',
  CODE_FENCED: 'code_fenced',
  LINK: 'link',
  IMAGE: 'image',
  BLOCKQUOTE: 'blockquote',
  LIST_UL: 'list_ul',
  LIST_OL: 'list_ol'};

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
    text.slice(open + 2, close);
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
function tokenize(text) {
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
function cursorInsideToken(position, tokens) {
  return tokens.some((t) => position >= t.start && position < t.end);
}

/**
 * Check if a token is a default template (do not render until edited).
 */
function isTemplateToken(token) {
  return token && (token.template === true || (token.type === TOKEN_TYPES.BOLD && token.template));
}

/**
 * Annotate rendered preview DOM with data-md-start and data-md-end so clicks
 * can focus the textarea and select the corresponding source range.
 * Heuristic: match tokens (from client tokenizer) to DOM nodes by token type and text/order.
 */


/**
 * Get all links and images from the token list for mapping.
 */
function getMappableTokens(tokens) {
  return tokens.filter((t) => t.type === TOKEN_TYPES.LINK || t.type === TOKEN_TYPES.IMAGE);
}

/**
 * Match tokens to DOM nodes by order (first link token -> first <a>, etc.).
 */

/**
 * Annotate the preview container's DOM with token ranges for click-to-edit.
 * For default template tokens we show raw markdown (do not render until edited).
 */
function annotatePreviewDom(container, sourceText) {
  if (!container || !sourceText) return;
  container.querySelectorAll('[data-md-start]').forEach((el) => {
    el.removeAttribute('data-md-start');
    el.removeAttribute('data-md-end');
    el.removeAttribute('data-preview-mapped');
    el.removeAttribute('data-preview-template');
    el.removeAttribute('data-preview-raw');
  });
  const tokens = tokenize(sourceText);
  const mappable = getMappableTokens(tokens);
  const links = Array.from(container.querySelectorAll('a[href]'));
  const imgs = Array.from(container.querySelectorAll('img'));
  let linkIdx = 0;
  let imgIdx = 0;
  for (const t of mappable) {
    if (t.type === TOKEN_TYPES.LINK && linkIdx < links.length) {
      const el = links[linkIdx];
      el.setAttribute('data-md-start', String(t.start));
      el.setAttribute('data-md-end', String(t.end));
      el.setAttribute('data-preview-mapped', '1');
      if (t.template) {
        el.setAttribute('data-preview-template', '1');
        el.setAttribute('data-preview-raw', t.raw || '');
      }
      linkIdx++;
    } else if (t.type === TOKEN_TYPES.IMAGE && imgIdx < imgs.length) {
      const el = imgs[imgIdx];
      el.setAttribute('data-md-start', String(t.start));
      el.setAttribute('data-md-end', String(t.end));
      el.setAttribute('data-preview-mapped', '1');
      if (t.template) {
        el.setAttribute('data-preview-template', '1');
        el.setAttribute('data-preview-raw', t.raw || '');
      }
      imgIdx++;
    }
  }
  replaceTemplateNodesWithRaw(container);
}

function replaceTemplateNodesWithRaw(container) {
  container.querySelectorAll('[data-preview-template="1"]').forEach((el) => {
    const raw = el.getAttribute('data-preview-raw') || '';
    el.textContent = raw;
    el.removeAttribute('href');
    el.setAttribute('role', 'button');
  });
}

/**
 * Find the element under a click and return { start, end } if it has mapping.
 */
function getMappingFromClick(target) {
  const el = target.closest('[data-md-start][data-md-end]');
  if (!el) return null;
  const start = parseInt(el.getAttribute('data-md-start'), 10);
  const end = parseInt(el.getAttribute('data-md-end'), 10);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
}

/**
 * Server preview client: POST /api/preview with content, return rendered HTML.
 * Handles multiple response shapes (data.html, data.data.attributes.html).
 * Debouncing is applied by the caller (previewLayer).
 */

const PREVIEW_URL = '/api/preview';

/**
 * Extract HTML from preview API response. Flarum and extensions may return different shapes.
 * @param {object} data - Parsed JSON body
 * @returns {string} HTML string or empty on failure
 */
function extractHtmlFromResponse(data) {
  if (!data) return '';
  if (typeof data.html === 'string') return data.html;
  if (data.data && typeof data.data === 'object') {
    const attrs = data.data.attributes || data.data;
    if (typeof attrs.html === 'string') return attrs.html;
  }
  return '';
}

/**
 * Request preview HTML from the server.
 * @param {string} content - Raw markdown/BBCode
 * @param {object} options - { credentials: 'same-origin', signal?: AbortSignal }
 * @returns {Promise<string>} Rendered HTML
 */
async function fetchPreview(content, options = {}) {
  const { credentials = 'same-origin', signal } = options;
  const res = await fetch(PREVIEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
    },
    body: JSON.stringify({ content: content || '' }),
    credentials,
    signal,
  });
  if (!res.ok) {
    const err = new Error(`Preview failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const html = extractHtmlFromResponse(data);
  return html;
}

var serverPreview = /*#__PURE__*/Object.freeze({
  __proto__: null,
  extractHtmlFromResponse: extractHtmlFromResponse,
  fetchPreview: fetchPreview
});

/**
 * Preview layer: renders server HTML in a div, syncs scroll with textarea,
 * annotates DOM for click-to-edit, handles click to focus textarea at token range.
 */


/**
 * Create a debounced function.
 */
function debounce(fn, ms) {
  let id;
  return function (...args) {
    clearTimeout(id);
    id = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Check if we should trigger preview immediately (e.g. closing ** or ```).
 */
function shouldTriggerInstant(text, lastText) {
  if (!lastText) return false;
  const triggers = ['**', '```', '\n#', '\n##', '\n###', '\n>', '\n-', '\n*', '\n1.'];
  for (const t of triggers) {
    if (text.endsWith(t) && !lastText.endsWith(t)) return true;
  }
  return false;
}

/**
 * Escape HTML for safe display when server preview fails.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * @param {HTMLTextAreaElement} textarea
 * @param {HTMLElement} layerEl - div that will hold the preview HTML
 * @param {object} options - { debounceMs, instantTriggers, onError }
 */
function createPreviewLayer(textarea, layerEl, options = {}) {
  const {
    debounceMs = 300,
    instantTriggers = true,
    credentials = 'same-origin',
    onError = () => {},
  } = options;

  let lastContent = '';
  let lastHtml = '';
  let aborter = null;
  const tokens = () => tokenize(textarea.value);
  const cursorPos = () => textarea.selectionStart;

  function reevaluateVisibility() {
    if (!lastHtml) {
      layerEl.style.visibility = "visible";
      return;
    }
    const content = textarea.value;
    const caret = cursorPos() || 0;
    const tok = tokens();
    if (!shouldShowPreviewForContent(content, caret, tok)) {
      layerEl.style.visibility = "hidden";
      return;
    }
    layerEl.style.visibility = "visible";
    layerEl.innerHTML = lastHtml;
    annotatePreviewDom(layerEl, content);
  }

  function updatePreviewHtml(html) {
    lastHtml = html;
    reevaluateVisibility();
  }

  function requestPreview() {
    const content = textarea.value;
    if (aborter) aborter.abort();
    aborter = new AbortController();
    fetchPreview(content, { credentials, signal: aborter.signal })
      .then((html) => {
        updatePreviewHtml(html);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        onError(err);
        updatePreviewHtml('<p class="PreviewLayer-error">' + escapeHtml(content || '(empty)') + '</p>');
      });
  }

  const debouncedRequest = debounce(requestPreview, debounceMs);

  function schedulePreview() {
    const content = textarea.value;
    if (instantTriggers && shouldTriggerInstant(content, lastContent)) {
      requestPreview();
    } else {
      debouncedRequest();
    }
    lastContent = content;
  }

  function scrollSync() {
    layerEl.scrollTop = textarea.scrollTop;
    layerEl.scrollLeft = textarea.scrollLeft;
  }

  layerEl.addEventListener('click', (e) => {
    const mapping = getMappingFromClick(e.target);
    if (mapping) {
      e.preventDefault();
      e.stopPropagation();
      textarea.focus();
      textarea.setSelectionRange(mapping.start, mapping.end);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      textarea.focus();
    }
  });

  textarea.addEventListener('scroll', scrollSync);
  textarea.addEventListener('input', schedulePreview);
  textarea.addEventListener('keyup', reevaluateVisibility);
  textarea.addEventListener('click', reevaluateVisibility);

  return {
    refresh() {
      requestPreview();
    },
    destroy() {
      textarea.removeEventListener('scroll', scrollSync);
      textarea.removeEventListener('input', schedulePreview);
      textarea.removeEventListener('keyup', reevaluateVisibility);
      textarea.removeEventListener('click', reevaluateVisibility);
      if (aborter) aborter.abort();
    },
  };
}

/**
 * Should we show the preview for the current content? (Template and cursor rules.)
 */
function shouldShowPreviewForContent(content, caretPosition, tokens) {
  const tok = tokens || tokenize(content);
  if (cursorInsideToken(caretPosition, tok)) return false;
  for (const t of tok) {
    if (isTemplateToken(t) && caretPosition >= t.start && caretPosition <= t.end) return false;
  }
  return true;
}

/**
 * Read extension settings from Flarum app payload.
 * Keys: zerosonesfun_preview.debounce_ms, .hide_raw, .instant_triggers, .preview_on_click_mode
 */

function getSettings(app) {
  const s = (app.data && app.data.settings) || {};
  const key = (k) => s[`zerosonesfun_preview.${k}`] ?? null;
  return {
    debounceMs: parseInt(key('debounce_ms'), 10) || 300,
    hideRaw: key('hide_raw') === '1' || key('hide_raw') === true,
    instantTriggers: key('instant_triggers') !== '0' && key('instant_triggers') !== false,
    previewOnClickMode: key('preview_on_click_mode') === '1' || key('preview_on_click_mode') === true,
  };
}

/**
 * Wraps the Flarum composer textarea with a mirror-overlay preview layer.
 * Single source of truth: the textarea. Preview layer is visually behind/beneath with same size/scroll.
 */


const WRAP_CLASS = 'PreviewComposerWrap';
const LAYER_CLASS = 'PreviewLayer';
const ATTR_WRAPPED = 'data-preview-wrapped';

/**
 * Check if a textarea is the main composer content field (Flarum uses .Composer body with textarea).
 */
function isComposerTextarea(textarea) {
  if (!textarea || textarea.tagName !== 'TEXTAREA') return false;
  const composer = textarea.closest('.Composer, .ComposerBody, [class*="Composer"]');
  return !!composer;
}

/**
 * Wrap textarea in container and add preview layer. Apply transparent text + visible caret.
 * @param {HTMLTextAreaElement} textarea
 * @param {object} app - Flarum app (for settings)
 * @returns {function} destroy
 */
function wrapComposerTextarea(textarea, app) {
  if (textarea[ATTR_WRAPPED]) return () => {};
  const settings = getSettings(app);

  if (settings.previewOnClickMode) {
    return attachPreviewOnClickMode(textarea);
  }

  const wrap = document.createElement('div');
  wrap.className = WRAP_CLASS;
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Composer with live preview');

  const layer = document.createElement('div');
  layer.className = LAYER_CLASS;
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('tabindex', '-1');

  const parent = textarea.parentNode;
  const next = textarea.nextSibling;
  parent.insertBefore(wrap, next);
  wrap.appendChild(textarea);
  wrap.appendChild(layer);

  Object.assign(wrap.style, {
    position: 'relative',
    display: 'block',
    flex: '1',
    minHeight: '0',
  });
  Object.assign(layer.style, {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'auto',
    pointerEvents: 'none',
    padding: getComputedStyle(textarea).padding,
    font: getComputedStyle(textarea).font,
    lineHeight: getComputedStyle(textarea).lineHeight,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    boxSizing: 'border-box',
  });
  layer.style.cursor = 'text';

  if (settings.hideRaw) {
    textarea.style.color = 'transparent';
    textarea.style.caretColor = 'currentColor';
  } else {
    textarea.style.color = 'rgba(0,0,0,0.35)';
    textarea.style.caretColor = 'currentColor';
  }
  textarea.setAttribute('aria-label', 'Post content (Markdown); live preview below');
  textarea[ATTR_WRAPPED] = '1';

  const controller = createPreviewLayer(textarea, layer, {
    debounceMs: settings.debounceMs,
    instantTriggers: settings.instantTriggers,
    onError: (err) => console.warn('[flarum-preview] Server preview failed', err),
  });

  return () => {
    controller.destroy();
    textarea.style.color = '';
    textarea.style.caretColor = '';
    textarea.removeAttribute(ATTR_WRAPPED);
    if (wrap.parentNode) {
      wrap.parentNode.insertBefore(textarea, wrap);
      wrap.remove();
    }
  };
}

/**
 * Preview-on-click mode: no live overlay; show an eye icon that toggles raw vs preview.
 */
function attachPreviewOnClickMode(textarea, app) {
  if (textarea[ATTR_WRAPPED]) return () => {};
  const wrap = document.createElement('div');
  wrap.className = WRAP_CLASS + ' PreviewComposerWrap--clickMode';
  wrap.setAttribute('data-preview-click-mode', '1');

  const container = document.createElement('div');
  container.className = 'PreviewClickContainer';
  container.style.cssText = 'position:relative; display:flex; flex-direction:column; flex:1; min-height:0;';

  const toolbar = document.createElement('div');
  toolbar.className = 'PreviewClickToolbar';
  toolbar.setAttribute('role', 'toolbar');
  const eyeBtn = document.createElement('button');
  eyeBtn.type = 'button';
  eyeBtn.className = 'Button PreviewToggleBtn';
  eyeBtn.setAttribute('aria-label', 'Toggle preview');
  eyeBtn.innerHTML = '<i class="fas fa-eye"></i>';
  eyeBtn.title = 'Preview';

  const previewBox = document.createElement('div');
  previewBox.className = 'PreviewClickBox';
  previewBox.style.cssText = 'display:none; flex:1; overflow:auto; padding:12px; border:1px solid var(--input-border-color, #ccc); border-radius:4px; background:var(--body-bg, #fff);';
  previewBox.setAttribute('aria-hidden', 'true');

  const parent = textarea.parentNode;
  const next = textarea.nextSibling;
  parent.insertBefore(wrap, next);
  wrap.appendChild(container);
  container.appendChild(toolbar);
  toolbar.appendChild(eyeBtn);
  container.appendChild(previewBox);
  container.appendChild(textarea);

  let showingPreview = false;
  let lastHtml = '';

  async function fetchAndShow() {
    try {
      const { fetchPreview } = await Promise.resolve().then(function () { return serverPreview; });
      lastHtml = await fetchPreview(textarea.value, { credentials: 'same-origin' });
      previewBox.innerHTML = lastHtml;
    } catch (e) {
      previewBox.innerHTML = '<p class="PreviewLayer-error">Preview failed.</p>';
    }
  }

  eyeBtn.addEventListener('click', () => {
    showingPreview = !showingPreview;
    if (showingPreview) {
      fetchAndShow();
      previewBox.style.display = 'block';
      textarea.style.display = 'none';
      eyeBtn.classList.add('active');
      eyeBtn.setAttribute('aria-pressed', 'true');
    } else {
      previewBox.style.display = 'none';
      textarea.style.display = 'block';
      eyeBtn.classList.remove('active');
      eyeBtn.setAttribute('aria-pressed', 'false');
    }
  });

  textarea[ATTR_WRAPPED] = '1';
  return () => {
    textarea.removeAttribute(ATTR_WRAPPED);
    if (wrap.parentNode) {
      wrap.parentNode.insertBefore(textarea, wrap);
      wrap.remove();
    }
  };
}

/**
 * Find all composer textareas and wrap them. Call when DOM changes (e.g. new composer opened).
 */
function wrapAllComposerTextareas(app) {
  document.querySelectorAll('.Composer textarea, .ComposerBody textarea, [class*="Composer"] textarea').forEach((ta) => {
    if (isComposerTextarea(ta)) wrapComposerTextarea(ta, app);
  });
}

/**
 * Flarum Preview extension: live visual preview overlay for the composer.
 * Mirror-overlay approach: textarea is single source of truth; preview layer shows rendered content.
 */


app.initializers.add('zerosonesfun-preview', () => {
  function attachToComposers() {
    wrapAllComposerTextareas(app);
  }

  attachToComposers();

  const observer = new MutationObserver(() => {
    attachToComposers();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
//# sourceMappingURL=forum.js.map
