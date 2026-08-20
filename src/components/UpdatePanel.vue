<script setup lang="ts">
import { computed } from 'vue';
import { message } from 'ant-design-vue';
import { storeToRefs } from 'pinia';
import { formatDate, getErrorMessage } from '../composables/useFormat';
import { useBootstrapStore } from '../stores/bootstrap';
import { useUpdateStore } from '../stores/update';

const bootstrapStore = useBootstrapStore();
const updateStore = useUpdateStore();
const {
  updateState,
  showUpdateModal,
  checking,
  downloading,
  preferencesLoading,
  updateStatusLabel,
  updateStatusColor,
  updateErrorStageLabel,
  updateErrorDisplayMessage,
} = storeToRefs(updateStore);

const updateChannelOptions = [
  { value: 'stable', label: '稳定版' },
  { value: 'beta', label: '测试版' },
];

const updateChannel = computed({
  get: () => bootstrapStore.bootstrap?.updateChannel ?? 'stable',
  set: (value: string) => {
    void handleUpdatePreferenceChange({ updateChannel: value });
  },
});

const autoUpdateEnabled = computed({
  get: () => bootstrapStore.bootstrap?.autoUpdateEnabled ?? true,
  set: (value: boolean) => {
    void handleUpdatePreferenceChange({ autoUpdateEnabled: value });
  },
});

async function handleUpdatePreferenceChange(next: {
  autoUpdateEnabled?: boolean;
  updateChannel?: string;
  skippedUpdateVersion?: string | null;
}): Promise<void> {
  try {
    await updateStore.setUpdatePreference(next);
    message.success('更新设置已保存。');
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function handleCheckForUpdates(): Promise<void> {
  try {
    const state = await updateStore.checkForUpdates();

    if (state.status === 'not-available') {
      message.success(state.message);
    } else if (state.status === 'error') {
      message.error(updateErrorDisplayMessage.value);
    }
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function handleDownloadUpdate(): Promise<void> {
  try {
    const state = await updateStore.downloadUpdate();

    if (state.status === 'error') {
      message.error(updateErrorDisplayMessage.value);
    }
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function handleOpenDownloadedFile(): Promise<void> {
  if (!updateState.value.downloadDirectory) {
    message.warning('下载目录还不可用。');
    return;
  }

  try {
    await window.astroToolbox.openFileInFolder(updateState.value.downloadDirectory);
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function handleInstallUpdate(): Promise<void> {
  await updateStore.installUpdate();
}

async function handleSkipCurrentVersion(): Promise<void> {
  await updateStore.skipCurrentVersion();
}

function closeUpdateModal(): void {
  updateStore.closeModal();
}
</script>

<template>
  <a-card class="glass-card details-card update-card">
    <div class="card-headline">
      <div>
        <h2>在线更新</h2>
      </div>
      <a-tag :color="updateStatusColor">{{ updateStatusLabel }}</a-tag>
    </div>

    <div class="detail-list">
      <div>
        <span>当前版本</span>
        <strong>{{ updateState.currentVersion || '未知' }}</strong>
      </div>
      <div>
        <span>目标版本</span>
        <strong>{{ updateState.nextVersion || '暂无' }}</strong>
      </div>
      <div>
        <span>最近检查</span>
        <strong>{{ updateState.lastCheckedAt ? formatDate(updateState.lastCheckedAt) : '从未检查' }}</strong>
      </div>
      <div>
        <span>更新通道</span>
        <a-select
          v-model:value="updateChannel"
          :options="updateChannelOptions"
          :loading="preferencesLoading"
          size="large"
        />
      </div>
      <div>
        <span>自动检查</span>
        <a-switch v-model:checked="autoUpdateEnabled" :loading="preferencesLoading" />
      </div>
    </div>

    <div class="toolbar-actions">
      <a-button type="primary" :loading="checking" @click="handleCheckForUpdates">检查更新</a-button>
      <a-button :disabled="updateState.status !== 'available'" :loading="downloading" @click="handleDownloadUpdate">
        下载更新
      </a-button>
      <a-button :disabled="!updateState.downloadDirectory" @click="handleOpenDownloadedFile">打开下载目录</a-button>
    </div>
  </a-card>

  <a-modal
    v-model:open="showUpdateModal"
    class="toolbox-modal"
    :title="updateState.isForced ? '强制更新' : '发现新版本'"
    :footer="null"
    :closable="!updateState.isForced"
    :mask-closable="!updateState.isForced"
    @cancel="closeUpdateModal"
  >
    <div v-if="updateState.status === 'error'" class="update-error-panel">
      <div class="update-error-panel__header">
        <span class="update-error-panel__stage">{{ updateErrorStageLabel || '异常' }}</span>
        <strong>{{ updateErrorDisplayMessage }}</strong>
      </div>
      <div class="update-error-panel__body">
        <div>
          <span>原始错误</span>
          <strong>{{ updateState.errorMessage || '暂无' }}</strong>
        </div>
        <div v-if="updateState.errorDetail">
          <span>详细信息</span>
          <code>{{ updateState.errorDetail }}</code>
        </div>
      </div>
    </div>

    <div class="detail-list">
      <div>
        <span>更新状态</span>
        <strong>{{ updateState.message }}</strong>
      </div>
      <div>
        <span>当前版本</span>
        <strong>{{ updateState.currentVersion || '未知' }}</strong>
      </div>
      <div>
        <span>目标版本</span>
        <strong>{{ updateState.nextVersion || '暂无' }}</strong>
      </div>
      <div>
        <span>发布说明</span>
        <strong class="release-notes">{{ updateState.releaseNotes || '暂无说明' }}</strong>
      </div>
      <div v-if="updateState.downloadDirectory">
        <span>下载目录</span>
        <strong>{{ updateState.downloadDirectory }}</strong>
        <a-button size="small" @click="handleOpenDownloadedFile">打开所在文件夹</a-button>
      </div>
    </div>

    <div class="modal-actions">
      <a-button v-if="!updateState.isForced" @click="handleSkipCurrentVersion">跳过此版本</a-button>
      <a-button v-if="!updateState.isForced" @click="closeUpdateModal">稍后再说</a-button>
      <a-button
        v-if="updateState.status === 'available'"
        type="primary"
        :loading="downloading"
        @click="handleDownloadUpdate"
      >
        立即下载
      </a-button>
      <a-button v-if="updateState.status === 'ready'" type="primary" @click="handleInstallUpdate">立即安装</a-button>
      <a-button v-if="updateState.status === 'error'" type="primary" :loading="checking" @click="handleCheckForUpdates">
        重新检查
      </a-button>
    </div>
  </a-modal>
</template>
