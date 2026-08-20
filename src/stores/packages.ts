import { ref } from 'vue';
import { defineStore } from 'pinia';
import type {
  ApplyBackupPayload,
  BackupPackageInfo,
  CreateBackupPayload,
  DeleteBackupPayload,
  RenameBackupPayload,
} from '@shared/index';

const getApi = () => window.astroToolbox;

export const usePackagesStore = defineStore('packages', () => {
  const packages = ref<BackupPackageInfo[]>([]);
  const loading = ref(false);
  const backupLoading = ref(false);
  const applyLoading = ref(false);
  const renameLoading = ref(false);
  const removeLoading = ref(false);

  async function refreshPackages(): Promise<void> {
    loading.value = true;
    try {
      packages.value = await getApi().listPackages();
    } catch (error) {
      packages.value = [];
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createBackup(payload: CreateBackupPayload): Promise<BackupPackageInfo> {
    backupLoading.value = true;
    try {
      return await getApi().createBackup(payload);
    } finally {
      backupLoading.value = false;
    }
  }

  async function applyBackup(payload: ApplyBackupPayload): Promise<void> {
    applyLoading.value = true;
    try {
      await getApi().applyBackup(payload);
    } finally {
      applyLoading.value = false;
    }
  }

  async function renameBackup(payload: RenameBackupPayload): Promise<void> {
    renameLoading.value = true;
    try {
      packages.value = await getApi().renameBackup(payload);
    } finally {
      renameLoading.value = false;
    }
  }

  async function deleteBackup(payload: DeleteBackupPayload): Promise<void> {
    removeLoading.value = true;
    try {
      packages.value = await getApi().deleteBackup(payload);
    } finally {
      removeLoading.value = false;
    }
  }

  return {
    packages,
    loading,
    backupLoading,
    applyLoading,
    renameLoading,
    removeLoading,
    refreshPackages,
    createBackup,
    applyBackup,
    renameBackup,
    deleteBackup,
  };
});
