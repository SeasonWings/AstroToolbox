import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import type {
  CheckUpdateResult,
  DownloadUpdateResult,
  UpdateErrorStage,
  UpdatePolicy,
  UpdateState,
} from '../shared/index';
import { readConfig, resolveUpdateDownloadDirectory, UID_MAPPING_API_BASE } from './config';
import { isAllowedUpdateHost, isAllowedUpdateUrl } from './update-url';
import { normalizeVersion } from './version';
import { getMainWindow } from './window';

const RESOLVED_APP_VERSION = app.getVersion();

interface UpdatePolicyApiResponse {
  success: boolean;
  data?: UpdatePolicy;
  message?: string;
}

let currentUpdatePolicy: UpdatePolicy | null = null;
let currentUpdateState: UpdateState = {
  status: 'idle',
  currentVersion: RESOLVED_APP_VERSION,
  nextVersion: null,
  isForced: false,
  releaseNotes: '',
  downloadProgress: 0,
  message: '等待检查更新。',
  policyVersion: null,
  downloadPageUrl: null,
  lastCheckedAt: null,
  errorStage: null,
  errorMessage: null,
  errorDetail: null,
  downloadedFile: null,
  downloadDirectory: resolveUpdateDownloadDirectory(),
};

export function getUpdateState(): UpdateState {
  return currentUpdateState;
}

function emitUpdateState(state: UpdateState): void {
  currentUpdateState = state;
  getMainWindow()?.webContents.send('toolbox:updateStateChanged', state);
}

function setUpdateState(partial: Partial<UpdateState>): void {
  emitUpdateState({
    ...currentUpdateState,
    ...partial,
    downloadDirectory:
      partial.downloadDirectory === undefined ? resolveUpdateDownloadDirectory() : partial.downloadDirectory,
  });
}

function setUpdateError(stage: UpdateErrorStage, message: string, error: unknown): void {
  setUpdateState({
    status: 'error',
    message,
    errorStage: stage,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorDetail:
      error instanceof Error && error.stack ? error.stack : error instanceof Error ? error.message : String(error),
    lastCheckedAt: new Date().toISOString(),
  });
}

export async function fetchUpdatePolicyFromApi(channel?: string): Promise<UpdatePolicy | null> {
  const requestUrl = new URL('/api/config/update-policy', UID_MAPPING_API_BASE);

  if (requestUrl.protocol !== 'https:') {
    throw new Error('更新策略地址必须使用 HTTPS。');
  }

  if (!isAllowedUpdateHost(requestUrl.host)) {
    throw new Error('更新策略地址未在允许列表中。');
  }

  if (channel) {
    requestUrl.searchParams.set('channel', channel);
  }

  const response = await fetch(requestUrl.toString());
  if (!response.ok) {
    throw new Error(`获取更新策略失败：${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as UpdatePolicyApiResponse;
  if (!data.success || !data.data) {
    throw new Error(data.message || '获取更新策略失败。');
  }

  return data.data;
}

export function configureAutoUpdater(policy: UpdatePolicy): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = policy.channel !== 'stable';
  autoUpdater.allowDowngrade = false;
  autoUpdater.channel = policy.channel;

  if (policy.publishBaseUrl && isAllowedUpdateUrl(policy.publishBaseUrl)) {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: policy.publishBaseUrl,
      channel: policy.channel,
    });
  }
}

export async function checkForUpdatesFromMain(manual = true): Promise<CheckUpdateResult> {
  const config = await readConfig();

  if (!app.isPackaged) {
    setUpdateState({
      status: 'disabled',
      message: '开发模式下不启用更新。',
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
      lastCheckedAt: new Date().toISOString(),
    });

    return { state: getUpdateState(), policy: null };
  }

  let policy: UpdatePolicy | null = null;

  try {
    policy = await fetchUpdatePolicyFromApi(config?.updateChannel ?? 'stable');
  } catch (error) {
    setUpdateError('policy-fetch', manual ? '更新策略获取失败。' : '自动检查更新失败。', error);
    return { state: getUpdateState(), policy: null };
  }

  currentUpdatePolicy = policy;

  if (!policy?.enabled) {
    setUpdateState({
      status: 'disabled',
      policyVersion: policy?.policyVersion ?? null,
      nextVersion: null,
      isForced: false,
      releaseNotes: policy?.releaseNotes ?? '',
      downloadPageUrl: policy?.downloadPageUrl ?? null,
      message: '更新功能已关闭。',
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
      lastCheckedAt: new Date().toISOString(),
    });

    return { state: getUpdateState(), policy };
  }

  configureAutoUpdater(policy);
  setUpdateState({
    status: 'checking',
    policyVersion: policy.policyVersion,
    downloadPageUrl: policy.downloadPageUrl ?? null,
    nextVersion: policy.latestVersion,
    isForced: Boolean(policy.forceUpdate),
    releaseNotes: policy.releaseNotes ?? '',
    message: '正在检查更新。',
    errorStage: null,
    errorMessage: null,
    errorDetail: null,
  });

  try {
    const result = await autoUpdater.checkForUpdates();
    const updateInfo = result?.updateInfo;

    if (!updateInfo) {
      setUpdateState({
        status: 'not-available',
        nextVersion: null,
        downloadProgress: 0,
        message:
          config?.skippedUpdateVersion === policy.latestVersion && !policy.forceUpdate
            ? '已跳过当前版本。'
            : '当前已是最新版本。',
        errorStage: null,
        errorMessage: null,
        errorDetail: null,
        lastCheckedAt: new Date().toISOString(),
      });

      return { state: getUpdateState(), policy };
    }

    if (normalizeVersion(updateInfo.version) === normalizeVersion(RESOLVED_APP_VERSION)) {
      setUpdateState({
        status: 'not-available',
        nextVersion: null,
        downloadProgress: 0,
        message: '当前已是最新版本。',
        errorStage: null,
        errorMessage: null,
        errorDetail: null,
        lastCheckedAt: new Date().toISOString(),
      });

      return { state: getUpdateState(), policy };
    }

    if (config?.skippedUpdateVersion === updateInfo.version && !policy.forceUpdate) {
      setUpdateState({
        status: 'not-available',
        nextVersion: updateInfo.version,
        downloadProgress: 0,
        message: '已跳过当前版本。',
        errorStage: null,
        errorMessage: null,
        errorDetail: null,
        lastCheckedAt: new Date().toISOString(),
      });

      return { state: getUpdateState(), policy };
    }

    setUpdateState({
      status: 'available',
      nextVersion: updateInfo.version,
      releaseNotes: typeof updateInfo.releaseNotes === 'string' ? updateInfo.releaseNotes : (policy.releaseNotes ?? ''),
      message: `发现新版本 ${updateInfo.version}。`,
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
      lastCheckedAt: new Date().toISOString(),
    });

    return { state: getUpdateState(), policy };
  } catch (error) {
    setUpdateError('check-update', manual ? '更新检查失败。' : '自动检查更新失败。', error);
    return { state: getUpdateState(), policy };
  }
}

export async function startupUpdateCheck(): Promise<void> {
  const config = await readConfig();

  if (!app.isPackaged) {
    setUpdateState({
      status: 'disabled',
      message: '开发模式下不启用更新。',
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
      lastCheckedAt: new Date().toISOString(),
    });

    return;
  }

  if (config?.autoUpdateEnabled === false) {
    setUpdateState({
      status: 'idle',
      message: '自动检查已关闭。',
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
      lastCheckedAt: new Date().toISOString(),
    });
    return;
  }

  await checkForUpdatesFromMain(false);
}

export async function downloadUpdateFromMain(): Promise<DownloadUpdateResult> {
  if (!app.isPackaged) {
    setUpdateState({
      status: 'disabled',
      message: '开发模式下不启用更新。',
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
    });

    return { state: getUpdateState() };
  }

  const config = await readConfig();
  let policy = currentUpdatePolicy;

  if (!policy) {
    try {
      policy = await fetchUpdatePolicyFromApi(config?.updateChannel ?? 'stable');
      currentUpdatePolicy = policy;
    } catch (error) {
      setUpdateError('download-start', '下载更新失败。', error);
      return { state: getUpdateState() };
    }
  }

  if (!policy?.enabled) {
    setUpdateState({
      status: 'disabled',
      policyVersion: policy?.policyVersion ?? null,
      nextVersion: null,
      isForced: false,
      releaseNotes: policy?.releaseNotes ?? '',
      downloadPageUrl: policy?.downloadPageUrl ?? null,
      message: '更新功能已关闭。',
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
      lastCheckedAt: new Date().toISOString(),
    });

    return { state: getUpdateState() };
  }

  configureAutoUpdater(policy);
  const previousAutoDownload = autoUpdater.autoDownload;
  autoUpdater.autoDownload = true;

  try {
    setUpdateState({
      status: 'downloading',
      downloadProgress: 0,
      message: '正在下载更新。',
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
      downloadedFile: null,
    });

    const updateResult = await autoUpdater.checkForUpdates();
    if (!updateResult?.updateInfo) {
      setUpdateError('download-start', '当前没有可下载的更新。', new Error('未找到可下载的更新信息。'));
      return { state: getUpdateState() };
    }

    if (normalizeVersion(updateResult.updateInfo.version) === normalizeVersion(RESOLVED_APP_VERSION)) {
      setUpdateState({
        status: 'not-available',
        nextVersion: null,
        downloadProgress: 0,
        message: '当前已是最新版本。',
        errorStage: null,
        errorMessage: null,
        errorDetail: null,
        lastCheckedAt: new Date().toISOString(),
      });

      return { state: getUpdateState() };
    }

    if (!updateResult.downloadPromise) {
      setUpdateError('download-start', '当前没有可下载的更新。', new Error('downloadPromise not available'));
      return { state: getUpdateState() };
    }

    const downloadedFiles = await updateResult.downloadPromise;

    if (!downloadedFiles.length && !currentUpdateState.downloadedFile) {
      setUpdateError('download-complete', '更新已下载，但未能获取安装包路径。', new Error('downloadedFile is empty'));
      return { state: getUpdateState() };
    }

    setUpdateState({
      status: 'ready',
      downloadProgress: 100,
      downloadedFile: downloadedFiles[0] ?? currentUpdateState.downloadedFile,
      message: '更新已下载完成。',
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
      lastCheckedAt: new Date().toISOString(),
    });
  } catch (error) {
    setUpdateError('download-progress', '下载更新失败。', error);
  } finally {
    autoUpdater.autoDownload = previousAutoDownload;
  }

  return { state: getUpdateState() };
}

export function quitAndInstallUpdateFromMain(): void {
  if (!app.isPackaged) {
    return;
  }

  if (!currentUpdateState.downloadedFile && currentUpdateState.status !== 'ready') {
    setUpdateError('install', '当前没有可安装的更新。', new Error('update is not ready'));
    return;
  }

  autoUpdater.quitAndInstall(false, true);
}

export function registerUpdateListeners(): void {
  autoUpdater.on('checking-for-update', () => {
    setUpdateState({
      status: 'checking',
      message: '正在检查更新。',
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
    });
  });

  autoUpdater.on('update-available', (info) => {
    if (normalizeVersion(info.version) === normalizeVersion(RESOLVED_APP_VERSION)) {
      setUpdateState({
        status: 'not-available',
        nextVersion: null,
        downloadProgress: 0,
        message: '当前已是最新版本。',
        errorStage: null,
        errorMessage: null,
        errorDetail: null,
        lastCheckedAt: new Date().toISOString(),
      });

      return;
    }

    setUpdateState({
      status: 'available',
      nextVersion: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : currentUpdateState.releaseNotes,
      message: `发现新版本 ${info.version}。`,
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
    });
  });

  autoUpdater.on('update-not-available', () => {
    setUpdateState({
      status: 'not-available',
      nextVersion: null,
      isForced: false,
      downloadProgress: 0,
      downloadedFile: null,
      message: '当前已是最新版本。',
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    setUpdateState({
      status: 'downloading',
      downloadProgress: Math.round(progress.percent),
      message: `正在下载更新 ${Math.round(progress.percent)}%。`,
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (normalizeVersion(info.version) === normalizeVersion(RESOLVED_APP_VERSION)) {
      setUpdateState({
        status: 'not-available',
        nextVersion: null,
        downloadProgress: 0,
        downloadedFile: null,
        message: '当前已是最新版本。',
        errorStage: null,
        errorMessage: null,
        errorDetail: null,
        lastCheckedAt: new Date().toISOString(),
      });

      return;
    }

    setUpdateState({
      status: 'ready',
      nextVersion: info.version,
      downloadProgress: 100,
      downloadedFile: info.downloadedFile,
      message: `更新 ${info.version} 已准备就绪。`,
      errorStage: null,
      errorMessage: null,
      errorDetail: null,
    });
  });

  autoUpdater.on('error', (error) => {
    setUpdateError(
      currentUpdateState.status === 'downloading' ? 'download-progress' : 'check-update',
      '更新检查失败。',
      error,
    );
  });
}
