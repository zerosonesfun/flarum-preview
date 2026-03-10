/**
 * Wraps the Flarum composer: top ~3/4 textarea, bottom ~1/4 preview panel.
 * Tap the preview panel header to expand/collapse. Single source of truth: textarea.
 */

import { createPreviewLayer } from './previewLayer.js';
import { getSettings } from './settings.js';

const WRAP_CLASS = 'PreviewComposerWrap';
const ATTR_WRAPPED = 'data-preview-wrapped';

function isComposerTextarea(textarea) {
  if (!textarea || textarea.tagName !== 'TEXTAREA') return false;
  const composer = textarea.closest('.Composer, .ComposerBody, [class*="Composer"]');
  return !!composer;
}

/**
 * Build layout: textarea on top (3/4), preview panel on bottom (1/4). Tap panel header to expand/collapse.
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
  wrap.setAttribute('aria-label', 'Composer with preview');

  const textareaWrap = document.createElement('div');
  textareaWrap.className = 'PreviewComposerTextareaWrap';

  const panel = document.createElement('div');
  panel.className = 'PreviewPanel';
  panel.setAttribute('aria-label', 'Preview');

  const panelHeader = document.createElement('button');
  panelHeader.type = 'button';
  panelHeader.className = 'PreviewPanel-header';
  panelHeader.setAttribute('aria-expanded', 'false');
  panelHeader.innerHTML = '<span class="PreviewPanel-title">Preview</span><span class="PreviewPanel-toggle" aria-hidden="true"></span>';

  const panelBody = document.createElement('div');
  panelBody.className = 'PreviewPanel-body';

  const parent = textarea.parentNode;
  const next = textarea.nextSibling;
  parent.insertBefore(wrap, next);
  wrap.appendChild(textareaWrap);
  textareaWrap.appendChild(textarea);
  wrap.appendChild(panel);
  panel.appendChild(panelHeader);
  panel.appendChild(panelBody);

  Object.assign(wrap.style, {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
  });
  Object.assign(textareaWrap.style, {
    flex: '3',
    minHeight: '0',
    display: 'flex',
    flexDirection: 'column',
  });
  textarea.style.flex = '1';
  textarea.style.minHeight = '0';

  let expanded = false;
  function setExpanded(value) {
    expanded = !!value;
    panel.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    panel.classList.toggle('PreviewPanel--expanded', expanded);
  }
  panelHeader.addEventListener('click', () => setExpanded(!expanded));

  textarea[ATTR_WRAPPED] = '1';

  const controller = createPreviewLayer(textarea, panelBody, {
    debounceMs: settings.debounceMs,
    instantTriggers: settings.instantTriggers,
    scrollSync: false,
    alwaysShow: true,
    onError: (err) => console.warn('[flarum-preview] Server preview failed', err),
  });

  return () => {
    controller.destroy();
    textarea.removeAttribute(ATTR_WRAPPED);
    if (wrap.parentNode) {
      wrap.parentNode.insertBefore(textarea, wrap);
      wrap.remove();
    }
  };
}

/**
 * Preview-on-click mode: eye is in composer footer (via TextEditor extend). No toolbar here.
 * Toggle is driven by custom event 'flarum-preview-toggle' from the footer button.
 */
function attachPreviewOnClickMode(textarea, app) {
  if (textarea[ATTR_WRAPPED]) return () => {};
  const wrap = document.createElement('div');
  wrap.className = WRAP_CLASS + ' PreviewComposerWrap--clickMode';
  wrap.setAttribute('data-preview-click-mode', '1');

  const container = document.createElement('div');
  container.className = 'PreviewClickContainer';
  container.style.cssText = 'position:relative; display:flex; flex-direction:column; flex:1; min-height:0;';

  const previewBox = document.createElement('div');
  previewBox.className = 'PreviewClickBox';
  previewBox.style.cssText = 'display:none; flex:1; overflow:auto; padding:12px; border:1px solid var(--input-border-color, #ccc); border-radius:4px; background:var(--body-bg, #fff);';
  previewBox.setAttribute('aria-hidden', 'true');

  const parent = textarea.parentNode;
  const next = textarea.nextSibling;
  parent.insertBefore(wrap, next);
  wrap.appendChild(container);
  container.appendChild(previewBox);
  container.appendChild(textarea);

  let showingPreview = false;
  let lastHtml = '';

  function getComposerEl() {
    return textarea.closest && textarea.closest('.Composer');
  }

  async function fetchAndShow() {
    try {
      const { fetchPreview } = await import('./serverPreview.js');
      lastHtml = await fetchPreview(textarea.value, { credentials: 'same-origin' });
      previewBox.innerHTML = lastHtml;
    } catch (e) {
      previewBox.innerHTML = '<p class="PreviewLayer-error">Preview failed.</p>';
    }
  }

  function toggle() {
    showingPreview = !showingPreview;
    if (showingPreview) {
      fetchAndShow();
      previewBox.style.display = 'block';
      textarea.style.display = 'none';
    } else {
      previewBox.style.display = 'none';
      textarea.style.display = 'block';
    }
    const composer = getComposerEl();
    if (composer) composer.setAttribute('data-preview-visible', showingPreview ? 'true' : 'false');
    if (typeof m !== 'undefined' && m.redraw) m.redraw();
  }

  function onToggle(e) {
    if (e.target && e.target.contains && e.target.contains(textarea)) toggle();
  }

  document.addEventListener('flarum-preview-toggle', onToggle);

  textarea[ATTR_WRAPPED] = '1';
  return () => {
    document.removeEventListener('flarum-preview-toggle', onToggle);
    textarea.removeAttribute(ATTR_WRAPPED);
    const composer = getComposerEl();
    if (composer) composer.removeAttribute('data-preview-visible');
    if (wrap.parentNode) {
      wrap.parentNode.insertBefore(textarea, wrap);
      wrap.remove();
    }
  };
}

export function wrapAllComposerTextareas(app) {
  document.querySelectorAll('.Composer textarea, .ComposerBody textarea, [class*="Composer"] textarea').forEach((ta) => {
    if (isComposerTextarea(ta)) wrapComposerTextarea(ta, app);
  });
}
