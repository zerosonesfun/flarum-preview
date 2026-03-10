/**
 * Annotate rendered preview DOM with data-md-start and data-md-end so clicks
 * can focus the textarea and select the corresponding source range.
 * Heuristic: match tokens (from client tokenizer) to DOM nodes by token type and text/order.
 */

import { TOKEN_TYPES, tokenize } from './tokenizer.js';

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
export function annotatePreviewDom(container, sourceText) {
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
export function getMappingFromClick(target) {
  const el = target.closest('[data-md-start][data-md-end]');
  if (!el) return null;
  const start = parseInt(el.getAttribute('data-md-start'), 10);
  const end = parseInt(el.getAttribute('data-md-end'), 10);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
}
