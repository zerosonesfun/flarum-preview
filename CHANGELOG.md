# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Live preview overlay for the Flarum composer (mirror-overlay approach).
- Textarea remains single source of truth; preview is a visual projection only.
- Server preview via POST `/api/preview` with debouncing (configurable, default 300ms).
- Client-side tokenizer for common Markdown (headings, bold, italic, code, lists, links, images, blockquotes).
- Token mapping for click-to-edit: click rendered link/element to focus textarea and select the raw markdown range.
- Template detection: toolbar inserts like `[link](https://)` are not rendered until the user edits them.
- Cursor-inside rule: do not render a token when the caret is inside its range.
- Admin settings: debounce timeout, "hide raw" vs "dim raw", instant triggers toggle.
- Alternative mode: "Preview on click" — turn off live preview and use an eye icon to toggle preview vs raw in composer.
- Scroll sync between textarea and preview layer.
- Optional active-block highlight.
- Accessibility: aria attributes, keyboard focus, screen reader support for textarea.
- Graceful degradation when `/api/preview` fails (show escaped markdown, log error, do not block typing/submit).
- Unit tests for tokenizer (Node + Jest).
- E2E tests (Playwright) for composer preview, toolbar templates, link click-to-edit, submit behavior.

## [1.0.0] - 2025-03-10

- Initial release.
