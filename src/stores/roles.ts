import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { RoleProfile } from '@shared/index';
import { useBootstrapStore } from './bootstrap';
import { useUidMappingsStore } from './uidMappings';

const getApi = () => window.astroToolbox;

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<RoleProfile[]>([]);
  const loading = ref(false);

  const uidMappingsStore = useUidMappingsStore();
  const sortedRoles = computed(() => {
    const uidToUnameMap = uidMappingsStore.uidToUnameMap;

    return [...roles.value].sort((left, right) => {
      const leftHasMapping = uidToUnameMap.has(left.folderName);
      const rightHasMapping = uidToUnameMap.has(right.folderName);

      if (leftHasMapping !== rightHasMapping) {
        return Number(rightHasMapping) - Number(leftHasMapping);
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
  });

  async function refreshRoles(): Promise<void> {
    const bootstrapStore = useBootstrapStore();
    const savePath = bootstrapStore.bootstrap?.savePath;

    if (!savePath) {
      roles.value = [];
      return;
    }

    loading.value = true;
    try {
      roles.value = await getApi().scanRoles(savePath);
    } catch (error) {
      roles.value = [];
      throw error;
    } finally {
      loading.value = false;
    }
  }

  return { roles, loading, sortedRoles, refreshRoles };
});
