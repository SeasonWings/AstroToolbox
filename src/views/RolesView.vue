<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import { storeToRefs } from 'pinia';
import type { RoleProfile } from '@shared/index';
import ApplyModal from '../components/ApplyModal.vue';
import BackupModal from '../components/BackupModal.vue';
import { formatDate, getErrorMessage } from '../composables/useFormat';
import { matchesSearch } from '../composables/useSearch';
import { useRolesStore } from '../stores/roles';
import { useUidMappingsStore } from '../stores/uidMappings';

const rolesStore = useRolesStore();
const uidMappingsStore = useUidMappingsStore();
const { roles, loading, sortedRoles } = storeToRefs(rolesStore);

const backupOpen = ref(false);
const backupRole = ref<RoleProfile | null>(null);
const applyOpen = ref(false);
const applyRole = ref<RoleProfile | null>(null);
const searchKeyword = ref('');

function getRoleDisplayName(role?: RoleProfile | null): string {
  if (!role) {
    return '';
  }

  return uidMappingsStore.uidToUnameMap.get(role.folderName) ?? role.folderName;
}

const filteredRoles = computed(() => {
  const keyword = searchKeyword.value;

  return sortedRoles.value.filter((role) => {
    const displayName = getRoleDisplayName(role);
    return matchesSearch(displayName, keyword) || matchesSearch(role.folderName, keyword);
  });
});

function openBackupModal(role: RoleProfile): void {
  backupRole.value = role;
  backupOpen.value = true;
}

function openApplyModal(role: RoleProfile): void {
  applyRole.value = role;
  applyOpen.value = true;
}

async function refreshRoles(): Promise<void> {
  try {
    await rolesStore.refreshRoles();
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}

onMounted(() => {
  void refreshRoles();
});
</script>

<template>
  <div class="page-section">
    <a-card class="glass-card">
      <div class="card-headline">
        <div>
          <h2>角色列表</h2>
        </div>
        <a-space wrap>
          <a-tag color="blue">{{ filteredRoles.length }} 个角色</a-tag>
          <a-button :loading="loading" @click="refreshRoles">重新扫描</a-button>
        </a-space>
      </div>

      <a-input-search v-model:value="searchKeyword" placeholder="搜索角色名或 UID" allow-clear class="search-input" />

      <div v-if="filteredRoles.length" class="role-grid">
        <a-card v-for="role in filteredRoles" :key="role.id" class="role-card" :bordered="false">
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
            <a-button type="primary" @click="openBackupModal(role)">备份存档</a-button>
            <a-button @click="openApplyModal(role)">应用存档</a-button>
          </div>
        </a-card>
      </div>

      <a-empty v-else :description="roles.length ? '未找到匹配的角色' : '未找到可用角色'" class="empty-card" />
    </a-card>
  </div>

  <BackupModal v-model:open="backupOpen" :role="backupRole" />
  <ApplyModal v-model:open="applyOpen" :role="applyRole" />
</template>
