import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { UpdateErrorStage, UpdateState } from '@shared/index';
import { useBootstrapStore } from './bootstrap';

const getApi = () => window.astroToolbox;

const createInitialUpdateState = (): UpdateState => ({
  status: 'idle',
  currentVersion: '',
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
  downloadDirectory: null,
});

const updateErrorStageLabels: Record<UpdateErrorStage, string> = {
  'policy-fetch': '策略拉取',
  'check-update': '检查更新',
  'download-start': '开始下载',
  'download-progress': '下载过程中',
  'download-complete': '下载完成',
  install: '安装更新',
};

export const useUpdateStore = defineStore('update', () => {
  const updateState = ref<UpdateState>(createInitialUpdateState());
  const showUpdateModal = ref(false);
  const checking = ref(false);
  const downloading = ref(false);
  const preferencesLoading = ref(false);

  let stopListener: (() => void) | null = null;

  const updateStatusLabel = computed(() => {
    switch (updateState.value.status) {
      case 'checking':
        return '检查中';
      case 'available':
        return '有新版本';
      case 'downloading':
        return '下载中';
      case 'ready':
        return '可安装';
      case 'not-available':
        return '已最新';
      case 'disabled':
        return '已关闭';
      case 'error':
        return '异常';
      default:
        return '待检查';
    }
  });

  const updateStatusColor = computed(() => {
    switch (updateState.value.status) {
      case 'available':
        return 'orange';
      case 'downloading':
        return 'processing';
      case 'ready':
        return 'green';
      case 'not-available':
        return 'blue';
      case 'disabled':
        return 'default';
      case 'error':
        return 'red';
      default:
        return 'default';
    }
  });

  const updateErrorStageLabel = computed(() => {
    const stage = updateState.value.errorStage;
    return stage ? updateErrorStageLabels[stage] : '';
  });

  const updateErrorDisplayMessage = computed(() => {
    if (!updateState.value.errorStage) {
      return updateState.value.message;
    }

    return `${updateErrorStageLabel.value}失败：${updateState.value.message}`;
  });

  function startListening(): void {
    stopListener = getApi().onUpdateStateChanged((state) => {
      updateState.value = state;
      showUpdateModal.value = state.status === 'available' || state.status === 'ready' || state.status === 'error';
    });
  }

  function stopListening(): void {
    stopListener?.();
    stopListener = null;
  }

  async function refreshUpdateState(): Promise<void> {
    updateState.value = await getApi().getUpdateState();
    showUpdateModal.value =
      updateState.value.status === 'available' ||
      updateState.value.status === 'ready' ||
      updateState.value.status === 'error';
  }

  async function checkForUpdates(): Promise<UpdateState> {
    checking.value = true;
    try {
      const result = await getApi().checkForUpdates();
      updateState.value = result.state;
      showUpdateModal.value =
        result.state.status === 'available' || result.state.status === 'ready' || result.state.status === 'error';
      return result.state;
    } finally {
      checking.value = false;
    }
  }

  async function downloadUpdate(): Promise<UpdateState> {
    downloading.value = true;
    showUpdateModal.value = true;
    try {
      const result = await getApi().downloadUpdate();
      updateState.value = result.state;
      showUpdateModal.value =
        result.state.status === 'available' || result.state.status === 'ready' || result.state.status === 'error';
      return result.state;
    } finally {
      downloading.value = false;
    }
  }

  async function installUpdate(): Promise<void> {
    await getApi().quitAndInstallUpdate();
  }

  async function setUpdatePreference(next: {
    autoUpdateEnabled?: boolean;
    updateChannel?: string;
    skippedUpdateVersion?: string | null;
  }): Promise<void> {
    const bootstrapStore = useBootstrapStore();
    const current = bootstrapStore.bootstrap;

    if (!current) {
      return;
    }

    preferencesLoading.value = true;
    try {
      await bootstrapStore.saveUpdatePreferences({
        autoUpdateEnabled: next.autoUpdateEnabled ?? current.autoUpdateEnabled ?? true,
        updateChannel: next.updateChannel ?? current.updateChannel ?? 'stable',
        skippedUpdateVersion: next.skippedUpdateVersion ?? current.skippedUpdateVersion ?? null,
      });
    } finally {
      preferencesLoading.value = false;
    }
  }

  async function skipCurrentVersion(): Promise<void> {
    const nextVersion = updateState.value.nextVersion;

    if (!nextVersion) {
      return;
    }

    await setUpdatePreference({ skippedUpdateVersion: nextVersion });
    showUpdateModal.value = false;
    await checkForUpdates();
  }

  function closeModal(): void {
    showUpdateModal.value = false;
  }

  return {
    updateState,
    showUpdateModal,
    checking,
    downloading,
    preferencesLoading,
    updateStatusLabel,
    updateStatusColor,
    updateErrorStageLabel,
    updateErrorDisplayMessage,
    startListening,
    stopListening,
    refreshUpdateState,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    setUpdatePreference,
    skipCurrentVersion,
    closeModal,
  };
});
