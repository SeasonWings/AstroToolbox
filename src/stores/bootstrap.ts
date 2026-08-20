import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { ToolboxBootstrap } from '@shared/index';

const getApi = () => window.astroToolbox;

export const useBootstrapStore = defineStore('bootstrap', () => {
  const bootstrap = ref<ToolboxBootstrap | null>(null);
  const editableSavePath = ref('');
  const loading = ref(false);
  const saving = ref(false);

  const savePathExists = computed(() => Boolean(bootstrap.value?.savePathExists));
  const autoDetectedExists = computed(() => Boolean(bootstrap.value?.autoDetectedExists));
  const hasSavePath = computed(() => savePathExists.value || autoDetectedExists.value);
  const detectedSavePaths = computed(() => bootstrap.value?.detectedSavePaths ?? []);
  const requiresSavePathChoice = computed(() => Boolean(bootstrap.value?.requiresSavePathChoice));

  async function refreshBootstrap(): Promise<void> {
    loading.value = true;
    try {
      bootstrap.value = await getApi().getBootstrap();
      editableSavePath.value = bootstrap.value.savePath;
    } finally {
      loading.value = false;
    }
  }

  async function saveSavePath(savePath: string): Promise<void> {
    saving.value = true;
    try {
      bootstrap.value = await getApi().updateSavePath(savePath);
      editableSavePath.value = bootstrap.value.savePath;
    } finally {
      saving.value = false;
    }
  }

  async function saveUpdatePreferences(payload: {
    autoUpdateEnabled: boolean;
    updateChannel: string;
    skippedUpdateVersion?: string | null;
  }): Promise<void> {
    bootstrap.value = await getApi().setUpdatePreferences(payload);
  }

  return {
    bootstrap,
    editableSavePath,
    loading,
    saving,
    savePathExists,
    autoDetectedExists,
    hasSavePath,
    detectedSavePaths,
    requiresSavePathChoice,
    refreshBootstrap,
    saveSavePath,
    saveUpdatePreferences,
  };
});
