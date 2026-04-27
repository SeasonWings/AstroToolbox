<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  REQUIRED_SETTING_FILES,
  SETTING_LABELS,
  type BackupPackageInfo,
  type RoleProfile,
  type SaveClientType,
  type SettingKey,
  type ToolboxBootstrap,
  type UidUnameMapping,
  type UpdateErrorStage,
  type UpdateState,
} from '../shared/contracts';

type ViewKey = 'config' | 'roles' | 'archives';

const toolboxApi = window.astroToolbox;
const currentView = ref<ViewKey>('config');
const selectedMenuKeys = ref<string[]>([]);
const openMenuKeys = ref<string[]>(['role-sync']);
const isWindowMaximized = ref(false);
const bootstrap = ref<ToolboxBootstrap | null>(null);
const roles = ref<RoleProfile[]>([]);
const packages = ref<BackupPackageInfo[]>([]);
const uidMappings = ref<UidUnameMapping[]>([]);
const editableSavePath = ref('');
const updateState = ref<UpdateState>({
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
const showUpdateModal = ref(false);
let stopUpdateStateListener: (() => void) | null = null;

const loading = reactive({
  bootstrap: false,
  roles: false,
  packages: false,
  uidMappings: false,
  savePath: false,
  backup: false,
  apply: false,
  rename: false,
  remove: false,
  uidMappingSave: false,
  updateCheck: false,
  updateDownload: false,
  updatePreferences: false,
});

const backupModal = reactive({
  open: false,
  role: null as RoleProfile | null,
  archiveName: '',
});

const applyModal = reactive({
  open: false,
  role: null as RoleProfile | null,
  step: 0,
  selectedPackageFilename: '',
  selectedSettings: [] as SettingKey[],
});

const renameModal = reactive({
  open: false,
  target: null as BackupPackageInfo | null,
  newDisplayName: '',
});

const uidMappingModal = reactive({
  open: false,
  uid: '',
  uname: '',
});

const savePathChoiceModal = reactive({
  open: false,
  selectedSavePath: '',
  fromRequiredChoice: false,
});

const settingOptions = (Object.entries(REQUIRED_SETTING_FILES) as [SettingKey, string][])
  .map(([value]) => ({
    value,
    label: SETTING_LABELS[value],
  }));

const settingCheckboxOptions = settingOptions.map((option) => ({
  value: option.value,
  label: option.label,
}));

const updateChannelOptions = [
  { value: 'stable', label: '稳定版' },
  { value: 'beta', label: '测试版' },
];

const pageMeta: Record<ViewKey, { title: string }> = {
  config: { title: '工具箱配置' },
  roles: { title: '角色备份' },
  archives: { title: '存档管理' },
};

const uidToUnameMap = computed(() => new Map(uidMappings.value.map((item) => [item.uid, item.uname] as const)));

const selectedPackage = computed(() => {
  return packages.value.find((item) => item.filename === applyModal.selectedPackageFilename) ?? null;
});

const sortedRoles = computed(() => {
  return [...roles.value].sort((left, right) => {
    const leftHasMapping = uidToUnameMap.value.has(left.folderName);
    const rightHasMapping = uidToUnameMap.value.has(right.folderName);

    if (leftHasMapping !== rightHasMapping) {
      return Number(rightHasMapping) - Number(leftHasMapping);
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
});

const viewTitle = computed(() => pageMeta[currentView.value].title);
const stats = computed(() => ({
  roleCount: roles.value.length,
  packageCount: packages.value.length,
  savePathExists: Boolean(bootstrap.value?.savePathExists),
}));
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
const updateErrorStageLabels: Record<UpdateErrorStage, string> = {
  'policy-fetch': '策略拉取',
  'check-update': '检查更新',
  'download-start': '开始下载',
  'download-progress': '下载过程中',
  'download-complete': '下载完成',
  install: '安装更新',
};
const updateErrorStageLabel = computed(() => {
  const stage = updateState.value.errorStage;

  if (!stage) {
    return '';
  }

  return updateErrorStageLabels[stage];
});
const updateErrorDisplayMessage = computed(() => {
  if (!updateState.value.errorStage) {
    return updateState.value.message;
  }

  return `${updateErrorStageLabel.value}失败：${updateState.value.message}`;
});
const updateChannel = computed({
  get: () => bootstrap.value?.updateChannel ?? 'stable',
  set: (value: string) => {
    void handleUpdatePreferenceChange({ updateChannel: value });
  },
});
const autoUpdateEnabled = computed({
  get: () => bootstrap.value?.autoUpdateEnabled ?? true,
  set: (value: boolean) => {
    void handleUpdatePreferenceChange({ autoUpdateEnabled: value });
  },
});

function setInitialView(): void {
  const hasSavePath = Boolean(bootstrap.value?.savePathExists || bootstrap.value?.autoDetectedExists);

  currentView.value = hasSavePath ? 'roles' : 'config';
  selectedMenuKeys.value = hasSavePath ? ['roles'] : [];
}

function getRoleDisplayName(role?: RoleProfile | null): string {
  if (!role) {
    return '';
  }

  return uidToUnameMap.value.get(role.folderName) ?? role.folderName;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return '发生未知错误，请稍后重试。';
}

function getClientLabel(client: SaveClientType): string {
  return client === 'speed' ? '极速端' : '标准端';
}

async function saveChosenDetectedPath(savePath: string): Promise<void> {
  loading.savePath = true;

  try {
    bootstrap.value = await toolboxApi.updateSavePath(savePath);
    editableSavePath.value = bootstrap.value.savePath;
    await refreshRoles();
    message.success('存档路径已保存。');
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.savePath = false;
  }
}

function openSavePathChoiceModal(detectedOnly = false): void {
  if (!bootstrap.value?.detectedSavePaths.length) {
    message.warning('当前未检测到可用存档路径。');
    return;
  }

  savePathChoiceModal.selectedSavePath = editableSavePath.value || bootstrap.value.detectedSavePaths[0]?.savePath || '';
  savePathChoiceModal.fromRequiredChoice = !detectedOnly && Boolean(bootstrap.value?.requiresSavePathChoice && !bootstrap.value?.savePath);
  savePathChoiceModal.open = true;
}

function closeSavePathChoiceModal(): void {
  savePathChoiceModal.open = false;

  if (savePathChoiceModal.fromRequiredChoice && !bootstrap.value?.savePath) {
    editableSavePath.value = '';
  }

  savePathChoiceModal.fromRequiredChoice = false;
}

async function submitSavePathChoice(): Promise<void> {
  const selected = savePathChoiceModal.selectedSavePath.trim();

  if (!selected) {
    message.warning('请先选择一个客户端路径。');
    return;
  }

  await saveChosenDetectedPath(selected);
  savePathChoiceModal.open = false;
  savePathChoiceModal.fromRequiredChoice = false;
}

async function refreshBootstrap(): Promise<void> {
  loading.bootstrap = true;

  try {
    bootstrap.value = await toolboxApi.getBootstrap();
    editableSavePath.value = bootstrap.value.savePath;

    if (bootstrap.value.requiresSavePathChoice && bootstrap.value.detectedSavePaths.length > 1) {
      openSavePathChoiceModal();
    }
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.bootstrap = false;
  }
}

async function refreshRoles(): Promise<void> {
  if (!bootstrap.value?.savePath) {
    roles.value = [];
    return;
  }

  loading.roles = true;

  try {
    roles.value = await toolboxApi.scanRoles(bootstrap.value.savePath);
  } catch (error) {
    roles.value = [];
    message.error(getErrorMessage(error));
  } finally {
    loading.roles = false;
  }
}

async function refreshPackages(): Promise<void> {
  loading.packages = true;

  try {
    packages.value = await toolboxApi.listPackages();
  } catch (error) {
    packages.value = [];
    message.error(getErrorMessage(error));
  } finally {
    loading.packages = false;
  }
}

async function refreshUidMappings(): Promise<void> {
  loading.uidMappings = true;

  try {
    uidMappings.value = await toolboxApi.listUidUnameMappings();
  } catch (error) {
    uidMappings.value = [];
    message.error(getErrorMessage(error));
  } finally {
    loading.uidMappings = false;
  }
}

async function refreshUpdateState(): Promise<void> {
  try {
    updateState.value = await toolboxApi.getUpdateState();
    showUpdateModal.value = updateState.value.status === 'available' || updateState.value.status === 'ready' || updateState.value.status === 'error';
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function refreshAll(): Promise<void> {
  await refreshBootstrap();
  await Promise.all([
    refreshRoles(),
    refreshPackages(),
    refreshUidMappings(),
  ]);
}

async function switchView(view: ViewKey): Promise<void> {
  currentView.value = view;
  selectedMenuKeys.value = view === 'config' ? [] : [view];

  if (view === 'roles') {
    await refreshRoles();
  }

  if (view === 'archives') {
    await refreshPackages();
  }
}

async function syncWindowMaximizedState(): Promise<void> {
  try {
    isWindowMaximized.value = await toolboxApi.isWindowMaximized();
  } catch {
    isWindowMaximized.value = false;
  }
}

async function handleMinimizeWindow(): Promise<void> {
  await toolboxApi.minimizeWindow();
}

async function handleToggleMaximizeWindow(): Promise<void> {
  isWindowMaximized.value = await toolboxApi.toggleMaximizeWindow();
}

async function handleCloseWindow(): Promise<void> {
  await toolboxApi.closeWindow();
}

async function handleBrowseSavePath(): Promise<void> {
  try {
    const selectedPath = await toolboxApi.chooseSavePath();

    if (selectedPath) {
      editableSavePath.value = selectedPath;
    }
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function handleUseDetectedPath(): Promise<void> {
  if (!bootstrap.value) {
    return;
  }

  if (bootstrap.value.detectedSavePaths.length > 1) {
    openSavePathChoiceModal(true);
    return;
  }

  if (bootstrap.value.autoDetectedPath) {
    editableSavePath.value = bootstrap.value.autoDetectedPath;
  }
}

async function handleSavePath(): Promise<void> {
  const targetPath = editableSavePath.value.trim();

  if (!targetPath) {
    message.warning('请先输入或选择存档路径。');
    return;
  }

  loading.savePath = true;

  try {
    bootstrap.value = await toolboxApi.updateSavePath(targetPath);
    editableSavePath.value = bootstrap.value.savePath;
    await refreshRoles();
    message.success('存档路径已保存。');
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.savePath = false;
  }
}

async function handleUpdatePreferenceChange(next: { autoUpdateEnabled?: boolean; updateChannel?: string; skippedUpdateVersion?: string | null }): Promise<void> {
  if (!bootstrap.value) {
    return;
  }

  loading.updatePreferences = true;

  try {
    bootstrap.value = await toolboxApi.setUpdatePreferences({
      autoUpdateEnabled: next.autoUpdateEnabled ?? (bootstrap.value.autoUpdateEnabled ?? true),
      updateChannel: next.updateChannel ?? (bootstrap.value.updateChannel ?? 'stable'),
      skippedUpdateVersion: next.skippedUpdateVersion ?? bootstrap.value.skippedUpdateVersion ?? null,
    });
    message.success('更新设置已保存。');
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.updatePreferences = false;
  }
}

async function handleCheckForUpdates(): Promise<void> {
  loading.updateCheck = true;

  try {
    const result = await toolboxApi.checkForUpdates();
    updateState.value = result.state;
    showUpdateModal.value = result.state.status === 'available' || result.state.status === 'ready' || result.state.status === 'error';

    if (result.state.status === 'not-available') {
      message.success(result.state.message);
    } else if (result.state.status === 'error') {
      message.error(updateErrorDisplayMessage.value);
    }
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.updateCheck = false;
  }
}

async function handleDownloadUpdate(): Promise<void> {
  loading.updateDownload = true;
  showUpdateModal.value = true;

  try {
    const result = await toolboxApi.downloadUpdate();
    updateState.value = result.state;
    showUpdateModal.value = result.state.status === 'available' || result.state.status === 'ready' || result.state.status === 'error';

    if (result.state.status === 'error') {
      message.error(updateErrorDisplayMessage.value);
    }
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.updateDownload = false;
  }
}

async function handleOpenArchiveFolder(): Promise<void> {
  try {
    await toolboxApi.openArchiveFolder();
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
    await toolboxApi.openFileInFolder(updateState.value.downloadDirectory);
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function handleInstallUpdate(): Promise<void> {
  await toolboxApi.quitAndInstallUpdate();
}

async function handleSkipCurrentVersion(): Promise<void> {
  if (!updateState.value.nextVersion) {
    return;
  }

  await handleUpdatePreferenceChange({ skippedUpdateVersion: updateState.value.nextVersion });
  showUpdateModal.value = false;
  await handleCheckForUpdates();
}

function closeUpdateModal(): void {
  showUpdateModal.value = false;
}

function openBackupModal(role: RoleProfile): void {
  backupModal.open = true;
  backupModal.role = role;
  backupModal.archiveName = role.folderName;
}

function closeBackupModal(): void {
  backupModal.open = false;
  backupModal.role = null;
  backupModal.archiveName = '';
}

async function submitBackup(): Promise<void> {
  if (!backupModal.role) {
    return;
  }

  loading.backup = true;

  try {
    const created = await toolboxApi.createBackup({
      rolePath: backupModal.role.fullPath,
      archiveName: backupModal.archiveName,
    });

    message.success(`已创建存档：${created.filename}`);
    closeBackupModal();
    await refreshPackages();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.backup = false;
  }
}

async function openApplyModal(role: RoleProfile): Promise<void> {
  await refreshPackages();
  applyModal.open = true;
  applyModal.role = role;
  applyModal.step = 0;
  applyModal.selectedPackageFilename = packages.value[0]?.filename ?? '';
  applyModal.selectedSettings = settingOptions.map((option) => option.value);
}

function closeApplyModal(): void {
  applyModal.open = false;
  applyModal.role = null;
  applyModal.step = 0;
  applyModal.selectedPackageFilename = '';
  applyModal.selectedSettings = [];
}

async function advanceApplyStep(): Promise<void> {
  if (!applyModal.selectedPackageFilename) {
    message.warning('请先选择一个要应用的存档。');
    return;
  }

  applyModal.step = 1;
}

async function submitApply(): Promise<void> {
  if (!applyModal.role) {
    return;
  }

  if (!applyModal.selectedSettings.length) {
    message.warning('请至少选择一个设置项。');
    return;
  }

  loading.apply = true;

  try {
    await toolboxApi.applyBackup({
      rolePath: applyModal.role.fullPath,
      packageFilename: applyModal.selectedPackageFilename,
      selectedSettings: [...applyModal.selectedSettings],
    });

    message.success('存档设置已成功应用到目标角色。');
    closeApplyModal();
    await refreshRoles();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.apply = false;
  }
}

function openRenameModal(target: BackupPackageInfo): void {
  renameModal.open = true;
  renameModal.target = target;
  renameModal.newDisplayName = target.displayName;
}

function closeRenameModal(): void {
  renameModal.open = false;
  renameModal.target = null;
  renameModal.newDisplayName = '';
}

function confirmDelete(target: BackupPackageInfo): void {
  Modal.confirm({
    title: '确定要删除这个存档吗？',
    okText: '删除',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: () => submitDelete(target),
  });
}

async function submitRename(): Promise<void> {
  if (!renameModal.target) {
    return;
  }

  loading.rename = true;

  try {
    packages.value = await toolboxApi.renameBackup({
      filename: renameModal.target.filename,
      newDisplayName: renameModal.newDisplayName,
    });

    message.success('存档名称已更新。');
    closeRenameModal();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.rename = false;
  }
}

async function submitDelete(target: BackupPackageInfo): Promise<void> {
  loading.remove = true;

  try {
    packages.value = await toolboxApi.deleteBackup({
      filename: target.filename,
    });

    message.success('存档已删除。');
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.remove = false;
  }
}

function openUidMappingModal(): void {
  uidMappingModal.open = true;
  uidMappingModal.uid = '';
  uidMappingModal.uname = '';
}

function closeUidMappingModal(): void {
  uidMappingModal.open = false;
  uidMappingModal.uid = '';
  uidMappingModal.uname = '';
}

async function performUidMappingSave(uid: string, uname: string): Promise<void> {
  loading.uidMappingSave = true;

  try {
    await toolboxApi.upsertUidUnameMapping({ uid, uname });
    message.success('UID 关联已保存。');
    closeUidMappingModal();
    await refreshUidMappings();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loading.uidMappingSave = false;
  }
}

function submitUidMapping(): void {
  const uid = uidMappingModal.uid.trim();
  const uname = uidMappingModal.uname.trim();

  if (!uid || !uname) {
    message.warning('请先输入 UID 和角色名。');
    return;
  }

  const existingUname = uidToUnameMap.value.get(uid);

  if (existingUname) {
    Modal.confirm({
      title: `UID ${uid} 已关联为 ${existingUname}，是否更新为 ${uname}？`,
      okText: '更新',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => performUidMappingSave(uid, uname),
    });
    return;
  }

  void performUidMappingSave(uid, uname);
}

onMounted(() => {
  stopUpdateStateListener = toolboxApi.onUpdateStateChanged((state) => {
    updateState.value = state;
    showUpdateModal.value = state.status === 'available' || state.status === 'ready' || state.status === 'error';
  });

  void refreshAll().then(() => {
    setInitialView();
  });
  void syncWindowMaximizedState();
  void refreshUpdateState();
});

onUnmounted(() => {
  stopUpdateStateListener?.();
});
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-sider
      class="sidebar"
      :width="272"
    >
      <div class="brand-panel">
        <div>
          <div class="brand-title">AstroToolbox</div>
        </div>
      </div>

      <a-menu
        v-model:selectedKeys="selectedMenuKeys"
        v-model:openKeys="openMenuKeys"
        class="nav-menu"
        mode="inline"
        theme="light"
      >
        <a-sub-menu key="role-sync">
          <template #title>角色同步</template>
          <a-menu-item
            key="roles"
            @click="switchView('roles')"
          >
            角色备份
          </a-menu-item>
          <a-menu-item
            key="archives"
            @click="switchView('archives')"
          >
            存档管理
          </a-menu-item>
        </a-sub-menu>
      </a-menu>
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="topbar">
        <div class="topbar-left">
          <h1 class="page-title">{{ viewTitle }}</h1>
        </div>

        <div class="topbar-right">
          <a-space
            class="topbar-actions"
            wrap
          >
            <a-tag color="processing">角色 {{ stats.roleCount }}</a-tag>
            <a-tag color="blue">存档 {{ stats.packageCount }}</a-tag>
            <a-tag :color="stats.savePathExists ? 'green' : 'red'">
              {{ stats.savePathExists ? '路径有效' : '路径待确认' }}
            </a-tag>
            <a-tag :color="updateStatusColor">{{ updateStatusLabel }}</a-tag>
          </a-space>

          <div class="topbar-controls">
            <button
              type="button"
              class="toolbar-icon-btn"
              aria-label="工具箱配置"
              title="工具箱配置"
              @click="switchView('config')"
            >
              ⚙
            </button>
            <button
              type="button"
              class="window-control-btn"
              aria-label="最小化"
              title="最小化"
              @click="handleMinimizeWindow"
            >
              −
            </button>
            <button
              type="button"
              class="window-control-btn"
              :aria-label="isWindowMaximized ? '还原' : '最大化'"
              :title="isWindowMaximized ? '还原' : '最大化'"
              @click="handleToggleMaximizeWindow"
            >
              {{ isWindowMaximized ? '❐' : '□' }}
            </button>
            <button
              type="button"
              class="window-control-btn window-control-btn--close"
              aria-label="关闭"
              title="关闭"
              @click="handleCloseWindow"
            >
              ×
            </button>
          </div>
        </div>
      </a-layout-header>

      <a-layout-content class="content">
        <a-spin
          :spinning="loading.bootstrap"
          tip="正在加载 AstroToolbox..."
        >
          <template v-if="currentView === 'config'">
            <div class="view-grid view-grid--config">
              <a-card class="glass-card hero-card">
                <div class="card-headline">
                  <div>
                    <h2>存档路径配置</h2>
                  </div>
                  <a-tag :color="bootstrap?.savePathExists ? 'blue' : 'geekblue'">
                    {{ bootstrap?.savePathExists ? '已识别' : '待校验' }}
                  </a-tag>
                </div>

                <a-form layout="vertical">
                  <a-form-item label="当前存档路径">
                    <a-input
                      v-model:value="editableSavePath"
                      placeholder="请输入路径"
                      size="large"
                    />
                  </a-form-item>

                  <div class="toolbar-actions">
                    <a-button
                      type="primary"
                      size="large"
                      :loading="loading.savePath"
                      @click="handleSavePath"
                    >
                      保存配置
                    </a-button>
                    <a-button
                      size="large"
                      @click="handleBrowseSavePath"
                    >
                      浏览目录
                    </a-button>
                    <a-button
                      size="large"
                      @click="handleUseDetectedPath"
                    >
                      使用自动识别
                    </a-button>
                    <a-button
                      v-if="bootstrap?.backupDirectory"
                      size="large"
                      @click="handleOpenArchiveFolder"
                    >
                      打开当前存档文件夹
                    </a-button>
                    <a-button
                      size="large"
                      :loading="loading.uidMappings"
                      @click="openUidMappingModal"
                    >
                      上传 UID 关联
                    </a-button>
                  </div>
                </a-form>
              </a-card>

              <a-card class="glass-card details-card">
                <div class="summary-panel">
                  <div class="summary-stat">
                    <strong>{{ stats.roleCount }}</strong>
                    <span>已扫描角色</span>
                  </div>
                  <div class="summary-stat">
                    <strong>{{ stats.packageCount }}</strong>
                    <span>本地存档</span>
                  </div>
                </div>
              </a-card>

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
                      :loading="loading.updatePreferences"
                      size="large"
                    />
                  </div>
                  <div>
                    <span>自动检查</span>
                    <a-switch
                      v-model:checked="autoUpdateEnabled"
                      :loading="loading.updatePreferences"
                    />
                  </div>
                </div>

                <div class="toolbar-actions">
                  <a-button
                    type="primary"
                    :loading="loading.updateCheck"
                    @click="handleCheckForUpdates"
                  >
                    检查更新
                  </a-button>
                  <a-button
                    :disabled="updateState.status !== 'available'"
                    :loading="loading.updateDownload"
                    @click="handleDownloadUpdate"
                  >
                    下载更新
                  </a-button>
                  <a-button
                    :disabled="!updateState.downloadDirectory"
                    @click="handleOpenDownloadedFile"
                  >
                    打开下载目录
                  </a-button>
                </div>
              </a-card>
            </div>
          </template>

          <template v-else-if="currentView === 'roles'">
            <div class="page-section">
              <a-card class="glass-card">
                <div class="card-headline">
                  <div>
                    <h2>角色列表</h2>
                  </div>
                  <a-space wrap>
                    <a-tag color="blue">{{ roles.length }} 个角色</a-tag>
                    <a-button
                      :loading="loading.roles"
                      @click="refreshRoles"
                    >
                      重新扫描
                    </a-button>
                  </a-space>
                </div>

                <div
                  v-if="sortedRoles.length"
                  class="role-grid"
                >
                  <a-card
                    v-for="role in sortedRoles"
                    :key="role.id"
                    class="role-card"
                    :bordered="false"
                  >
                    <div class="role-card__header">
                      <div>
                        <h3>{{ getRoleDisplayName(role) }}</h3>
                      </div>
                      <a-tag color="blue">角色</a-tag>
                    </div>

                    <div class="detail-list">
                      <div>
                        <span>最近更新</span>
                        <strong>{{ formatDate(role.updatedAt) }}</strong>
                      </div>
                    </div>

                    <div class="toolbar-actions">
                      <a-button
                        type="primary"
                        @click="openBackupModal(role)"
                      >
                        备份存档
                      </a-button>
                      <a-button @click="openApplyModal(role)">应用存档</a-button>
                    </div>
                  </a-card>
                </div>

                <a-empty
                  v-else
                  description="未找到可用角色"
                  class="empty-card"
                />
              </a-card>
            </div>
          </template>

          <template v-else>
            <div class="page-section">
              <a-card class="glass-card">
                <div class="card-headline">
                  <div>
                    <h2>存档列表</h2>
                  </div>
                  <a-space wrap>
                    <a-tag color="blue">{{ packages.length }} 个文件</a-tag>
                    <a-button
                      :loading="loading.packages"
                      @click="refreshPackages"
                    >
                      刷新列表
                    </a-button>
                  </a-space>
                </div>

                <div
                  v-if="packages.length"
                  class="archive-grid"
                >
                  <a-card
                    v-for="item in packages"
                    :key="item.filename"
                    class="role-card"
                    :bordered="false"
                  >
                    <div class="role-card__header">
                      <div>
                        <h3>{{ item.displayName }}</h3>
                      </div>
                      <a-tag color="blue">存档</a-tag>
                    </div>

                    <div class="detail-list">
                      <div>
                        <span>创建时间</span>
                        <strong>{{ formatDate(item.createdAt) }}</strong>
                      </div>
                    </div>

                    <div class="toolbar-actions">
                      <a-button @click="openRenameModal(item)">重命名</a-button>
                      <a-button
                        danger
                        :loading="loading.remove"
                        @click="confirmDelete(item)"
                      >
                        删除
                      </a-button>
                    </div>
                  </a-card>
                </div>

                <a-empty
                  v-else
                  description="当前没有本地存档"
                  class="empty-card"
                />
              </a-card>
            </div>
          </template>
        </a-spin>
      </a-layout-content>
    </a-layout>
  </a-layout>

    <a-modal
      v-model:open="showUpdateModal"
      class="toolbox-modal"
      :title="updateState.isForced ? '强制更新' : '发现新版本'"
      :footer="null"
      :closable="!updateState.isForced"
      :mask-closable="!updateState.isForced"
      @cancel="closeUpdateModal"
    >
      <div
        v-if="updateState.status === 'error'"
        class="update-error-panel"
      >
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
          <strong>{{ updateState.releaseNotes || '暂无说明' }}</strong>
        </div>
        <div v-if="updateState.downloadDirectory">
          <span>下载目录</span>
          <strong>{{ updateState.downloadDirectory }}</strong>
          <a-button
            size="small"
            @click="handleOpenDownloadedFile"
          >
            打开所在文件夹
          </a-button>
        </div>
      </div>

      <div class="modal-actions">
        <a-button
          v-if="!updateState.isForced"
          @click="handleSkipCurrentVersion"
        >
          跳过此版本
        </a-button>
        <a-button
          v-if="!updateState.isForced"
          @click="closeUpdateModal"
        >
          稍后再说
        </a-button>
        <a-button
          v-if="updateState.status === 'available'"
          type="primary"
          :loading="loading.updateDownload"
          @click="handleDownloadUpdate"
        >
          立即下载
        </a-button>
        <a-button
          v-if="updateState.status === 'ready'"
          type="primary"
          @click="handleInstallUpdate"
        >
          立即安装
        </a-button>
        <a-button
          v-if="updateState.status === 'error'"
          type="primary"
          :loading="loading.updateCheck"
          @click="handleCheckForUpdates"
        >
          重新检查
        </a-button>
      </div>
    </a-modal>

  <a-modal
    v-model:open="savePathChoiceModal.open"
    class="toolbox-modal"
    title="检测到多个客户端存档，请选择一个"
    ok-text="使用所选路径"
    cancel-text="取消"
    :confirm-loading="loading.savePath"
    @ok="submitSavePathChoice"
    @cancel="closeSavePathChoiceModal"
  >
    <a-radio-group
      v-model:value="savePathChoiceModal.selectedSavePath"
      class="package-picker"
    >
      <div
        v-for="item in bootstrap?.detectedSavePaths ?? []"
        :key="item.client"
        class="package-choice"
        :class="{ 'package-choice--active': savePathChoiceModal.selectedSavePath === item.savePath }"
      >
        <a-radio :value="item.savePath">
          <div class="package-choice__body">
            <strong>{{ getClientLabel(item.client) }}</strong>
            <small>{{ item.playerInfoPath }}</small>
          </div>
        </a-radio>
      </div>
    </a-radio-group>
  </a-modal>

  <a-modal
    v-model:open="backupModal.open"
    class="toolbox-modal"
    title="备份角色存档"
    width="720px"
    :footer="null"
    @cancel="closeBackupModal"
  >
    <a-form layout="vertical">
      <a-form-item label="当前角色">
        <a-input
          :value="backupModal.role ? getRoleDisplayName(backupModal.role) : '未选择'"
          disabled
        />
      </a-form-item>
      <a-form-item label="备份名称">
        <a-input
          v-model:value="backupModal.archiveName"
          placeholder="请输入备份名称"
        />
      </a-form-item>
      <a-form-item label="角色路径">
        <a-input
          :value="backupModal.role?.fullPath || ''"
          disabled
        />
      </a-form-item>
    </a-form>

    <div class="modal-actions">
      <a-button @click="closeBackupModal">取消</a-button>
      <a-button
        type="primary"
        :loading="loading.backup"
        :disabled="!backupModal.role || !backupModal.archiveName.trim()"
        @click="submitBackup"
      >
        创建备份
      </a-button>
    </div>
  </a-modal>
  <a-modal
    v-model:open="applyModal.open"
    class="toolbox-modal"
    title="应用角色存档"
    width="720px"
    :footer="null"
    @cancel="closeApplyModal"
  >
    <a-steps
      :current="applyModal.step"
      size="small"
      class="modal-steps"
    >
      <a-step title="选择存档" />
      <a-step title="勾选同步项" />
    </a-steps>

    <div v-if="applyModal.step === 0">
      <a-empty
        v-if="!packages.length"
        description="当前没有可应用的存档。"
      />

      <a-radio-group
        v-else
        v-model:value="applyModal.selectedPackageFilename"
        class="package-picker"
      >
        <div
          v-for="item in packages"
          :key="item.filename"
          class="package-choice"
          :class="{ 'package-choice--active': applyModal.selectedPackageFilename === item.filename }"
        >
          <a-radio :value="item.filename">
            <div class="package-choice__body">
              <strong>{{ item.displayName }}</strong>
              <small>{{ formatDate(item.createdAt) }} · {{ formatSize(item.size) }}</small>
            </div>
          </a-radio>
        </div>
      </a-radio-group>
    </div>

    <div v-else>
      <div class="setting-panel">
        <div class="path-box path-box--compact">
          <span>当前选中存档</span>
          <strong>{{ selectedPackage?.displayName || '未选择' }}</strong>
        </div>
        <a-checkbox-group
          v-model:value="applyModal.selectedSettings"
          :options="settingCheckboxOptions"
          class="checkbox-group"
        />
      </div>
    </div>

    <div class="modal-actions">
      <a-button @click="closeApplyModal">取消</a-button>
      <a-button
        v-if="applyModal.step === 1"
        @click="applyModal.step = 0"
      >
        上一步
      </a-button>
      <a-button
        v-if="applyModal.step === 0"
        type="primary"
        :disabled="!packages.length || !applyModal.selectedPackageFilename"
        @click="advanceApplyStep"
      >
        下一步
      </a-button>
      <a-button
        v-else
        type="primary"
        :loading="loading.apply"
        :disabled="!applyModal.selectedSettings.length"
        @click="submitApply"
      >
        确定应用
      </a-button>
    </div>
  </a-modal>
  <a-modal
    v-model:open="renameModal.open"
    class="toolbox-modal"
    title="重命名存档"
    ok-text="保存名称"
    cancel-text="取消"
    :confirm-loading="loading.rename"
    @ok="submitRename"
    @cancel="closeRenameModal"
  >
    <a-form layout="vertical">
      <a-form-item label="当前名称">
        <a-input :value="renameModal.target?.displayName" disabled />
      </a-form-item>
      <a-form-item label="新的存档名称">
        <a-input
          v-model:value="renameModal.newDisplayName"
          placeholder="请输入新名称"
        />
      </a-form-item>
    </a-form>
  </a-modal>

  <a-modal
    v-model:open="uidMappingModal.open"
    class="toolbox-modal"
    title="上传 UID 关联"
    ok-text="保存关联"
    cancel-text="取消"
    :confirm-loading="loading.uidMappingSave"
    @ok="submitUidMapping"
    @cancel="closeUidMappingModal"
  >
    <a-form layout="vertical">
      <a-form-item label="UID">
        <a-input
          v-model:value="uidMappingModal.uid"
          placeholder="请输入 UID"
        />
      </a-form-item>
      <a-form-item label="角色名">
        <a-input
          v-model:value="uidMappingModal.uname"
          placeholder="请输入角色名"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
