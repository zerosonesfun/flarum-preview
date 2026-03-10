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

  const EXPANDED_DEFAULT_HEIGHT = 80;
  const MIN_TEXTAREA_HEIGHT = 80;

  let expanded = false;
  let didDrag = false;

  function getMaxPanelHeight() {
    const h = wrap.offsetHeight;
    return Math.max(EXPANDED_DEFAULT_HEIGHT, (h || 0) - MIN_TEXTAREA_HEIGHT);
  }

  function setExpanded(value) {
    expanded = !!value;
    panel.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    panel.classList.toggle('PreviewPanel--expanded', expanded);
    panel.classList.toggle('PreviewPanel--collapsed', !expanded);
    if (expanded) {
      panel.style.height = EXPANDED_DEFAULT_HEIGHT + 'px';
      panel.style.maxHeight = getMaxPanelHeight() + 'px';
    } else {
      panel.style.height = '';
      panel.style.maxHeight = '';
    }
  }

  function onHeaderPointerDown(e) {
    didDrag = false;
    if (!expanded) return;
    const startY = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
    const startHeight = panel.offsetHeight;
    const maxH = getMaxPanelHeight();

    function move(e) {
      didDrag = true;
      const currentY = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
      const deltaY = startY - currentY;
      const newHeight = Math.max(EXPANDED_DEFAULT_HEIGHT, Math.min(maxH, startHeight + deltaY));
      panel.classList.add('PreviewPanel--dragging');
      panel.style.height = newHeight + 'px';
    }

    function stop() {
      panel.classList.remove('PreviewPanel--dragging');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);
      document.removeEventListener('touchmove', move, { passive: true });
      document.removeEventListener('touchend', stop);
    }

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('touchend', stop);
  }

  panelHeader.addEventListener('mousedown', onHeaderPointerDown);
  panelHeader.addEventListener('touchstart', onHeaderPointerDown, { passive: true });

  panelHeader.addEventListener('click', (e) => {
    if (didDrag) return;
    setExpanded(!expanded);
  });

  setExpanded(true);

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
 * Preview-on-click mode: eye button floats bottom-right of the textarea, semi-transparent.
 * Does not sit in the toolbar, so it does not add height or eat typing space. Default .item-preview hidden via CSS.
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
  previewBox.style.cssText = 'display:none; flex:1; overflow:auto; padding:12px; background:var(--body-bg, #fff);';
  previewBox.setAttribute('aria-hidden', 'true');

  const eyeWrap = document.createElement('div');
  eyeWrap.className = 'PreviewEyeFloating';
  const eyeBtn = document.createElement('button');
  eyeBtn.type = 'button';
  eyeBtn.className = 'Button Button--icon hasIcon PreviewToggleBtn';
  eyeBtn.setAttribute('aria-label', 'Preview');
  eyeBtn.title = 'Preview';
  eyeBtn.innerHTML = '<i class="icon far fa-eye Button-icon" aria-hidden="true"></i><span class="Button-label"></span>';
  eyeWrap.appendChild(eyeBtn);

  const parent = textarea.parentNode;
  const next = textarea.nextSibling;
  parent.insertBefore(wrap, next);
  wrap.appendChild(container);
  container.appendChild(previewBox);
  container.appendChild(textarea);
  container.appendChild(eyeWrap);

  const composerRoot = textarea.closest && textarea.closest('.Composer');
  if (composerRoot) composerRoot.classList.add('Composer--previewClickMode');

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
      eyeWrap.style.display = 'none';
    } else {
      previewBox.style.display = 'none';
      textarea.style.display = 'block';
      eyeWrap.style.display = '';
    }
    const composer = getComposerEl();
    if (composer) composer.setAttribute('data-preview-visible', showingPreview ? 'true' : 'false');
    if (showingPreview) eyeBtn.classList.add('active');
    else eyeBtn.classList.remove('active');
  }

  eyeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  textarea[ATTR_WRAPPED] = '1';
  return () => {
    const composerEl = getComposerEl();
    if (composerEl) {
      composerEl.classList.remove('Composer--previewClickMode');
      composerEl.removeAttribute('data-preview-visible');
    }
    textarea.removeAttribute(ATTR_WRAPPED);
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
