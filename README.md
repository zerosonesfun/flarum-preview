# Preview (zerosonesfun/flarum-preview) — Flarum 2.x

This is the **Flarum 2.0** compatible version of the extension. It lives in the **2.x** branch (or in the `2.0/` folder when developing). The **main** branch contains the 1.8.x version.

Live preview for the Flarum composer. **Textarea is always the source of truth** (raw Markdown/BBCode); preview is either a split panel below the editor or a full toggle via the eye button.

## Requirements

- **Flarum** ^2.0.0-beta
- **PHP** >= 8.2

## How it works

- **Default (Preview on click OFF)**  
  - Composer: top = textarea, bottom = **split preview panel** (server-rendered HTML, debounced). Panel is open by default; tap the header to collapse/expand. 
  - Drag header up to expand the preview more. 
  - Preview updates as you type (debounce + optional instant triggers).

- **Preview on click ON**  
  - **Split view is hidden.** No bottom preview panel.  
  - **Eye button** appears in the composer. 
  - Click eye → **full preview** (textarea hidden, only rendered HTML). Click again → back to textarea.

- **Settings** (registered via Flarum 2.0 Admin extender)  
  - **Preview debounce (ms):** Delay before calling `POST /api/preview` (default 300).  
  - **Instant triggers:** If ON, preview is requested immediately on certain keystrokes (e.g. closing `**`, ` ``` `) as well as after debounce.  
  - **Preview on click:** When ON, split view is off and eye toggles full preview.

- **Backend**  
  - `POST /api/preview`: body `{ content }` → JSON with rendered HTML (Flarum Formatter).  
  - Client uses tokenizer for template detection only; all rendering is server-side.

## Install (2.x branch)

When using the 2.x branch, the extension root is the repository root (the contents of the `2.0/` folder are at the top level on that branch).

1. Clone or checkout the **2.x** branch into your Flarum `extensions` folder, or install via Composer when published:
   ```bash
   composer require zerosonesfun/flarum-preview
   ```
2. Clear cache and enable in Admin:
   ```bash
   php flarum cache:clear
   ```
3. Enable **Administration → Extensions → Preview**.
4. Rebuild frontend assets if your setup requires it (e.g. `php flarum build`).

## Build JS (for development on 2.x)

From the extension root (or from the `2.0/` folder if you develop inside the monorepo):

```bash
npm install
npm run build
```

This produces `js/dist/forum.js` and `js/dist/admin.js`. Use `npm run dev` for watch mode.

## 2.0-specific changes

- **PHP 8.2**: Constructor property promotion in `RenderPreviewController`.
- **Admin settings**: Registered via the **Admin** frontend extender (`js/src/admin/extend.js`) instead of `app.extensionData`. Settings are still serialized to the forum with `Extend\Settings()->serializeToForum()`.
- **Dependencies**: `flarum/core` ^2.0.0-beta, `flarum-webpack-config` ^3.0.0, `flarum-tsconfig` ^2.0.0 in package.json.
- **No JSON:API changes**: This extension only adds a custom `POST /api/preview` route; no migration to the new API layer was required.

## License

MIT.
