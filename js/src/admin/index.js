/**
 * Admin settings for the Preview extension.
 */

import app from 'flarum/admin/app';

app.initializers.add('zerosonesfun-preview-admin', () => {
  app.extensionData
    .for('zerosonesfun-preview')
    .registerSetting({
      setting: 'zerosonesfun_preview.preview_on_click_mode',
      label: app.translator.trans('zerosonesfun-preview.admin.preview_on_click_mode_label'),
      help: app.translator.trans('zerosonesfun-preview.admin.preview_on_click_mode_help'),
      type: 'boolean',
    }, 100)
    .registerSetting({
      setting: 'zerosonesfun_preview.debounce_ms',
      label: app.translator.trans('zerosonesfun-preview.admin.debounce_ms_label'),
      help: app.translator.trans('zerosonesfun-preview.admin.debounce_ms_help'),
      type: 'number',
      min: 100,
      max: 2000,
    }, 90)
    .registerSetting({
      setting: 'zerosonesfun_preview.hide_raw',
      label: app.translator.trans('zerosonesfun-preview.admin.hide_raw_label'),
      help: app.translator.trans('zerosonesfun-preview.admin.hide_raw_help'),
      type: 'boolean',
    }, 80)
    .registerSetting({
      setting: 'zerosonesfun_preview.instant_triggers',
      label: app.translator.trans('zerosonesfun-preview.admin.instant_triggers_label'),
      help: app.translator.trans('zerosonesfun-preview.admin.instant_triggers_help'),
      type: 'boolean',
    }, 70);
});
