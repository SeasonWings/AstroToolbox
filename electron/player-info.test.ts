import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolvePlayerInfoDirectory } from './player-info';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'astro-toolbox-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('resolvePlayerInfoDirectory', () => {
  it('resolves the PlayerInfo subdirectory', async () => {
    const base = await makeTempDir();
    const playerInfo = path.join(base, 'PlayerInfo');
    await mkdir(playerInfo, { recursive: true });

    expect(resolvePlayerInfoDirectory(base)).toBe(playerInfo);
  });

  it('returns empty when PlayerInfo does not exist', async () => {
    const base = await makeTempDir();
    expect(resolvePlayerInfoDirectory(base)).toBe('');
  });

  it('accepts a PlayerInfo directory directly', async () => {
    const playerInfo = path.join(await makeTempDir(), 'PlayerInfo');
    await mkdir(playerInfo, { recursive: true });

    expect(resolvePlayerInfoDirectory(playerInfo)).toBe(playerInfo);
  });
});
