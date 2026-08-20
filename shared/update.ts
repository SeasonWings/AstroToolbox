export type UpdateErrorStage =
  'policy-fetch' | 'check-update' | 'download-start' | 'download-progress' | 'download-complete' | 'install';

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

export type UpdateStatus =
  'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'not-available' | 'disabled' | 'error';

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
