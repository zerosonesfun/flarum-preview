/**
 * Read extension settings from Flarum forum payload (serializeToForum in extend.php).
 * Uses app.forum.attribute() so settings work on the forum frontend.
 */

export function getSettings(app) {
  const attr = (key) => app.forum && app.forum.attribute ? app.forum.attribute(key) : undefined;
  const debounceRaw = attr('previewDebounceMs');
  const instantRaw = attr('previewInstantTriggers');
  const clickModeRaw = attr('previewOnClickMode');
  return {
    debounceMs: Math.max(0, parseInt(debounceRaw, 10) || 300),
    instantTriggers: instantRaw !== '0' && instantRaw !== false,
    previewOnClickMode: clickModeRaw === '1' || clickModeRaw === true,
  };
}
