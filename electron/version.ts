export function normalizeVersion(value: string): string {
  return value.trim().replace(/^v/i, '');
}
