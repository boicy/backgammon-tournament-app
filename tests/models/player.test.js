import { describe, it, expect } from 'vitest';
import { createPlayer, validatePlayerName } from '../../src/models/player.js';

describe('validatePlayerName', () => {
  it('accepts a valid name', () => {
    expect(() => validatePlayerName('Alice', [])).not.toThrow();
  });

  it('throws on empty string', () => {
    expect(() => validatePlayerName('', [])).toThrow('required');
  });

  it('throws on whitespace-only name', () => {
    expect(() => validatePlayerName('   ', [])).toThrow('required');
  });

  it('throws on name exceeding 50 characters', () => {
    expect(() => validatePlayerName('A'.repeat(51), [])).toThrow('50');
  });

  it('accepts a name at exactly 50 characters', () => {
    expect(() => validatePlayerName('A'.repeat(50), [])).not.toThrow();
  });

  it('throws on duplicate name (same case)', () => {
    const existing = [{ id: '1', name: 'Alice' }];
    expect(() => validatePlayerName('Alice', existing)).toThrow('already exists');
  });

  it('throws on duplicate name (different case)', () => {
    const existing = [{ id: '1', name: 'alice' }];
    expect(() => validatePlayerName('ALICE', existing)).toThrow('already exists');
  });

  it('does not throw when name is unique', () => {
    const existing = [{ id: '1', name: 'Alice' }];
    expect(() => validatePlayerName('Bob', existing)).not.toThrow();
  });
});

describe('createPlayer', () => {
  it('returns a player object with id and trimmed name', () => {
    const player = createPlayer('  Alice  ', []);
    expect(player.id).toBeTruthy();
    expect(player.name).toBe('Alice');
  });

  it('throws for invalid name', () => {
    expect(() => createPlayer('', [])).toThrow();
  });
});
