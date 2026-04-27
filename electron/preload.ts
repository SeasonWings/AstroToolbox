import { contextBridge, ipcRenderer } from 'electron';
import type {
  ApplyBackupPayload,
  BackupPackageInfo,
  CheckUpdateResult,
  CreateBackupPayload,
  DeleteBackupPayload,
  DownloadUpdateResult,
  RenameBackupPayload,
  RoleProfile,
  ToolboxApi,
  ToolboxBootstrap,
  UpdateState,
  UploadUidUnamePayload,
} from '../shared/contracts';

const updateStateListeners = new Set<(state: UpdateState) => void>();

ipcRenderer.on('toolbox:updateStateChanged', (_event, state: UpdateState) => {
  for (const listener of updateStateListeners) {
    listener(state);
  }
});

const api: ToolboxApi = {
  getBootstrap: () => ipcRenderer.invoke('toolbox:getBootstrap'),
  chooseSavePath: () => ipcRenderer.invoke('toolbox:chooseSavePath'),
  updateSavePath: (savePath: string) => ipcRenderer.invoke('toolbox:updateSavePath', savePath),
  scanRoles: (savePath?: string) => ipcRenderer.invoke('toolbox:scanRoles', savePath),
  listPackages: () => ipcRenderer.invoke('toolbox:listPackages'),
  listUidUnameMappings: () => ipcRenderer.invoke('toolbox:listUidUnameMappings'),
  createBackup: (payload: CreateBackupPayload) => ipcRenderer.invoke('toolbox:createBackup', payload),
  applyBackup: (payload: ApplyBackupPayload) => ipcRenderer.invoke('toolbox:applyBackup', payload),
  deleteBackup: (payload: DeleteBackupPayload) => ipcRenderer.invoke('toolbox:deleteBackup', payload),
  renameBackup: (payload: RenameBackupPayload) => ipcRenderer.invoke('toolbox:renameBackup', payload),
  upsertUidUnameMapping: (payload: UploadUidUnamePayload) => ipcRenderer.invoke('toolbox:upsertUidUnameMapping', payload),
  getUpdateState: () => ipcRenderer.invoke('toolbox:getUpdateState'),
  checkForUpdates: () => ipcRenderer.invoke('toolbox:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('toolbox:downloadUpdate'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('toolbox:quitAndInstallUpdate'),
  openFileInFolder: (filePath: string) => ipcRenderer.invoke('toolbox:openFileInFolder', filePath),
  openArchiveFolder: () => ipcRenderer.invoke('toolbox:openArchiveFolder'),
  setUpdatePreferences: (payload: { autoUpdateEnabled: boolean; updateChannel: string; skippedUpdateVersion?: string | null }) => ipcRenderer.invoke('toolbox:setUpdatePreferences', payload),
  onUpdateStateChanged: (listener: (state: UpdateState) => void) => {
    updateStateListeners.add(listener);

    return () => {
      updateStateListeners.delete(listener);
    };
  },
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggleMaximize'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('astroToolbox', api);
