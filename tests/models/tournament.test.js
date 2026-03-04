import { describe, it, expect } from 'vitest';
import { createTournament } from '../../src/models/tournament.js';

describe('createTournament', () => {
  it('returns an object with a UUID id', () => {
    const t = createTournament('Friday Night');
    expect(t.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('trims the name', () => {
    const t = createTournament('  Friday Night  ');
    expect(t.name).toBe('Friday Night');
  });

  it('sets status to active', () => {
    expect(createTournament('Test').status).toBe('active');
  });

  it('sets a date string', () => {
    const t = createTournament('Test');
    expect(typeof t.date).toBe('string');
    expect(t.date).toBeTruthy();
  });

  it('throws on empty name', () => {
    expect(() => createTournament('')).toThrow();
    expect(() => createTournament('   ')).toThrow();
  });
});
