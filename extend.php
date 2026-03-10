<?php

namespace ZerosOnesFun\FlarumPreview;

use Flarum\Extend;
use ZerosOnesFun\FlarumPreview\Api\Controller\RenderPreviewController;

return [
    (new Extend\Locales(__DIR__ . '/locale')),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    (new Extend\Routes('api'))
        ->post('/preview', 'zerosonesfun.preview.render', RenderPreviewController::class),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    (new Extend\Settings())
        ->default('zerosonesfun_preview.debounce_ms', 300)
        ->default('zerosonesfun_preview.hide_raw', false)
        ->default('zerosonesfun_preview.instant_triggers', true)
        ->default('zerosonesfun_preview.preview_on_click_mode', false),
];
