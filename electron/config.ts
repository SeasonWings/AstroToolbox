import { app } from 'electron';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ToolboxBootstrap } from '../shared/index';
import { detectSavePaths, getWindowsLocalAppData } from './paths';

export const CONFIG_FILE_NAME = 'toolbox-config.json';
export const UID_MAPPING_API_BASE = process.env.UID_MAPPING_API_BASE || 'https://astro-api.mapleshuzuko.site';

export interface StoredConfig {
  savePath?: string;
  autoUpdateEnabled?: boolean;
  updateChannel?: string;
  skippedUpdateVersion?: string | null;
}

export interface UpdatePreferencesPayload {
  autoUpdateEnabled: boolean;
  updateChannel: string;
  skippedUpdateVersion?: string | null;
}

export function getUserRoot(): string {
  return app.getPath('userData');
}

export function getLegacyUserRoot(): string {
  return app.isPackaged ? path.join(process.resourcesPath, 'user') : path.join(app.getAppPath(), 'user');
}

export function getConfigPath(): string {
  return path.join(getUserRoot(), CONFIG_FILE_NAME);
}

export function getBackupDirectory(): string {
  return path.join(getUserRoot(), 'saved');
}

export function getAppCacheDir(): string {
  const homedir = os.homedir();

  if (process.platform === 'win32') {
    return getWindowsLocalAppData();
  }

  if (process.platform === 'darwin') {
    return path.join(homedir, 'Library', 'Caches');
  }

  return process.env.XDG_CACHE_HOME || path.join(homedir, '.cache');
}

export function getUpdateDownloadDirectory(): string {
  return path.join(getAppCacheDir(), 'astro-toolbox-updater');
}

export function resolveUpdateDownloadDirectory(): string | null {
  const directory = getUpdateDownloadDirectory();
  return existsSync(directory) ? directory : null;
}

export async function ensureDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const text = await readFile(filePath, 'utf8');
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function readConfig(): Promise<StoredConfig | null> {
  return readJsonFile<StoredConfig>(getConfigPath());
}

export async function writeConfig(value: StoredConfig): Promise<void> {
  await writeJsonFile(getConfigPath(), value);
}

export async function migrateLegacyUserData(): Promise<void> {
  const legacyRoot = getLegacyUserRoot();
  const currentRoot = getUserRoot();

  if (legacyRoot === currentRoot || !existsSync(legacyRoot)) {
    return;
  }

  await ensureDirectory(currentRoot);

  const legacyConfigPath = path.join(legacyRoot, CONFIG_FILE_NAME);
  const currentConfigPath = getConfigPath();
  if (!existsSync(currentConfigPath) && existsSync(legacyConfigPath)) {
    await mkdir(path.dirname(currentConfigPath), { recursive: true });
    await rename(legacyConfigPath, currentConfigPath);
  }

  const legacyBackupDirectory = path.join(legacyRoot, 'saved');
  const currentBackupDirectory = getBackupDirectory();
  if (!existsSync(currentBackupDirectory) && existsSync(legacyBackupDirectory)) {
    await mkdir(path.dirname(currentBackupDirectory), { recursive: true });
    await rename(legacyBackupDirectory, currentBackupDirectory);
  }
}

export async function resolveBootstrap(): Promise<ToolboxBootstrap> {
  const config = await readConfig();
  const detectedSavePaths = detectSavePaths();
  const hasStandard = detectedSavePaths.some((item) => item.client === 'standard');
  const hasSpeed = detectedSavePaths.some((item) => item.client === 'speed');
  const requiresSavePathChoice = !config?.savePath?.trim() && hasStandard && hasSpeed;
  const autoDetectedPath = requiresSavePathChoice ? '' : (detectedSavePaths[0]?.savePath ?? '');
  const savePath = config?.savePath?.trim() || autoDetectedPath;

  return {
    savePath,
    autoDetectedPath,
    savePathExists: Boolean(savePath && existsSync(savePath)),
    autoDetectedExists: Boolean(autoDetectedPath && existsSync(autoDetectedPath)),
    detectedSavePaths,
    requiresSavePathChoice,
    configFilePath: getConfigPath(),
    backupDirectory: getBackupDirectory(),
    autoUpdateEnabled: config?.autoUpdateEnabled ?? true,
    updateChannel: config?.updateChannel ?? 'stable',
    skippedUpdateVersion: config?.skippedUpdateVersion ?? null,
  };
}

export async function setSavePath(savePath: string): Promise<ToolboxBootstrap> {
  const config = await readConfig();
  await writeConfig({
    savePath,
    autoUpdateEnabled: config?.autoUpdateEnabled ?? true,
    updateChannel: config?.updateChannel ?? 'stable',
    skippedUpdateVersion: config?.skippedUpdateVersion ?? null,
  });
  return resolveBootstrap();
}

export async function setUpdatePreferences(payload: UpdatePreferencesPayload): Promise<ToolboxBootstrap> {
  const config = await readConfig();
  await writeConfig({
    savePath: config?.savePath,
    autoUpdateEnabled: payload.autoUpdateEnabled,
    updateChannel: payload.updateChannel,
    skippedUpdateVersion: payload.skippedUpdateVersion ?? null,
  });
  return resolveBootstrap();
}
