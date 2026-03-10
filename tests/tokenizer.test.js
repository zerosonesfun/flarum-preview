/**
 * Unit tests for the client-side Markdown tokenizer.
 * Run: npm test
 */

import { tokenize, cursorInsideToken, getTokenAtPosition, isTemplateToken, TOKEN_TYPES } from '../js/src/forum/tokenizer.js';

describe('tokenize', () => {
  test('returns empty array for empty or non-string input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(null)).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
  });

  test('tokenizes link [text](url)', () => {
    const tokens = tokenize('see [example](https://example.com) here');
    const link = tokens.find((t) => t.type === TOKEN_TYPES.LINK);
    expect(link).toBeDefined();
    expect(link.start).toBe(4);
    expect(link.end).toBe(34); // exclusive end (one past last char)
    expect(link.label).toBe('example');
    expect(link.url).toBe('https://example.com');
  });

  test('tokenizes multiple links', () => {
    const tokens = tokenize('a [one](https://1.com) b [two](https://2.com) c');
    const links = tokens.filter((t) => t.type === TOKEN_TYPES.LINK);
    expect(links).toHaveLength(2);
    expect(links[0].label).toBe('one');
    expect(links[1].label).toBe('two');
  });

  test('detects default link template [link](https://)', () => {
    const tokens = tokenize('insert [link](https://) here');
    const link = tokens.find((t) => t.type === TOKEN_TYPES.LINK);
    expect(link).toBeDefined();
    expect(link.template).toBe(true);
  });

  test('detects default image template ![image](https://)', () => {
    const tokens = tokenize('pic: ![image](https://)');
    const img = tokens.find((t) => t.type === TOKEN_TYPES.IMAGE);
    expect(img).toBeDefined();
    expect(img.template).toBe(true);
  });

  test('edited link is not template', () => {
    const tokens = tokenize('see [my link](https://example.com) here');
    const link = tokens.find((t) => t.type === TOKEN_TYPES.LINK);
    expect(link.template).toBe(false);
  });

  test('tokenizes image ![alt](url)', () => {
    const tokens = tokenize('![logo](https://site.com/logo.png)');
    const img = tokens.find((t) => t.type === TOKEN_TYPES.IMAGE);
    expect(img).toBeDefined();
    expect(img.label).toBe('logo');
    expect(img.url).toBe('https://site.com/logo.png');
  });

  test('tokenizes bold **text**', () => {
    const tokens = tokenize('hello **bold** world');
    const bold = tokens.find((t) => t.type === TOKEN_TYPES.BOLD);
    expect(bold).toBeDefined();
    expect(bold.start).toBe(6);
    expect(bold.end).toBe(14); // exclusive: "**bold**" is 8 chars, 6+8=14
  });

  test('detects **bold** template', () => {
    const tokens = tokenize('**bold**');
    const bold = tokens.find((t) => t.type === TOKEN_TYPES.BOLD);
    expect(bold).toBeDefined();
    expect(bold.template).toBe(true);
  });

  test('tokenizes italic *text*', () => {
    const tokens = tokenize('say *italic* here');
    const italic = tokens.find((t) => t.type === TOKEN_TYPES.ITALIC);
    expect(italic).toBeDefined();
    expect(italic.raw).toBe('*italic*');
  });

  test('tokenizes inline code', () => {
    const tokens = tokenize('use `code` here');
    const code = tokens.find((t) => t.type === TOKEN_TYPES.CODE_INLINE);
    expect(code).toBeDefined();
    expect(code.raw).toBe('`code`');
  });

  test('tokenizes headings', () => {
    const tokens = tokenize('# H1\n## H2\n### H3');
    const headings = tokens.filter((t) => t.type === TOKEN_TYPES.HEADING);
    expect(headings).toHaveLength(3);
    expect(headings[0].raw).toMatch(/^# /);
    expect(headings[1].raw).toMatch(/^## /);
    expect(headings[2].raw).toMatch(/^### /);
  });

  test('tokenizes blockquote', () => {
    const tokens = tokenize('> quote line 1\n> quote line 2');
    const bq = tokens.find((t) => t.type === TOKEN_TYPES.BLOCKQUOTE);
    expect(bq).toBeDefined();
    expect(bq.raw).toContain('>');
  });

  test('tokenizes fenced code block', () => {
    const text = '```js\nconst x = 1;\n```';
    const tokens = tokenize(text);
    const code = tokens.find((t) => t.type === TOKEN_TYPES.CODE_FENCED);
    expect(code).toBeDefined();
    expect(code.raw).toContain('```');
  });

  test('tokenizes unordered list', () => {
    const tokens = tokenize('- item 1\n- item 2');
    const list = tokens.find((t) => t.type === TOKEN_TYPES.LIST_UL);
    expect(list).toBeDefined();
  });

  test('tokenizes ordered list', () => {
    const tokens = tokenize('1. first\n2. second');
    const list = tokens.find((t) => t.type === TOKEN_TYPES.LIST_OL);
    expect(list).toBeDefined();
  });

  test('link at start of buffer', () => {
    const tokens = tokenize('[start](https://x.com) rest');
    const link = tokens.find((t) => t.type === TOKEN_TYPES.LINK);
    expect(link.start).toBe(0);
    expect(link.end).toBe(22); // "[start](https://x.com)" length 22
  });

  test('link at end of buffer', () => {
    const tokens = tokenize('rest [end](https://y.com)');
    const link = tokens.find((t) => t.type === TOKEN_TYPES.LINK);
    expect(link.start).toBe(5);
    expect(link.end).toBe(25); // 5 + "[end](https://y.com)".length
  });
});

describe('cursorInsideToken', () => {
  test('returns true when position is inside a token (end is exclusive)', () => {
    const tokens = tokenize('see [link](https://x.com) here');
    const link = tokens.find((t) => t.type === TOKEN_TYPES.LINK);
    expect(cursorInsideToken(link.start, tokens)).toBe(true);
    expect(cursorInsideToken(link.start + 5, tokens)).toBe(true);
    expect(cursorInsideToken(link.end - 1, tokens)).toBe(true);
    expect(cursorInsideToken(link.end, tokens)).toBe(false);
  });

  test('returns false when position is outside all tokens', () => {
    const tokens = tokenize('see [link](https://x.com) here');
    expect(cursorInsideToken(0, tokens)).toBe(false);
    expect(cursorInsideToken(100, tokens)).toBe(false);
  });
});

describe('getTokenAtPosition', () => {
  test('returns token that contains position', () => {
    const tokens = tokenize('a [link](https://x.com) b');
    const link = tokens.find((t) => t.type === TOKEN_TYPES.LINK);
    expect(getTokenAtPosition(link.start + 2, tokens)).toEqual(link);
  });

  test('returns null when no token contains position', () => {
    const tokens = tokenize('plain text');
    expect(getTokenAtPosition(3, tokens)).toBeNull();
  });
});

describe('isTemplateToken', () => {
  test('returns true for template link', () => {
    const tokens = tokenize('[link](https://)');
    const link = tokens.find((t) => t.type === TOKEN_TYPES.LINK);
    expect(isTemplateToken(link)).toBe(true);
  });

  test('returns false for edited link', () => {
    const tokens = tokenize('[my link](https://example.com)');
    const link = tokens.find((t) => t.type === TOKEN_TYPES.LINK);
    expect(isTemplateToken(link)).toBe(false);
  });
});
