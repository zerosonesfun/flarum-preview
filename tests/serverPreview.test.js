/**
 * Unit tests for server preview response parsing.
 */

import { extractHtmlFromResponse } from '../js/src/forum/serverPreview.js';

describe('extractHtmlFromResponse', () => {
  test('extracts from data.html', () => {
    expect(extractHtmlFromResponse({ html: '<p>Hi</p>' })).toBe('<p>Hi</p>');
  });

  test('extracts from data.data.attributes.html', () => {
    expect(
      extractHtmlFromResponse({
        data: { attributes: { html: '<p>From attributes</p>' } },
      })
    ).toBe('<p>From attributes</p>');
  });

  test('extracts from data.data (attributes as data)', () => {
    expect(
      extractHtmlFromResponse({
        data: { html: '<p>Direct</p>' },
      })
    ).toBe('<p>Direct</p>');
  });

  test('returns empty string for null/undefined', () => {
    expect(extractHtmlFromResponse(null)).toBe('');
    expect(extractHtmlFromResponse(undefined)).toBe('');
  });

  test('returns empty string when no html field', () => {
    expect(extractHtmlFromResponse({})).toBe('');
    expect(extractHtmlFromResponse({ data: {} })).toBe('');
  });
});
