<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { storeToRefs } from 'pinia';
import type { BackupPackageInfo } from '@shared/index';
import { getErrorMessage } from '../composables/useFormat';
import { usePackagesStore } from '../stores/packages';

const props = defineProps<{
  open: boolean;
  target: BackupPackageInfo | null;
}>();

const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>();

const packagesStore = usePackagesStore();
const renameLoading = storeToRefs(packagesStore).renameLoading;
const newDisplayName = ref('');

watch(
  () => props.open,
  (open) => {
    if (open) {
      newDisplayName.value = props.target?.displayName ?? '';
    }
  },
);

function close(): void {
  emit('update:open', false);
}

async function submit(): Promise<void> {
  if (!props.target) {
    return;
  }

  try {
    await packagesStore.renameBackup({
      filename: props.target.filename,
      newDisplayName: newDisplayName.value,
    });

    message.success('存档名称已更新。');
    close();
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}
</script>

<template>
  <a-modal
    :open="open"
    class="toolbox-modal"
    title="重命名存档"
    ok-text="保存名称"
    cancel-text="取消"
    :confirm-loading="renameLoading"
    @ok="submit"
    @cancel="close"
  >
    <a-form layout="vertical">
      <a-form-item label="当前名称">
        <a-input :value="target?.displayName" disabled />
      </a-form-item>
      <a-form-item label="新的存档名称">
        <a-input v-model:value="newDisplayName" placeholder="请输入新名称" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
