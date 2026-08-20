<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { message } from 'ant-design-vue';
import { storeToRefs } from 'pinia';
import UidMappingModal from '../components/UidMappingModal.vue';
import UpdatePanel from '../components/UpdatePanel.vue';
import { getErrorMessage } from '../composables/useFormat';
import { useBootstrapStore } from '../stores/bootstrap';
import { usePackagesStore } from '../stores/packages';
import { useRolesStore } from '../stores/roles';
import { useUidMappingsStore } from '../stores/uidMappings';

const openSavePathChoiceModal = inject<(detectedOnly?: boolean) => void>('openSavePathChoiceModal', () => {});

const bootstrapStore = useBootstrapStore();
const rolesStore = useRolesStore();
const packagesStore = usePackagesStore();
const uidMappingsStore = useUidMappingsStore();
const { bootstrap, editableSavePath, saving } = storeToRefs(bootstrapStore);
const uidMappingLoading = storeToRefs(uidMappingsStore).loading;

const uidMappingOpen = ref(false);

const stats = computed(() => ({
  roleCount: rolesStore.roles.length,
  packageCount: packagesStore.packages.length,
}));

async function handleBrowseSavePath(): Promise<void> {
  try {
    const selectedPath = await window.astroToolbox.chooseSavePath();

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

  try {
    await bootstrapStore.saveSavePath(targetPath);
    await rolesStore.refreshRoles();
    message.success('存档路径已保存。');
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function handleOpenArchiveFolder(): Promise<void> {
  try {
    await window.astroToolbox.openArchiveFolder();
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}
</script>

<template>
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
          <a-input v-model:value="editableSavePath" placeholder="请输入路径" size="large" />
        </a-form-item>

        <div class="toolbar-actions">
          <a-button type="primary" size="large" :loading="saving" @click="handleSavePath">保存配置</a-button>
          <a-button size="large" @click="handleBrowseSavePath">浏览目录</a-button>
          <a-button size="large" @click="handleUseDetectedPath">使用自动识别</a-button>
          <a-button v-if="bootstrap?.backupDirectory" size="large" @click="handleOpenArchiveFolder">
            打开当前存档文件夹
          </a-button>
          <a-button size="large" :loading="uidMappingLoading" @click="uidMappingOpen = true">上传 UID 关联</a-button>
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

    <UpdatePanel />
  </div>

  <UidMappingModal v-model:open="uidMappingOpen" />
</template>
