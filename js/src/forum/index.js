/**
 * Flarum Preview extension: composer preview (bottom panel or eye-toggle).
 * When "preview on click" is on: eye button in composer footer (next to Post reply); default preview hidden.
 */

import app from 'flarum/forum/app';
import extend from 'flarum/common/extend';
import TextEditor from 'flarum/common/components/TextEditor';
import Button from 'flarum/common/components/Button';
import { wrapComposerTextarea, wrapAllComposerTextareas } from './composerWrapper.js';

// When preview-on-click mode is on: add eye button next to submit (Reply and Discussion). Replace default preview in Reply.
extend(TextEditor.prototype, 'controlItems', function (original) {
  const items = original();
  const previewOnClick = app.forum && (app.forum.attribute('previewOnClickMode') === '1' || app.forum.attribute('previewOnClickMode') === true);
  if (!previewOnClick || typeof Button.component !== 'function') return items;
  if (this.attrs.preview) items.remove('preview');
  const composer = this.element && this.element.closest && this.element.closest('.Composer');
  const isActive = composer && composer.getAttribute('data-preview-visible') === 'true';
  const trans = app.translator && typeof app.translator.trans === 'function' ? app.translator.trans('core.forum.composer.preview') : 'Preview';
  items.add(
    'preview',
    Button.component({
      className: 'Button Button--icon hasIcon PreviewToggleBtn' + (isActive ? ' active' : ''),
      icon: 'far fa-eye',
      onclick(e) {
        const el = e && e.target && e.target.closest && e.target.closest('.Composer');
        if (el) el.dispatchEvent(new CustomEvent('flarum-preview-toggle'));
      },
      'aria-label': trans,
    }),
    15
  );
  return items;
});

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
