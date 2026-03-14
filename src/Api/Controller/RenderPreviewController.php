<?php

namespace ZerosOnesFun\FlarumPreview\Api\Controller;

use Flarum\Formatter\Formatter;
use Flarum\Foundation\ValidationException;
use Flarum\Http\RequestUtil;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Renders raw post content (Markdown/BBCode) to HTML using Flarum's full
 * TextFormatter pipeline. Used by the Preview extension for live preview.
 */
class RenderPreviewController implements RequestHandlerInterface
{
    public function __construct(
        protected Formatter $formatter
    ) {
    }

    /** Max request body length for preview content (bytes); avoids abuse. */
    private const MAX_CONTENT_LENGTH = 2 * 1024 * 1024;

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertCan('viewForum');

        $body = $request->getParsedBody();
        $content = (string) Arr::get($body, 'content', '');

        if (strlen($content) > self::MAX_CONTENT_LENGTH) {
            throw new ValidationException([
                'content' => ['Preview content is too long.'],
            ]);
        }

        $xml = $this->formatter->parse($content, null, $actor);
        $html = $this->formatter->render($xml, null, $request);

        return new JsonResponse([
            'data' => [
                'type' => 'preview',
                'attributes' => [
                    'html' => $html,
                ],
            ],
        ]);
    }
}
