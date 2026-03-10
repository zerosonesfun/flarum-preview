/**
 * Annotate rendered preview DOM for template detection only.
 * Default toolbar templates (e.g. [link](https://)) are shown as raw markdown until edited.
 */

import { TOKEN_TYPES, tokenize } from './tokenizer.js';

function getMappableTokens(tokens) {
  return tokens.filter((t) => t.type === TOKEN_TYPES.LINK || t.type === TOKEN_TYPES.IMAGE);
}

export function annotatePreviewDom(container, sourceText) {
  if (!container || !sourceText) return;
  container.querySelectorAll('[data-preview-template], [data-preview-raw]').forEach((el) => {
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
      if (t.template) {
        el.setAttribute('data-preview-template', '1');
        el.setAttribute('data-preview-raw', t.raw || '');
      }
      linkIdx++;
    } else if (t.type === TOKEN_TYPES.IMAGE && imgIdx < imgs.length) {
      const el = imgs[imgIdx];
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
