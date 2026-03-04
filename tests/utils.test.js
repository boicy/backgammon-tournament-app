import { describe, it, expect } from 'vitest';
import { escapeHtml, formatTimestamp } from '../src/utils.js';

describe('escapeHtml', () => {
  it('escapes &', () => expect(escapeHtml('a & b')).toBe('a &amp; b'));
  it('escapes <', () => expect(escapeHtml('<script>')).toBe('&lt;script&gt;'));
  it('escapes >', () => expect(escapeHtml('a > b')).toBe('a &gt; b'));
  it('escapes "', () => expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;'));
  it('returns empty string for empty input', () => expect(escapeHtml('')).toBe(''));
  it('handles all special chars together', () => {
    expect(escapeHtml('<a href="x&y">')).toBe('&lt;a href=&quot;x&amp;y&quot;&gt;');
  });
  it('passes through plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('formatTimestamp', () => {
  it('returns a non-empty string for a valid epoch', () => {
    const result = formatTimestamp(1741046400000);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for Date.now()', () => {
    expect(formatTimestamp(Date.now()).length).toBeGreaterThan(0);
  });
});
