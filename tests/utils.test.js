import { describe, it, expect } from 'vitest';
import { escapeHtml, formatTimestamp, generateTournamentName } from '../src/utils.js';

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

describe('generateTournamentName', () => {
  it('zero-pads single-digit hours (09:05)', () => {
    const date = new Date(2026, 2, 7, 9, 5); // Mar 7 2026, 09:05 local
    expect(generateTournamentName(date)).toBe('09:05. Saturday, Mar 7, 2026');
  });

  it('formats 24-hour time correctly (14:30)', () => {
    const date = new Date(2026, 2, 7, 14, 30);
    expect(generateTournamentName(date)).toBe('14:30. Saturday, Mar 7, 2026');
  });

  it('formats midnight as 00:00 not 24:00', () => {
    const date = new Date(2026, 11, 1, 0, 0); // Dec 1 2026, Tuesday
    expect(generateTournamentName(date)).toBe('00:00. Tuesday, Dec 1, 2026');
  });

  it('does not zero-pad single-digit day of month', () => {
    const date = new Date(2026, 2, 7, 9, 5);
    const result = generateTournamentName(date);
    expect(result).toContain('Mar 7,');
    expect(result).not.toContain('Mar 07');
  });

  it('uses English weekday names', () => {
    const date = new Date(2026, 2, 7, 9, 5); // Saturday
    expect(generateTournamentName(date)).toContain('Saturday');
  });

  it('uses English abbreviated month names', () => {
    const date = new Date(2026, 2, 7, 9, 5); // March → Mar
    expect(generateTournamentName(date)).toContain('Mar');
  });

  it('assembles full format correctly for 23:59 on Jan 14 2026', () => {
    const date = new Date(2026, 0, 14, 23, 59); // Wednesday
    expect(generateTournamentName(date)).toBe('23:59. Wednesday, Jan 14, 2026');
  });

  it('returns a string matching the full format pattern when called with no argument', () => {
    const result = generateTournamentName();
    expect(result).toMatch(/^\d{2}:\d{2}\. \w+, \w+ \d+, \d{4}$/);
  });
});
