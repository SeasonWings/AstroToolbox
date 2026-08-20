<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { storeToRefs } from 'pinia';
import type { RoleProfile } from '@shared/index';
import { getErrorMessage } from '../composables/useFormat';
import { usePackagesStore } from '../stores/packages';
import { useUidMappingsStore } from '../stores/uidMappings';

const props = defineProps<{
  open: boolean;
  role: RoleProfile | null;
}>();

const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>();

const packagesStore = usePackagesStore();
const uidMappingsStore = useUidMappingsStore();
const backupLoading = storeToRefs(packagesStore).backupLoading;
const archiveName = ref('');

const roleDisplayName = computed(() => {
  if (!props.role) {
    return '';
  }

  return uidMappingsStore.uidToUnameMap.get(props.role.folderName) ?? props.role.folderName;
});

watch(
  () => props.open,
  (open) => {
    if (open) {
      archiveName.value = props.role?.folderName ?? '';
    }
  },
);

function close(): void {
  emit('update:open', false);
}

async function submit(): Promise<void> {
  if (!props.role) {
    return;
  }

  try {
    const created = await packagesStore.createBackup({
      rolePath: props.role.fullPath,
      archiveName: archiveName.value,
    });

    message.success(`已创建存档：${created.filename}`);
    close();
    await packagesStore.refreshPackages();
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}
</script>

<template>
  <a-modal :open="open" class="toolbox-modal" title="备份角色存档" width="720px" :footer="null" @cancel="close">
    <a-form layout="vertical">
      <a-form-item label="当前角色">
        <a-input :value="roleDisplayName || '未选择'" disabled />
      </a-form-item>
      <a-form-item label="备份名称">
        <a-input v-model:value="archiveName" placeholder="请输入备份名称" />
      </a-form-item>
      <a-form-item label="角色路径">
        <a-input :value="role?.fullPath || ''" disabled />
      </a-form-item>
    </a-form>

    <div class="modal-actions">
      <a-button @click="close">取消</a-button>
      <a-button type="primary" :loading="backupLoading" :disabled="!role || !archiveName.trim()" @click="submit">
        创建备份
      </a-button>
    </div>
  </a-modal>
</template>
