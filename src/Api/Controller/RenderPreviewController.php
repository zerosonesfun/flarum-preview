<?php

namespace ZerosOnesFun\FlarumPreview\Api\Controller;

use Flarum\Http\RequestUtil;
use Flarum\Formatter\Formatter;
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

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertCan('viewForum');

        $body = $request->getParsedBody();
        $content = (string) Arr::get($body, 'content', '');

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
