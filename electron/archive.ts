import { existsSync } from 'node:fs';
import { readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  REQUIRED_SETTING_FILES,
  SERVER_SYNC_FILE,
  type BackupPackageInfo,
  type CreateBackupPayload,
  type DeleteBackupPayload,
  type RenameBackupPayload,
  type SettingKey,
} from '../shared/index';
import {
  ARCHIVE_EXTENSION,
  buildArchiveFilename,
  buildArchiveSuffix,
  decodeArchiveContent,
  encodeArchiveContent,
  normaliseServerSyncContent,
  parseArchiveFilename,
  sanitizeFileName,
  type StoredArchiveFileContent,
} from './archive-utils';
import { ensureDirectory, getBackupDirectory, readJsonFile, writeJsonFile } from './config';
import { getRoleSettingFilenames, resolveExistingRoleSettingFile, resolveWritableRoleSettingFilename } from './roles';

export interface StoredArchive {
  version: 1;
  displayName: string;
  suffix: string;
  createdAt: string;
  rolePath: string;
  settings: SettingKey[];
  files: Partial<Record<SettingKey, StoredArchiveFileContent | string>>;
  serverSync?: StoredArchiveFileContent | string;
}

export function getArchivePath(filename: string): string {
  return path.join(getBackupDirectory(), filename);
}

export async function readArchive(filePath: string): Promise<StoredArchive | null> {
  return readJsonFile<StoredArchive>(filePath);
}

export async function listPackagesFromDisk(): Promise<BackupPackageInfo[]> {
  const directory = getBackupDirectory();

  if (!existsSync(directory)) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const packages = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(ARCHIVE_EXTENSION))
      .map(async (entry) => {
        const fullPath = path.join(directory, entry.name);
        const stats = await stat(fullPath);
        const archive = await readArchive(fullPath);
        const fallback = parseArchiveFilename(entry.name);

        return {
          filename: entry.name,
          displayName: archive?.displayName ?? fallback.displayName,
          suffix: archive?.suffix ?? fallback.suffix,
          fullPath,
          createdAt: archive?.createdAt ?? stats.mtime.toISOString(),
          size: stats.size,
          settings: archive?.settings ?? [],
        } satisfies BackupPackageInfo;
      }),
  );

  return packages.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getArchiveOrThrow(filename: string): Promise<{ archive: StoredArchive; fullPath: string }> {
  const fullPath = getArchivePath(filename);
  const archive = await readArchive(fullPath);

  if (!archive) {
    throw new Error('无法读取存档内容。');
  }

  return { archive, fullPath };
}

export async function createBackupFromRole(payload: CreateBackupPayload): Promise<BackupPackageInfo> {
  const rolePath = payload.rolePath.trim();

  if (!existsSync(rolePath)) {
    throw new Error('角色目录不存在。');
  }

  await ensureDirectory(getBackupDirectory());

  const files: Partial<Record<SettingKey, StoredArchiveFileContent>> = {};
  const settings: SettingKey[] = [];

  for (const settingKey of Object.keys(REQUIRED_SETTING_FILES) as SettingKey[]) {
    const settingFile = resolveExistingRoleSettingFile(settingKey, rolePath);

    if (!settingFile) {
      throw new Error(`缺少必要文件：${getRoleSettingFilenames(settingKey).join(' 或 ')}`);
    }

    files[settingKey] = encodeArchiveContent(await readFile(settingFile.filePath));
    settings.push(settingKey);
  }

  const serverSyncPath = path.join(rolePath, SERVER_SYNC_FILE);
  const serverSync = existsSync(serverSyncPath) ? encodeArchiveContent(await readFile(serverSyncPath)) : undefined;
  const createdAt = new Date().toISOString();
  const suffix = buildArchiveSuffix();
  const displayName = sanitizeFileName(payload.archiveName.trim() || path.basename(rolePath));
  const filename = buildArchiveFilename(displayName, suffix);
  const archive: StoredArchive = {
    version: 1,
    displayName,
    suffix,
    createdAt,
    rolePath,
    settings,
    files,
    serverSync,
  };

  await writeJsonFile(getArchivePath(filename), archive);

  return {
    filename,
    displayName,
    suffix,
    fullPath: getArchivePath(filename),
    createdAt,
    size: Buffer.byteLength(JSON.stringify(archive, null, 2), 'utf8') + 1,
    settings,
  };
}

export async function applyBackupToRole(payload: {
  rolePath: string;
  packageFilename: string;
  selectedSettings: SettingKey[];
}): Promise<void> {
  const rolePath = payload.rolePath.trim();

  if (!existsSync(rolePath)) {
    throw new Error('角色目录不存在。');
  }

  const { archive } = await getArchiveOrThrow(payload.packageFilename);

  for (const setting of payload.selectedSettings) {
    const filename = resolveWritableRoleSettingFilename(setting, rolePath);
    const content = archive.files[setting];

    if (!content) {
      throw new Error(`存档中缺少 ${filename}。`);
    }

    await writeFile(path.join(rolePath, filename), decodeArchiveContent(content));
  }

  await writeFile(path.join(rolePath, SERVER_SYNC_FILE), normaliseServerSyncContent(archive.serverSync));
}

export async function deleteBackupFile(payload: DeleteBackupPayload): Promise<BackupPackageInfo[]> {
  const { fullPath } = await getArchiveOrThrow(payload.filename);

  await unlink(fullPath);
  return listPackagesFromDisk();
}

export async function renameBackupFile(payload: RenameBackupPayload): Promise<BackupPackageInfo[]> {
  const { archive, fullPath } = await getArchiveOrThrow(payload.filename);
  const suffix = archive.suffix || parseArchiveFilename(payload.filename).suffix;
  const displayName = sanitizeFileName(payload.newDisplayName);
  const nextFilename = buildArchiveFilename(displayName, suffix || buildArchiveSuffix());
  const nextFullPath = getArchivePath(nextFilename);

  archive.displayName = displayName;
  archive.suffix = suffix || parseArchiveFilename(nextFilename).suffix;

  if (fullPath !== nextFullPath) {
    await rename(fullPath, nextFullPath);
  }

  await writeJsonFile(nextFullPath, archive);
  return listPackagesFromDisk();
}
