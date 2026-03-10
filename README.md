# Preview (zerosonesfun/flarum-preview)

Live preview for the Flarum composer. **Textarea is always the source of truth** (raw Markdown/BBCode); preview is either a split panel below the editor or a full toggle via the eye button.

## What the plugin does (current behavior)

- **Default (Preview on click OFF)**  
  - Composer: top = textarea, bottom = **split preview panel** (server-rendered HTML, debounced). Panel is open by default; tap the header to collapse/expand.  
  - Preview updates as you type (debounce + optional instant triggers).

- **Preview on click ON**  
  - **Split view is hidden.** No bottom preview panel.  
  - **Eye button** appears in the composer footer **next to the submit button** (both **Post Reply** and **Post Discussion**).  
  - Reply composer: Flarum’s default preview button is replaced by ours.  
  - Click eye → **full preview** (textarea hidden, only rendered HTML). Click again → back to textarea.

- **Settings**  
  - **Preview debounce (ms):** Delay before calling `POST /api/preview` (default 300).  
  - **Instant triggers:** If ON, preview is requested immediately on certain keystrokes (e.g. closing `**`, ` ``` `) as well as after debounce.  
  - **Preview on click:** See above; when ON, split view is off and eye toggles full preview.

- **Backend**  
  - `POST /api/preview`: body `{ content }` → JSON with rendered HTML (Flarum Formatter).  
  - Client uses tokenizer for template detection only; all rendering is server-side.

## How it works

- **Split view (default):** The composer body is wrapped: textarea in the top portion, a preview panel below. The panel shows server-rendered HTML; you can expand/collapse it by tapping its header.
- **Server preview**: Content is sent to `POST /api/preview` (same pipeline as Flarum’s TextFormatter: Markdown + BBCode + extensions). The extension registers this route and uses Flarum’s `Formatter` to parse and render.
- **Client tokenizer**: A small client-side tokenizer recognizes common Markdown (headings, bold, italic, code, lists, links, images, blockquotes). It is used only to detect **default toolbar templates** (e.g. `[link](https://)`, `**bold**`) and avoid rendering them until the user edits the placeholder.
- **BBCode / unknown tags**: Not parsed on the client. Full content is sent to the server; the server returns HTML. The client does not assume any BBCode extension; it relies on the server preview for unknown tags.

## Install

1. Copy the extension into your Flarum `extensions` folder (or install via Composer when published):
   ```bash
   cd /path/to/flarum
   composer require zerosonesfun/flarum-preview
   ```
   Or clone/copy into `extensions/zerosonesfun-preview`.
2. Clear cache and enable in Admin:
   ```bash
   php flarum cache:clear
   ```
   Then **Administration → Extensions → Preview → Enable**.
3. Rebuild frontend assets if your setup requires it (e.g. `php flarum build` if you use Flarum’s build pipeline).

## Build JS (for development)

From the extension directory:

```bash
npm install
npm run build
```

This produces `js/dist/forum.js` and `js/dist/admin.js`. Use `npm run dev` for watch mode.

## Admin settings

- **Preview on click (eye icon)**  
  When ON: live preview is off; users use an eye icon to toggle between raw composer and preview.
- **Preview debounce (ms)**  
  Delay before sending content to the server (default 300).
- **Instant preview triggers**  
  When ON: preview is requested immediately on certain keystrokes (e.g. closing `**` or ` ``` `) instead of only after debounce.

## Design decisions

- **Why client tokenizer + server preview?**  
  The server is the only place that knows the full TextFormatter pipeline (Markdown, BBCode, extensions). The client tokenizer is minimal and used only for template detection, not for rendering. All rendered HTML comes from the server.
- **Why not render toolbar templates until edited?**  
  Placeholders like `[link](https://)` are treated as templates; they are not shown as rendered links until the user changes the label or URL. This avoids flashing a “link” link and keeps the UX clear.

## Known edge cases

- **Very long content:**  
  Debouncing and optional instant triggers limit server calls; for very large posts, consider increasing debounce or disabling instant triggers.
- **BBCode-only content:**  
  Preview is correct (server handles it). The textarea is always the source of truth and can be edited normally.

## Troubleshooting

- **Preview stays empty or shows “Preview failed”**  
  - Ensure the extension is enabled and `php flarum cache:clear` was run.  
  - Check that `POST /api/preview` is reachable and returns JSON with HTML (e.g. `data.data.attributes.html` or `data.html`).  
  - Check browser console and network tab for 4xx/5xx or CORS/CSRF issues. Requests use `credentials: 'same-origin'`.
- **Composer not wrapped / no overlay**  
  - Ensure `js/dist/forum.js` is built and loaded.  
  - Composer is detected by wrapping textareas inside `.Composer` (or similar). If your theme changes that class, the wrapper might not attach; you may need to extend the selector in the extension.
- **Toolbar template still renders as link**  
  - Default templates are detected by exact label/URL (e.g. `link` + `https://`). If your toolbar inserts different placeholders, they may render; you can extend the template list in the tokenizer.

## License

MIT. See [LICENSE](LICENSE).

## Runbook (tests and build)

### Build JS

```bash
cd /path/to/flarum-preview
npm install
npm run build
```

Produces `js/dist/forum.js` and `js/dist/admin.js`.

### Unit tests (tokenizer + serverPreview)

```bash
npm test
```

Uses Jest with Node ESM. No Flarum instance required.

### E2E tests (Playwright)

E2E tests are **skipped by default** because they need a running Flarum forum with the extension enabled. To run them:

1. Start Flarum (e.g. `php flarum serve` or your dev URL).
2. Enable the Preview extension in Admin.
3. Set the base URL and run:

```bash
FLARUM_BASE_URL=http://localhost:8080 npm run test:e2e
```

To enable the tests (remove `test.skip`), edit `tests/e2e/preview.spec.js` and delete the `.skip` from each `test.skip(...)` so they run against your instance.

### Local install (manual test)

1. Copy the extension into your Flarum `extensions` folder:  
   `cp -r /path/to/flarum-preview /path/to/flarum/extensions/zerosonesfun-preview`
2. Clear cache: `php flarum cache:clear`
3. In Admin → Extensions, enable **Preview**.
4. Open a discussion and use Reply; the composer should show the split preview panel below the textarea.

## Repository

`zerosonesfun/flarum-preview` — [GitHub](https://github.com/zerosonesfun/flarum-preview)
