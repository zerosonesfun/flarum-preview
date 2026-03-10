import app from 'flarum/forum/app';

/**
 * Server preview client: POST /api/preview with content, return rendered HTML.
 * Handles multiple response shapes (data.html, data.data.attributes.html).
 * Debouncing is applied by the caller (previewLayer).
 */

const PREVIEW_URL = '/api/preview';

/**
 * Extract HTML from preview API response. Flarum and extensions may return different shapes.
 * @param {object} data - Parsed JSON body
 * @returns {string} HTML string or empty on failure
 */
export function extractHtmlFromResponse(data) {
  if (!data) return '';
  if (typeof data.html === 'string') return data.html;
  if (data.data && typeof data.data === 'object') {
    const attrs = data.data.attributes || data.data;
    if (typeof attrs.html === 'string') return attrs.html;
  }
  return '';
}

/**
 * Request preview HTML from the server.
 * @param {string} content - Raw markdown/BBCode
 * @param {object} options - { credentials: 'same-origin', signal?: AbortSignal }
 * @returns {Promise<string>} Rendered HTML
 */
export async function fetchPreview(content, options = {}) {
  const { credentials = 'same-origin', signal } = options;
  const res = await fetch(PREVIEW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
      ...(app.session && app.session.csrfToken ? { 'X-CSRF-Token': app.session.csrfToken() } : {}),
    },
    body: JSON.stringify({ content: content || '' }),
    credentials,
    signal,
  });
  if (!res.ok) {
    const err = new Error(`Preview failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const html = extractHtmlFromResponse(data);
  return html;
}
