import { existsSync } from 'node:fs';
import path from 'node:path';

export function resolvePlayerInfoDirectory(savePath: string): string {
  if (!savePath) {
    return '';
  }

  const resolved =
    path.basename(savePath).toLowerCase() === 'playerinfo' ? savePath : path.join(savePath, 'PlayerInfo');

  return existsSync(resolved) ? resolved : '';
}
