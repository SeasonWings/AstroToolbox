import type { SettingKey } from './settings';

export interface RoleProfile {
  id: string;
  folderName: string;
  relativePath: string;
  fullPath: string;
  updatedAt: string;
}

export interface BackupPackageInfo {
  filename: string;
  displayName: string;
  suffix: string;
  fullPath: string;
  createdAt: string;
  size: number;
  settings: SettingKey[];
}

export interface CreateBackupPayload {
  rolePath: string;
  archiveName: string;
}

export interface ApplyBackupPayload {
  rolePath: string;
  packageFilename: string;
  selectedSettings: SettingKey[];
}

export interface DeleteBackupPayload {
  filename: string;
}

export interface RenameBackupPayload {
  filename: string;
  newDisplayName: string;
}
