export const ARCHIVE_EXTENSION = '.astropak';

export interface StoredArchiveFileContent {
  base64: string;
}

export function sanitizeFileName(value: string): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');

  return cleaned || '存档';
}

export function formatArchiveStamp(date: Date): string {
  const yy = String(date.getFullYear() % 100).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');

  return `${yy}${mm}${dd}${hh}${mi}${ss}${ms}`;
}

export function buildArchiveSuffix(date = new Date()): string {
  return `_${formatArchiveStamp(date)}`;
}

export function buildArchiveFilename(displayName: string, suffix: string): string {
  return `${sanitizeFileName(displayName)}${suffix}${ARCHIVE_EXTENSION}`;
}

export function parseArchiveFilename(filename: string): { displayName: string; suffix: string } {
  const match = filename.match(/^(.*?)(_\d{15})\.astropak$/u);

  if (match) {
    return {
      displayName: match[1],
      suffix: match[2],
    };
  }

  return {
    displayName: filename.replace(/\.astropak$/u, ''),
    suffix: '',
  };
}

export function encodeArchiveContent(content: Buffer): StoredArchiveFileContent {
  return { base64: content.toString('base64') };
}

export function decodeArchiveContent(content: StoredArchiveFileContent | string | undefined): Buffer {
  if (!content) {
    return Buffer.from('');
  }

  if (typeof content === 'string') {
    return Buffer.from(content, 'utf8');
  }

  return Buffer.from(content.base64, 'base64');
}

export function normaliseServerSyncContent(existing: StoredArchiveFileContent | string | undefined): Buffer {
  const content = decodeArchiveContent(existing);
  const text = content.toString('utf8');

  if (!text || !text.trim()) {
    return Buffer.from('serverdata = [ "Unchecked" ]\n', 'utf8');
  }

  if (/serverdata\s*=/i.test(text)) {
    return Buffer.from(text.replace(/serverdata\s*=.*$/gimu, 'serverdata = [ "Unchecked" ]'), 'utf8');
  }

  return Buffer.from(`${text.trimEnd()}\nserverdata = [ "Unchecked" ]\n`, 'utf8');
}
