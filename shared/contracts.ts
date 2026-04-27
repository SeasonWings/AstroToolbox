export const REQUIRED_SETTING_FILES = {
  layout: 'LayoutCfg.cfg',
  aura: 'ZXAuraWatcherSetting.cfg',
  system: 'ZXSystemSetting.cfg',
} as const;

export const SERVER_SYNC_FILE = 'IsSaveServer.cfg';

export const SETTING_LABELS: Record<keyof typeof REQUIRED_SETTING_FILES, string> = {
  layout: '布局设置',
  aura: '监控设置',
  system: '系统设置',
};

export type SettingKey = keyof typeof REQUIRED_SETTING_FILES;

export type SaveClientType = 'standard' | 'speed';

export interface DetectedSavePath {
  client: SaveClientType;
  savePath: string;
  playerInfoPath: string;
}

export type UpdateErrorStage = 'policy-fetch' | 'check-update' | 'download-start' | 'download-progress' | 'download-complete' | 'install';

export interface ToolboxBootstrap {
  savePath: string;
  autoDetectedPath: string;
  savePathExists: boolean;
  autoDetectedExists: boolean;
  detectedSavePaths: DetectedSavePath[];
  requiresSavePathChoice: boolean;
  configFilePath: string;
  backupDirectory: string;
  autoUpdateEnabled?: boolean;
  updateChannel?: string;
  skippedUpdateVersion?: string | null;
}

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

export interface UidUnameMapping {
  uid: string;
  uname: string;
}

export interface UploadUidUnamePayload {
  uid: string;
  uname: string;
}

export interface UpdatePolicy {
  enabled: boolean;
  channel: string;
  latestVersion: string;
  minimumRequiredVersion?: string;
  forceUpdate?: boolean;
  rolloutPercent?: number;
  releaseNotes?: string;
  downloadPageUrl?: string;
  publishBaseUrl: string;
  policyVersion: string;
  signature?: string;
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'not-available' | 'disabled' | 'error';

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  nextVersion: string | null;
  isForced: boolean;
  releaseNotes: string;
  downloadProgress: number;
  message: string;
  policyVersion: string | null;
  downloadPageUrl: string | null;
  lastCheckedAt: string | null;
  errorStage: UpdateErrorStage | null;
  errorMessage: string | null;
  errorDetail: string | null;
  downloadedFile: string | null;
  downloadDirectory: string | null;
}

export interface CheckUpdateResult {
  state: UpdateState;
  policy: UpdatePolicy | null;
}

export interface DownloadUpdateResult {
  state: UpdateState;
}

export interface ToolboxApi {
  getBootstrap: () => Promise<ToolboxBootstrap>;
  chooseSavePath: () => Promise<string | null>;
  updateSavePath: (savePath: string) => Promise<ToolboxBootstrap>;
  scanRoles: (savePath?: string) => Promise<RoleProfile[]>;
  listPackages: () => Promise<BackupPackageInfo[]>;
  listUidUnameMappings: () => Promise<UidUnameMapping[]>;
  createBackup: (payload: CreateBackupPayload) => Promise<BackupPackageInfo>;
  applyBackup: (payload: ApplyBackupPayload) => Promise<void>;
  deleteBackup: (payload: DeleteBackupPayload) => Promise<BackupPackageInfo[]>;
  renameBackup: (payload: RenameBackupPayload) => Promise<BackupPackageInfo[]>;
  upsertUidUnameMapping: (payload: UploadUidUnamePayload) => Promise<void>;
  getUpdateState: () => Promise<UpdateState>;
  checkForUpdates: () => Promise<CheckUpdateResult>;
  downloadUpdate: () => Promise<DownloadUpdateResult>;
  quitAndInstallUpdate: () => Promise<void>;
  openFileInFolder: (filePath: string) => Promise<void>;
  openArchiveFolder: () => Promise<void>;
  setUpdatePreferences: (payload: { autoUpdateEnabled: boolean; updateChannel: string; skippedUpdateVersion?: string | null }) => Promise<ToolboxBootstrap>;
  onUpdateStateChanged: (listener: (state: UpdateState) => void) => () => void;
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<boolean>;
  isWindowMaximized: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
}
