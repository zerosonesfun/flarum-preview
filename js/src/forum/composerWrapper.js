/**
 * Wraps the Flarum composer textarea with a mirror-overlay preview layer.
 * Single source of truth: the textarea. Preview layer is visually behind/beneath with same size/scroll.
 */

import { createPreviewLayer } from './previewLayer.js';
import { getSettings } from './settings.js';

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
export function wrapComposerTextarea(textarea, app) {
  if (textarea[ATTR_WRAPPED]) return () => {};
  const settings = getSettings(app);

  if (settings.previewOnClickMode) {
    return attachPreviewOnClickMode(textarea, app);
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
      const { fetchPreview } = await import('./serverPreview.js');
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
export function wrapAllComposerTextareas(app) {
  document.querySelectorAll('.Composer textarea, .ComposerBody textarea, [class*="Composer"] textarea').forEach((ta) => {
    if (isComposerTextarea(ta)) wrapComposerTextarea(ta, app);
  });
}
