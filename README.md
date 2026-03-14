# Preview (zerosonesfun/flarum-preview)

Live preview for the Flarum composer. **Textarea is always the source of truth** (raw Markdown/BBCode); preview is either a split panel below the editor or a full toggle via the eye button.

## How it works

- **Default (Preview on click OFF)**  
  - Composer: top = textarea, bottom = **split preview panel** (server-rendered HTML, debounced). Panel is open by default; tap the header to collapse/expand. 
  - Drag header up to expand the preview more. 
  - Preview updates as you type (debounce + optional instant triggers).

- **Preview on click ON**  
  - **Split view is hidden.** No bottom preview panel.  
  - **Eye button** appears in the composer. 
  - Reply composer: Flarum’s default preview button is replaced by this one. 
  - Click eye → **full preview** (textarea hidden, only rendered HTML). Click again → back to textarea.

- **Settings**  
  - **Preview debounce (ms):** Delay before calling `POST /api/preview` (default 300).  
  - **Instant triggers:** If ON, preview is requested immediately on certain keystrokes (e.g. closing `**`, ` ``` `) as well as after debounce.  
  - **Preview on click:** See above; when ON, split view is off and eye toggles full preview.

- **Backend**  
  - `POST /api/preview`: body `{ content }` → JSON with rendered HTML (Flarum Formatter).  
  - Client uses tokenizer for template detection only; all rendering is server-side.

## Developer Notes

- **Split view (default):** The composer body is wrapped: textarea in the top portion, a preview panel below. The panel shows server-rendered HTML; you can expand/collapse it by tapping its header.
- **Server preview**: Content is sent to `POST /api/preview` (same pipeline as Flarum’s TextFormatter: Markdown + BBCode + extensions). The extension registers this route and uses Flarum’s `Formatter` to parse and render.
- **Client tokenizer**: A small client-side tokenizer recognizes common Markdown (headings, bold, italic, code, lists, links, images, blockquotes). It is used only to detect **default toolbar templates** (e.g. `[link](https://)`, `**bold**`) and avoid rendering them until the user edits the placeholder.

## Install

1. Copy the extension into your Flarum `extensions` folder (or install via Composer when published):
   ```bash
   cd /path/to/flarum
   composer require zerosonesfun/flarum-preview:^1.0
   ```
   Or for Flarum 2.0:
      ```bash
   cd /path/to/flarum
   composer require zerosonesfun/flarum-preview:^2.0
   ```
2. Clear cache and enable in Admin:
   ```bash
   php flarum cache:clear
   ```
   Then **Administration → Extensions → Preview → Enable**.
3. Rebuild frontend assets if your setup requires it (e.g. `php flarum build` if you use Flarum’s build pipeline).

## Update/Remove
   ```bash
   composer update zerosonesfun/flarum-preview
   ```
   ```bash
   composer remove zerosonesfun/flarum-preview
   ```

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

## Repository

`zerosonesfun/flarum-preview` — [GitHub](https://github.com/zerosonesfun/flarum-preview)
