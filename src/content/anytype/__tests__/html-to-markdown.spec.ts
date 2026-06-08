import { describe, expect, it } from 'vitest';

import { htmlToMarkdown } from '../html-to-markdown';

describe('htmlToMarkdown', () => {
  it('returns plain text unchanged', () => {
    expect(htmlToMarkdown('plain text')).toBe('plain text');
  });

  it('converts a paragraph', () => {
    expect(htmlToMarkdown('<p>Hello world</p>')).toBe('Hello world');
  });

  it('converts two paragraphs with a blank line', () => {
    expect(htmlToMarkdown('<p>a</p><p>b</p>')).toBe('a\n\nb');
  });

  it('converts bold and italic', () => {
    expect(
      htmlToMarkdown('<p>Hello <strong>bold</strong> <em>it</em></p>'),
    ).toBe('Hello **bold** *it*');
  });

  it('converts links', () => {
    expect(htmlToMarkdown('<p>See <a href="https://x.com">link</a></p>')).toBe(
      'See [link](https://x.com)',
    );
  });

  it('converts headings', () => {
    expect(htmlToMarkdown('<h1>Title</h1><p>Body</p>')).toBe('# Title\n\nBody');
  });

  it('converts unordered lists', () => {
    expect(htmlToMarkdown('<ul><li>a</li><li>b</li></ul>')).toBe('- a\n- b');
  });

  it('converts ordered lists', () => {
    expect(htmlToMarkdown('<ol><li>a</li><li>b</li></ol>')).toBe('1. a\n2. b');
  });

  it('converts blockquotes', () => {
    expect(htmlToMarkdown('<blockquote>quote</blockquote>')).toBe('> quote');
  });

  it('falls back to text content for unknown elements', () => {
    expect(htmlToMarkdown('<div><span>x</span></div>')).toBe('x');
  });
});
