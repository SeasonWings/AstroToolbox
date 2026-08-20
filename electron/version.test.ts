import { describe, expect, it } from 'vitest';
import { normalizeVersion } from './version';

describe('normalizeVersion', () => {
  it('strips a leading v', () => {
    expect(normalizeVersion('v1.2.3')).toBe('1.2.3');
  });

  it('trims whitespace', () => {
    expect(normalizeVersion(' 1.2.3 ')).toBe('1.2.3');
  });

  it('leaves plain versions unchanged', () => {
    expect(normalizeVersion('1.2.3')).toBe('1.2.3');
  });
});
