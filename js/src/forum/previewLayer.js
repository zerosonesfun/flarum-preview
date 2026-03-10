/**
 * Preview layer: renders server HTML in a div, syncs scroll with textarea,
 * annotates DOM for click-to-edit, handles click to focus textarea at token range.
 */

import { annotatePreviewDom, getMappingFromClick } from './domMapping.js';
import { tokenize, cursorInsideToken, isTemplateToken } from './tokenizer.js';
import { fetchPreview } from './serverPreview.js';

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
 * @param {object} options - { debounceMs, instantTriggers, scrollSync, alwaysShow, onError }
 */
export function createPreviewLayer(textarea, layerEl, options = {}) {
  const {
    debounceMs = 300,
    instantTriggers = true,
    scrollSync: enableScrollSync = true,
    alwaysShow = false,
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
    if (alwaysShow) {
      layerEl.style.visibility = "visible";
      layerEl.innerHTML = lastHtml;
      annotatePreviewDom(layerEl, textarea.value);
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

  if (enableScrollSync) {
    textarea.addEventListener('scroll', scrollSync);
  }
  textarea.addEventListener('input', schedulePreview);
  textarea.addEventListener('keyup', reevaluateVisibility);
  textarea.addEventListener('click', reevaluateVisibility);

  requestPreview();

  return {
    refresh() {
      requestPreview();
    },
    destroy() {
      if (enableScrollSync) {
        textarea.removeEventListener('scroll', scrollSync);
      }
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
export function shouldShowPreviewForContent(content, caretPosition, tokens) {
  const tok = tokens || tokenize(content);
  if (cursorInsideToken(caretPosition, tok)) return false;
  for (const t of tok) {
    if (isTemplateToken(t) && caretPosition >= t.start && caretPosition <= t.end) return false;
  }
  return true;
}
