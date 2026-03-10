/**
 * Flarum Preview extension: composer preview (bottom panel or eye-toggle).
 * Preview-on-click eye button is injected via DOM (no TextEditor extend) to avoid conflicts with other extensions.
 */

import app from 'flarum/forum/app';
import { wrapComposerTextarea, wrapAllComposerTextareas } from './composerWrapper.js';

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
