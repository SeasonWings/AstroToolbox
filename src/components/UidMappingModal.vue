<script setup lang="ts">
import { ref, watch } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { getErrorMessage } from '../composables/useFormat';
import { useUidMappingsStore } from '../stores/uidMappings';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>();

const uidMappingsStore = useUidMappingsStore();
const uid = ref('');
const uname = ref('');
const saving = ref(false);

watch(
  () => props.open,
  (open) => {
    if (open) {
      uid.value = '';
      uname.value = '';
    }
  },
);

function close(): void {
  emit('update:open', false);
}

async function performSave(currentUid: string, currentUname: string): Promise<void> {
  saving.value = true;

  try {
    await uidMappingsStore.upsert(currentUid, currentUname);
    message.success('UID 关联已保存。');
    close();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

function submit(): void {
  const currentUid = uid.value.trim();
  const currentUname = uname.value.trim();

  if (!currentUid || !currentUname) {
    message.warning('请先输入 UID 和角色名。');
    return;
  }

  const existingUname = uidMappingsStore.uidToUnameMap.get(currentUid);

  if (existingUname) {
    Modal.confirm({
      title: `UID ${currentUid} 已关联为 ${existingUname}，是否更新为 ${currentUname}？`,
      okText: '更新',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => performSave(currentUid, currentUname),
    });
    return;
  }

  void performSave(currentUid, currentUname);
}
</script>

<template>
  <a-modal
    :open="open"
    class="toolbox-modal"
    title="上传 UID 关联"
    ok-text="保存关联"
    cancel-text="取消"
    :confirm-loading="saving"
    @ok="submit"
    @cancel="close"
  >
    <a-form layout="vertical">
      <a-form-item label="UID">
        <a-input v-model:value="uid" placeholder="请输入 UID" />
      </a-form-item>
      <a-form-item label="角色名">
        <a-input v-model:value="uname" placeholder="请输入角色名" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
