import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { UidUnameMapping } from '@shared/index';

const getApi = () => window.astroToolbox;

export const useUidMappingsStore = defineStore('uidMappings', () => {
  const uidMappings = ref<UidUnameMapping[]>([]);
  const loading = ref(false);

  const uidToUnameMap = computed(() => new Map(uidMappings.value.map((item) => [item.uid, item.uname] as const)));

  async function refreshUidMappings(): Promise<void> {
    loading.value = true;
    try {
      uidMappings.value = await getApi().listUidUnameMappings();
    } catch (error) {
      uidMappings.value = [];
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function upsert(uid: string, uname: string): Promise<void> {
    await getApi().upsertUidUnameMapping({ uid, uname });
    await refreshUidMappings();
  }

  return { uidMappings, loading, uidToUnameMap, refreshUidMappings, upsert };
});
