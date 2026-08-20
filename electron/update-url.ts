const UPDATE_ALLOWED_UPDATE_HOSTS = [process.env.UPDATE_ALLOWED_UPDATE_HOSTS, process.env.UPDATE_ALLOWED_HOSTS].filter(
  (value): value is string => Boolean(value && value.trim()),
);

export function isAllowedUpdateHost(host: string): boolean {
  return (
    UPDATE_ALLOWED_UPDATE_HOSTS.length === 0 || UPDATE_ALLOWED_UPDATE_HOSTS.some((allowed) => host.includes(allowed))
  );
}

export function isAllowedUpdateUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && isAllowedUpdateHost(parsed.host);
  } catch {
    return false;
  }
}
