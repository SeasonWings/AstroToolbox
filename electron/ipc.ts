import { dialog, ipcMain, shell } from 'electron';
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import type {
  ApplyBackupPayload,
  CreateBackupPayload,
  DeleteBackupPayload,
  RenameBackupPayload,
  UploadUidUnamePayload,
} from '../shared/index';
import {
  applyBackupToRole,
  createBackupFromRole,
  deleteBackupFile,
  listPackagesFromDisk,
  renameBackupFile,
} from './archive';
import { ARCHIVE_EXTENSION } from './archive-utils';
import {
  getBackupDirectory,
  resolveBootstrap,
  setSavePath,
  setUpdatePreferences,
  type UpdatePreferencesPayload,
} from './config';
import { scanRolesFromSavePath } from './roles';
import { fetchUidUnameMappingsFromApi, upsertUidUnameMappingToApi } from './uid-mapping';
import {
  checkForUpdatesFromMain,
  downloadUpdateFromMain,
  getUpdateState,
  quitAndInstallUpdateFromMain,
} from './update';
import { closeWindow, isWindowMaximized, minimizeWindow, toggleMaximizeWindow } from './window';

export function registerIpcHandlers(): void {
  ipcMain.handle('toolbox:getBootstrap', async () => resolveBootstrap());
  ipcMain.handle('toolbox:chooseSavePath', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
  ipcMain.handle('toolbox:updateSavePath', async (_event, savePath: string) => {
    const nextSavePath = savePath.trim();

    if (!nextSavePath) {
      throw new Error('存档路径不能为空。');
    }

    return setSavePath(nextSavePath);
  });
  ipcMain.handle('toolbox:scanRoles', async (_event, savePath?: string) => scanRolesFromSavePath(savePath));
  ipcMain.handle('toolbox:listPackages', async () => listPackagesFromDisk());
  ipcMain.handle('toolbox:listUidUnameMappings', async () => fetchUidUnameMappingsFromApi());
  ipcMain.handle('toolbox:createBackup', async (_event, payload: CreateBackupPayload) => createBackupFromRole(payload));
  ipcMain.handle('toolbox:applyBackup', async (_event, payload: ApplyBackupPayload) => {
    await applyBackupToRole(payload);
  });
  ipcMain.handle('toolbox:deleteBackup', async (_event, payload: DeleteBackupPayload) => deleteBackupFile(payload));
  ipcMain.handle('toolbox:renameBackup', async (_event, payload: RenameBackupPayload) => renameBackupFile(payload));
  ipcMain.handle('toolbox:upsertUidUnameMapping', async (_event, payload: UploadUidUnamePayload) =>
    upsertUidUnameMappingToApi(payload),
  );
  ipcMain.handle('toolbox:getUpdateState', async () => getUpdateState());
  ipcMain.handle('toolbox:checkForUpdates', async () => checkForUpdatesFromMain(true));
  ipcMain.handle('toolbox:downloadUpdate', async () => downloadUpdateFromMain());
  ipcMain.handle('toolbox:quitAndInstallUpdate', async () => {
    quitAndInstallUpdateFromMain();
  });
  ipcMain.handle('toolbox:setUpdatePreferences', async (_event, payload: UpdatePreferencesPayload) =>
    setUpdatePreferences(payload),
  );
  ipcMain.handle('toolbox:openFileInFolder', async (_event, filePath: string) => {
    if (!filePath) {
      throw new Error('路径不能为空。');
    }

    if (!existsSync(filePath)) {
      throw new Error('路径不存在。');
    }

    const fileStats = await stat(filePath);

    if (fileStats.isDirectory()) {
      const openResult = await shell.openPath(filePath);

      if (openResult) {
        throw new Error(openResult);
      }

      return;
    }

    await shell.showItemInFolder(filePath);
  });
  ipcMain.handle('toolbox:openArchiveFolder', async () => {
    const archiveDirectory = getBackupDirectory();

    if (!existsSync(archiveDirectory)) {
      throw new Error('当前无存档。');
    }

    const entries = await readdir(archiveDirectory, { withFileTypes: true });
    const hasArchive = entries.some((entry) => entry.isFile() && entry.name.endsWith(ARCHIVE_EXTENSION));

    if (!hasArchive) {
      throw new Error('当前无存档。');
    }

    const openResult = await shell.openPath(archiveDirectory);

    if (openResult) {
      throw new Error(openResult);
    }
  });
  ipcMain.handle('window:minimize', async () => {
    minimizeWindow();
  });
  ipcMain.handle('window:toggleMaximize', async () => toggleMaximizeWindow());
  ipcMain.handle('window:isMaximized', async () => isWindowMaximized());
  ipcMain.handle('window:close', async () => {
    closeWindow();
  });
}
