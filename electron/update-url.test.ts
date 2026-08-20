import { describe, expect, it } from 'vitest';
import { isAllowedUpdateHost, isAllowedUpdateUrl } from './update-url';

describe('isAllowedUpdateUrl', () => {
  it('rejects non-https urls', () => {
    expect(isAllowedUpdateUrl('http://example.com/x')).toBe(false);
  });

  it('accepts https urls when no allowlist is configured', () => {
    expect(isAllowedUpdateUrl('https://example.com/x')).toBe(true);
  });

  it('rejects invalid urls', () => {
    expect(isAllowedUpdateUrl('not-a-url')).toBe(false);
  });
});

describe('isAllowedUpdateHost', () => {
  it('allows any host when no allowlist is configured', () => {
    expect(isAllowedUpdateHost('example.com')).toBe(true);
  });
});
