/**
 * Flarum Preview extension: live visual preview overlay for the composer.
 * Mirror-overlay approach: textarea is single source of truth; preview layer shows rendered content.
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
