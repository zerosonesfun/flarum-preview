/**
 * Admin extender: register settings for the Preview extension (Flarum 2.0).
 */

import Extend from 'flarum/common/extenders';
import app from 'flarum/admin/app';

export default [
  new Extend.Admin()
    .setting(
      () => ({
        setting: 'zerosonesfun_preview.preview_on_click_mode',
        label: app.translator.trans('zerosonesfun-preview.admin.preview_on_click_mode_label', {}, true),
        help: app.translator.trans('zerosonesfun-preview.admin.preview_on_click_mode_help', {}, true),
        type: 'boolean',
      }),
      100
    )
    .setting(
      () => ({
        setting: 'zerosonesfun_preview.debounce_ms',
        label: app.translator.trans('zerosonesfun-preview.admin.debounce_ms_label', {}, true),
        help: app.translator.trans('zerosonesfun-preview.admin.debounce_ms_help', {}, true),
        type: 'number',
        min: 100,
        max: 2000,
      }),
      90
    )
    .setting(
      () => ({
        setting: 'zerosonesfun_preview.instant_triggers',
        label: app.translator.trans('zerosonesfun-preview.admin.instant_triggers_label', {}, true),
        help: app.translator.trans('zerosonesfun-preview.admin.instant_triggers_help', {}, true),
        type: 'boolean',
      }),
      70
    ),
];
