import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { REQUIRED_SETTING_FILES, SPEED_SYSTEM_SETTING_FILE, type RoleProfile, type SettingKey } from '../shared/index';
import { resolvePlayerInfoDirectory } from './player-info';
import { inferSaveClientFromRolePath } from './paths';

async function buildRoleProfile(fullPath: string, rootPath: string): Promise<RoleProfile> {
  const stats = await stat(fullPath);

  return {
    id: fullPath,
    folderName: path.basename(fullPath),
    relativePath: path.relative(rootPath, fullPath),
    fullPath,
    updatedAt: stats.mtime.toISOString(),
  } satisfies RoleProfile;
}

export async function scanRolesFromSavePath(savePath?: string): Promise<RoleProfile[]> {
  const targetPath = resolvePlayerInfoDirectory(savePath?.trim() || '');

  if (!targetPath) {
    return [];
  }

  const firstLevelEntries = await readdir(targetPath, { withFileTypes: true });
  const roleProfiles: RoleProfile[] = [];

  for (const firstLevelEntry of firstLevelEntries) {
    if (!firstLevelEntry.isDirectory()) {
      continue;
    }

    const firstLevelPath = path.join(targetPath, firstLevelEntry.name);
    const secondLevelEntries = await readdir(firstLevelPath, { withFileTypes: true });

    for (const secondLevelEntry of secondLevelEntries) {
      if (!secondLevelEntry.isDirectory()) {
        continue;
      }

      const secondLevelPath = path.join(firstLevelPath, secondLevelEntry.name);
      const roleEntries = await readdir(secondLevelPath, { withFileTypes: true });

      for (const roleEntry of roleEntries) {
        if (!roleEntry.isDirectory()) {
          continue;
        }

        if (!/^\d+$/u.test(roleEntry.name)) {
          continue;
        }

        const rolePath = path.join(secondLevelPath, roleEntry.name);
        roleProfiles.push(await buildRoleProfile(rolePath, targetPath));
      }
    }
  }

  return roleProfiles.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getRoleSettingFilenames(setting: SettingKey): string[] {
  if (setting === 'system') {
    return [REQUIRED_SETTING_FILES.system, SPEED_SYSTEM_SETTING_FILE];
  }

  return [REQUIRED_SETTING_FILES[setting]];
}

export function getDefaultRoleSettingFilename(setting: SettingKey, rolePath: string): string {
  if (setting === 'system' && inferSaveClientFromRolePath(rolePath) === 'speed') {
    return SPEED_SYSTEM_SETTING_FILE;
  }

  return REQUIRED_SETTING_FILES[setting];
}

export function resolveExistingRoleSettingFile(
  setting: SettingKey,
  rolePath: string,
): { filename: string; filePath: string } | null {
  for (const filename of getRoleSettingFilenames(setting)) {
    const filePath = path.join(rolePath, filename);
    if (existsSync(filePath)) {
      return { filename, filePath };
    }
  }

  return null;
}

export function resolveWritableRoleSettingFilename(setting: SettingKey, rolePath: string): string {
  return (
    resolveExistingRoleSettingFile(setting, rolePath)?.filename ?? getDefaultRoleSettingFilename(setting, rolePath)
  );
}
