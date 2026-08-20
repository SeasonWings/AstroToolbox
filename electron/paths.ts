import { app } from 'electron';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DetectedSavePath, SaveClientType } from '../shared/index';

export type SavePathCandidate = {
  client: SaveClientType;
  savePath: string;
};

export function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of paths) {
    const normalized = path.resolve(item).toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(item);
  }

  return result;
}

export function getWindowsLocalAppData(): string {
  return process.env.LOCALAPPDATA || path.join(app.getPath('appData'), '..', 'Local');
}

export function getWindowsHomeCandidates(): string[] {
  return uniquePaths([app.getPath('home'), process.env.USERPROFILE || '', os.homedir()].filter(Boolean));
}

export function candidateSavePaths(): SavePathCandidate[] {
  if (process.platform === 'win32') {
    const localAppData = getWindowsLocalAppData();
    const homeCandidates = getWindowsHomeCandidates();

    return [
      { client: 'standard', savePath: path.join(app.getPath('documents'), 'ZhuxianClient', 'Saved') },
      ...homeCandidates.map((home) => ({
        client: 'standard' as const,
        savePath: path.join(home, 'Saved Games', 'ZhuxianClient', 'Saved'),
      })),
      { client: 'standard', savePath: path.join(localAppData, 'ZhuxianClient', 'Saved') },
      ...homeCandidates.map((home) => ({
        client: 'standard' as const,
        savePath: path.join(home, 'ZhuxianClient', 'Saved'),
      })),
      { client: 'speed', savePath: path.join(localAppData, 'ZhuxianClient_Speed', 'Saved') },
    ];
  }

  const home = os.homedir();

  return [
    { client: 'standard', savePath: path.join(home, 'Documents', 'ZhuxianClient', 'Saved') },
    { client: 'standard', savePath: path.join(home, 'Saved Games', 'ZhuxianClient', 'Saved') },
    { client: 'standard', savePath: path.join(home, 'AppData', 'Local', 'ZhuxianClient', 'Saved') },
    { client: 'standard', savePath: path.join(home, 'ZhuxianClient', 'Saved') },
    { client: 'speed', savePath: path.join(home, 'AppData', 'Local', 'ZhuxianClient_Speed', 'Saved') },
  ];
}

export function detectSavePaths(): DetectedSavePath[] {
  const foundByClient = new Map<SaveClientType, DetectedSavePath>();

  for (const candidate of candidateSavePaths()) {
    if (!existsSync(candidate.savePath)) {
      continue;
    }

    const playerInfoPath = path.join(candidate.savePath, 'PlayerInfo');
    if (!existsSync(playerInfoPath)) {
      continue;
    }

    if (foundByClient.has(candidate.client)) {
      continue;
    }

    foundByClient.set(candidate.client, {
      client: candidate.client,
      savePath: candidate.savePath,
      playerInfoPath,
    });
  }

  return ['standard', 'speed']
    .map((client) => foundByClient.get(client as SaveClientType))
    .filter((item): item is DetectedSavePath => Boolean(item));
}

export function normalisePathForCompare(value: string): string {
  return path.resolve(value).toLowerCase();
}

export function inferSaveClientFromRolePath(rolePath: string): SaveClientType {
  const resolvedRolePath = normalisePathForCompare(rolePath);
  const detectedPath = detectSavePaths().find((item) =>
    resolvedRolePath.startsWith(`${normalisePathForCompare(item.playerInfoPath)}${path.sep.toLowerCase()}`),
  );

  if (detectedPath) {
    return detectedPath.client;
  }

  return resolvedRolePath.split(/[\\/]+/u).includes('zhuxianclient_speed') ? 'speed' : 'standard';
}
