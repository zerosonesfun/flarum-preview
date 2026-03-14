/**
 * Admin entry for the Preview extension (Flarum 2.0).
 * Register settings via app.registry (same pattern as FoF discussion-templates).
 */

import app from 'flarum/admin/app';

export { default as extend } from './extend.js';

app.initializers.add('zerosonesfun-preview-admin', () => {
  app.registry
    .for('zerosonesfun-preview')
    .registerSetting(
      {
        setting: 'zerosonesfun_preview.preview_on_click_mode',
        label: app.translator.trans('zerosonesfun-preview.admin.preview_on_click_mode_label'),
        help: app.translator.trans('zerosonesfun-preview.admin.preview_on_click_mode_help'),
        type: 'boolean',
      },
      100
    )
    .registerSetting(
      {
        setting: 'zerosonesfun_preview.debounce_ms',
        label: app.translator.trans('zerosonesfun-preview.admin.debounce_ms_label'),
        help: app.translator.trans('zerosonesfun-preview.admin.debounce_ms_help'),
        type: 'number',
        min: 100,
        max: 2000,
      },
      90
    )
    .registerSetting(
      {
        setting: 'zerosonesfun_preview.instant_triggers',
        label: app.translator.trans('zerosonesfun-preview.admin.instant_triggers_label'),
        help: app.translator.trans('zerosonesfun-preview.admin.instant_triggers_help'),
        type: 'boolean',
      },
      70
    );
});
