import { describe, expect, it } from 'vitest';
import { matchesSearch } from './useSearch';

describe('matchesSearch', () => {
  it('returns true for an empty query', () => {
    expect(matchesSearch('anything', '')).toBe(true);
  });

  it('returns true for a whitespace-only query', () => {
    expect(matchesSearch('anything', '   ')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(matchesSearch('HelloWorld', 'hello')).toBe(true);
    expect(matchesSearch('HelloWorld', 'WORLD')).toBe(true);
  });

  it('matches a substring', () => {
    expect(matchesSearch('123456', '345')).toBe(true);
  });

  it('returns false when there is no match', () => {
    expect(matchesSearch('abc', 'xyz')).toBe(false);
  });
});
