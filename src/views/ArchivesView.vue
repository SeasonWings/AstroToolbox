<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { storeToRefs } from 'pinia';
import type { BackupPackageInfo } from '@shared/index';
import RenameModal from '../components/RenameModal.vue';
import { formatDate, getErrorMessage } from '../composables/useFormat';
import { matchesSearch } from '../composables/useSearch';
import { usePackagesStore } from '../stores/packages';

const packagesStore = usePackagesStore();
const { packages, loading, removeLoading } = storeToRefs(packagesStore);

const renameOpen = ref(false);
const renameTarget = ref<BackupPackageInfo | null>(null);
const searchKeyword = ref('');

const filteredPackages = computed(() => {
  const keyword = searchKeyword.value;

  return packages.value.filter((item) => matchesSearch(item.displayName, keyword));
});

function openRenameModal(target: BackupPackageInfo): void {
  renameTarget.value = target;
  renameOpen.value = true;
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

async function submitDelete(target: BackupPackageInfo): Promise<void> {
  try {
    await packagesStore.deleteBackup({ filename: target.filename });
    message.success('存档已删除。');
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

async function refreshPackages(): Promise<void> {
  try {
    await packagesStore.refreshPackages();
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

onMounted(() => {
  void refreshPackages();
});
</script>

<template>
  <div class="page-section">
    <a-card class="glass-card">
      <div class="card-headline">
        <div>
          <h2>存档列表</h2>
        </div>
        <a-space wrap>
          <a-tag color="blue">{{ filteredPackages.length }} 个文件</a-tag>
          <a-button :loading="loading" @click="refreshPackages">刷新列表</a-button>
        </a-space>
      </div>

      <a-input-search v-model:value="searchKeyword" placeholder="搜索存档名" allow-clear class="search-input" />

      <div v-if="filteredPackages.length" class="archive-grid">
        <a-card v-for="item in filteredPackages" :key="item.filename" class="role-card" :bordered="false">
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
            <a-button danger :loading="removeLoading" @click="confirmDelete(item)">删除</a-button>
          </div>
        </a-card>
      </div>

      <a-empty v-else :description="packages.length ? '未找到匹配的存档' : '当前没有本地存档'" class="empty-card" />
    </a-card>
  </div>

  <RenameModal v-model:open="renameOpen" :target="renameTarget" />
</template>
