/**
 * Read extension settings from Flarum app payload.
 * Keys: zerosonesfun_preview.debounce_ms, .hide_raw, .instant_triggers, .preview_on_click_mode
 */

export function getSettings(app) {
  const s = (app.data && app.data.settings) || {};
  const key = (k) => s[`zerosonesfun_preview.${k}`] ?? null;
  return {
    debounceMs: parseInt(key('debounce_ms'), 10) || 300,
    hideRaw: key('hide_raw') === '1' || key('hide_raw') === true,
    instantTriggers: key('instant_triggers') !== '0' && key('instant_triggers') !== false,
    previewOnClickMode: key('preview_on_click_mode') === '1' || key('preview_on_click_mode') === true,
  };
}
