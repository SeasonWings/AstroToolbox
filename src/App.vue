<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { getClientLabel, getErrorMessage } from './composables/useFormat';
import { useWindowControls } from './composables/useWindowControls';
import { useBootstrapStore } from './stores/bootstrap';
import { usePackagesStore } from './stores/packages';
import { useRolesStore } from './stores/roles';
import { useUidMappingsStore } from './stores/uidMappings';
import { useUpdateStore } from './stores/update';

const route = useRoute();
const router = useRouter();
const bootstrapStore = useBootstrapStore();
const rolesStore = useRolesStore();
const packagesStore = usePackagesStore();
const uidMappingsStore = useUidMappingsStore();
const updateStore = useUpdateStore();
const { isWindowMaximized, syncMaximizedState, minimize, toggleMaximize, close } = useWindowControls();

const openMenuKeys = ref<string[]>(['role-sync']);
const savePathChoiceModal = reactive({
  open: false,
  selectedSavePath: '',
  fromRequiredChoice: false,
});

const pageMeta: Record<string, { title: string }> = {
  config: { title: '工具箱配置' },
  roles: { title: '角色备份' },
  archives: { title: '存档管理' },
  home: { title: '工具箱配置' },
};

const viewTitle = computed(() => pageMeta[String(route.name)]?.title ?? '工具箱配置');
const selectedMenuKeys = computed(() => {
  if (route.name === 'roles') {
    return ['roles'];
  }

  if (route.name === 'archives') {
    return ['archives'];
  }

  return [];
});

const stats = computed(() => ({
  roleCount: rolesStore.roles.length,
  packageCount: packagesStore.packages.length,
  savePathExists: bootstrapStore.savePathExists,
}));

const updateStatusLabel = computed(() => updateStore.updateStatusLabel);
const updateStatusColor = computed(() => updateStore.updateStatusColor);

async function runSafe(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

function openSavePathChoiceModal(detectedOnly = false): void {
  if (!bootstrapStore.detectedSavePaths.length) {
    message.warning('当前未检测到可用存档路径。');
    return;
  }

  savePathChoiceModal.selectedSavePath =
    bootstrapStore.editableSavePath || bootstrapStore.detectedSavePaths[0]?.savePath || '';
  savePathChoiceModal.fromRequiredChoice =
    !detectedOnly && Boolean(bootstrapStore.requiresSavePathChoice && !bootstrapStore.bootstrap?.savePath);
  savePathChoiceModal.open = true;
}

function closeSavePathChoiceModal(): void {
  savePathChoiceModal.open = false;

  if (savePathChoiceModal.fromRequiredChoice && !bootstrapStore.bootstrap?.savePath) {
    bootstrapStore.editableSavePath = '';
  }

  savePathChoiceModal.fromRequiredChoice = false;
}

async function saveChosenDetectedPath(savePath: string): Promise<void> {
  try {
    await bootstrapStore.saveSavePath(savePath);
    await rolesStore.refreshRoles();
    message.success('存档路径已保存。');
  } catch (error) {
    message.error(getErrorMessage(error));
  }
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

async function refreshAll(): Promise<void> {
  await runSafe(() => bootstrapStore.refreshBootstrap());

  if (bootstrapStore.requiresSavePathChoice && bootstrapStore.detectedSavePaths.length > 1) {
    openSavePathChoiceModal();
  }

  await Promise.all([
    runSafe(() => rolesStore.refreshRoles()),
    runSafe(() => packagesStore.refreshPackages()),
    runSafe(() => uidMappingsStore.refreshUidMappings()),
  ]);
}

async function handleMinimizeWindow(): Promise<void> {
  await minimize();
}

async function handleToggleMaximizeWindow(): Promise<void> {
  await toggleMaximize();
}

async function handleCloseWindow(): Promise<void> {
  await close();
}

provide('openSavePathChoiceModal', openSavePathChoiceModal);

onMounted(async () => {
  updateStore.startListening();
  await refreshAll();

  if (route.name === 'home') {
    await router.replace(bootstrapStore.hasSavePath ? '/roles' : '/config');
  }

  void syncMaximizedState();
  void runSafe(() => updateStore.refreshUpdateState());
});

onUnmounted(() => {
  updateStore.stopListening();
});
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-sider class="sidebar" :width="272">
      <div class="brand-panel">
        <div>
          <div class="brand-title">AstroToolbox</div>
        </div>
      </div>

      <a-menu
        v-model:open-keys="openMenuKeys"
        :selected-keys="selectedMenuKeys"
        class="nav-menu"
        mode="inline"
        theme="light"
      >
        <a-sub-menu key="role-sync">
          <template #title>角色同步</template>
          <a-menu-item key="roles" @click="router.push('/roles')">角色备份</a-menu-item>
          <a-menu-item key="archives" @click="router.push('/archives')">存档管理</a-menu-item>
        </a-sub-menu>
      </a-menu>
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="topbar">
        <div class="topbar-left">
          <h1 class="page-title">{{ viewTitle }}</h1>
        </div>

        <div class="topbar-right">
          <a-space class="topbar-actions" wrap>
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
              @click="router.push('/config')"
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
        <a-spin :spinning="bootstrapStore.loading" tip="正在加载 AstroToolbox...">
          <router-view />
        </a-spin>
      </a-layout-content>
    </a-layout>
  </a-layout>

  <a-modal
    v-model:open="savePathChoiceModal.open"
    class="toolbox-modal"
    title="检测到多个客户端存档，请选择一个"
    ok-text="使用所选路径"
    cancel-text="取消"
    :confirm-loading="bootstrapStore.saving"
    @ok="submitSavePathChoice"
    @cancel="closeSavePathChoiceModal"
  >
    <a-radio-group v-model:value="savePathChoiceModal.selectedSavePath" class="package-picker">
      <div
        v-for="item in bootstrapStore.detectedSavePaths"
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
</template>

<style scoped>
.app-shell.ant-layout {
  min-height: 100vh;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: transparent;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.app-shell.ant-layout::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.sidebar.ant-layout-sider {
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(238, 245, 255, 0.96)),
    radial-gradient(circle at top, rgba(77, 150, 255, 0.12), transparent 38%);
  padding: 26px 20px 20px;
  box-shadow: none;
}

.brand-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 8px 22px;
  color: var(--ink-main);
}

.brand-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.nav-menu.ant-menu-light.ant-menu-root.ant-menu-inline,
.nav-menu.ant-menu-light.ant-menu-root.ant-menu-vertical {
  background: transparent;
  border-inline-end: none !important;
}

.nav-menu.ant-menu-light :deep(.ant-menu-item) {
  display: flex;
  align-items: center;
  border-radius: 14px;
  margin-block: 8px;
  height: 48px;
  line-height: 48px;
  font-size: 15px;
  color: var(--ink-main);
}

.nav-menu.ant-menu-light :deep(.ant-menu-item-selected) {
  background: linear-gradient(135deg, rgba(77, 150, 255, 0.16), rgba(47, 115, 222, 0.18));
  color: #1d4ed8;
}

.nav-menu.ant-menu-light :deep(.ant-menu-item:hover) {
  background: rgba(77, 150, 255, 0.08);
}

.topbar.ant-layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: auto;
  min-height: 72px;
  padding: 14px 18px 14px 36px;
  position: sticky;
  top: 0;
  z-index: 900;
  background: #ffffff;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line-soft);
  -webkit-app-region: drag;
}

.topbar-left {
  min-width: 0;
}

.page-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.12;
  letter-spacing: -0.02em;
}

.topbar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  min-width: 0;
}

.topbar-actions {
  justify-content: flex-end;
  align-items: center;
  max-width: 540px;
  -webkit-app-region: no-drag;
}

.topbar-actions :deep(.ant-tag) {
  border-radius: 999px;
  padding-inline: 12px;
  margin-inline-end: 0;
}

.topbar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.toolbar-icon-btn,
.window-control-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink-main);
  cursor: pointer;
  user-select: none;
  font-size: 18px;
  line-height: 1;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.toolbar-icon-btn:hover,
.window-control-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(77, 150, 255, 0.34);
  background: rgba(77, 150, 255, 0.1);
}

.window-control-btn--close:hover {
  border-color: rgba(220, 38, 38, 0.35);
  background: rgba(220, 38, 38, 0.14);
  color: #b91c1c;
}

.content.ant-layout-content {
  padding: 12px 36px 36px;
  background: transparent;
}

.toolbox-modal :deep(.ant-modal-content),
.toolbox-modal :deep(.ant-modal-header) {
  border-radius: 22px;
}

.package-picker {
  display: grid;
  gap: 12px;
}

.package-choice {
  padding: 14px 16px;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.76);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.package-choice:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.package-choice--active {
  border-color: rgba(77, 150, 255, 0.4);
  box-shadow: 0 12px 28px rgba(77, 150, 255, 0.12);
}

.package-choice__body {
  display: grid;
  gap: 4px;
  margin-left: 10px;
}

.package-choice__body small {
  color: var(--ink-muted);
}

@media (max-width: 980px) {
  .app-shell.ant-layout {
    flex-direction: column;
  }

  .sidebar.ant-layout-sider {
    position: static;
    width: 100% !important;
    max-width: none !important;
    flex: none !important;
    height: auto;
  }

  .topbar.ant-layout-header,
  .content.ant-layout-content {
    padding-inline: 20px;
  }

  .topbar.ant-layout-header {
    flex-direction: column;
    align-items: flex-start;
    -webkit-app-region: no-drag;
  }

  .topbar-right {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 640px) {
  .page-title {
    font-size: 28px;
  }

  .topbar-right {
    flex-direction: column;
    align-items: flex-start;
  }

  .topbar-actions {
    justify-content: flex-start;
  }
}
</style>
