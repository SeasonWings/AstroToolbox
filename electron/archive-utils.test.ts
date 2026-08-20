import { describe, expect, it } from 'vitest';
import {
  buildArchiveFilename,
  decodeArchiveContent,
  encodeArchiveContent,
  normaliseServerSyncContent,
  parseArchiveFilename,
  sanitizeFileName,
} from './archive-utils';

describe('sanitizeFileName', () => {
  it('replaces path and control characters', () => {
    expect(sanitizeFileName('角色: 主号?')).toBe('角色_ 主号_');
    expect(sanitizeFileName('a\u0000b\u001fc')).toBe('a_b_c');
  });

  it('falls back to a default name', () => {
    expect(sanitizeFileName('   ')).toBe('存档');
  });
});

describe('archive filename helpers', () => {
  it('builds a filename with suffix', () => {
    expect(buildArchiveFilename('角色: 主号?', '_stamp')).toBe('角色_ 主号__stamp.astropak');
  });

  it('parses a stamped filename', () => {
    expect(parseArchiveFilename('MyRole_250101120000000.astropak')).toEqual({
      displayName: 'MyRole',
      suffix: '_250101120000000',
    });
  });

  it('parses a filename without a stamp', () => {
    expect(parseArchiveFilename('MyRole.astropak')).toEqual({
      displayName: 'MyRole',
      suffix: '',
    });
  });
});

describe('server sync normalization', () => {
  it('returns the default unchecked value when empty', () => {
    expect(normaliseServerSyncContent(undefined).toString('utf8')).toBe('serverdata = [ "Unchecked" ]\n');
  });

  it('replaces an existing serverdata line', () => {
    expect(normaliseServerSyncContent('foo=1\nserverdata = [ "Checked" ]').toString('utf8')).toBe(
      'foo=1\nserverdata = [ "Unchecked" ]',
    );
  });

  it('appends serverdata when missing', () => {
    expect(normaliseServerSyncContent('foo=1').toString('utf8')).toBe('foo=1\nserverdata = [ "Unchecked" ]\n');
  });
});

describe('archive content encoding', () => {
  it('round-trips a buffer', () => {
    const original = Buffer.from('hello', 'utf8');
    expect(decodeArchiveContent(encodeArchiveContent(original)).toString('utf8')).toBe('hello');
  });

  it('decodes legacy string content', () => {
    expect(decodeArchiveContent('legacy').toString('utf8')).toBe('legacy');
  });
});
