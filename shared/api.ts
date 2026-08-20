import type {
  ApplyBackupPayload,
  BackupPackageInfo,
  CreateBackupPayload,
  DeleteBackupPayload,
  RenameBackupPayload,
  RoleProfile,
} from './archive';
import type { DetectedSavePath } from './settings';
import type { CheckUpdateResult, DownloadUpdateResult, UpdateState } from './update';
import type { UidUnameMapping, UploadUidUnamePayload } from './uid';

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
  setUpdatePreferences: (payload: {
    autoUpdateEnabled: boolean;
    updateChannel: string;
    skippedUpdateVersion?: string | null;
  }) => Promise<ToolboxBootstrap>;
  onUpdateStateChanged: (listener: (state: UpdateState) => void) => () => void;
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<boolean>;
  isWindowMaximized: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
}
