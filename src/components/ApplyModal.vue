<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { storeToRefs } from 'pinia';
import { REQUIRED_SETTING_FILES, SETTING_LABELS, type RoleProfile, type SettingKey } from '@shared/index';
import { formatDate, formatSize, getErrorMessage } from '../composables/useFormat';
import { usePackagesStore } from '../stores/packages';
import { useRolesStore } from '../stores/roles';

const props = defineProps<{
  open: boolean;
  role: RoleProfile | null;
}>();

const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>();

const packagesStore = usePackagesStore();
const rolesStore = useRolesStore();
const { packages, applyLoading } = storeToRefs(packagesStore);

const step = ref(0);
const selectedPackageFilename = ref('');
const selectedSettings = ref<SettingKey[]>([]);

const settingOptions = (Object.entries(REQUIRED_SETTING_FILES) as [SettingKey, string][]).map(([value]) => ({
  value,
  label: SETTING_LABELS[value],
}));

const settingCheckboxOptions = settingOptions.map((option) => ({
  value: option.value,
  label: option.label,
}));

const selectedPackage = computed(
  () => packages.value.find((item) => item.filename === selectedPackageFilename.value) ?? null,
);

watch(
  () => props.open,
  async (open) => {
    if (!open || !props.role) {
      return;
    }

    step.value = 0;

    try {
      await packagesStore.refreshPackages();
    } catch (error) {
      message.error(getErrorMessage(error));
    }

    selectedPackageFilename.value = packages.value[0]?.filename ?? '';
    selectedSettings.value = settingOptions.map((option) => option.value);
  },
);

function close(): void {
  emit('update:open', false);
}

function advanceStep(): void {
  if (!selectedPackageFilename.value) {
    message.warning('请先选择一个要应用的存档。');
    return;
  }

  step.value = 1;
}

async function submit(): Promise<void> {
  if (!props.role) {
    return;
  }

  if (!selectedSettings.value.length) {
    message.warning('请至少选择一个设置项。');
    return;
  }

  try {
    await packagesStore.applyBackup({
      rolePath: props.role.fullPath,
      packageFilename: selectedPackageFilename.value,
      selectedSettings: [...selectedSettings.value],
    });

    message.success('存档设置已成功应用到目标角色。');
    close();
  } catch (error) {
    message.error(getErrorMessage(error));
  }

  try {
    await rolesStore.refreshRoles();
  } catch (error) {
    message.error(getErrorMessage(error));
  }
}
</script>

<template>
  <a-modal :open="open" class="toolbox-modal" title="应用角色存档" width="720px" :footer="null" @cancel="close">
    <a-steps :current="step" size="small" class="modal-steps">
      <a-step title="选择存档" />
      <a-step title="勾选同步项" />
    </a-steps>

    <div v-if="step === 0">
      <a-empty v-if="!packages.length" description="当前没有可应用的存档。" />

      <a-radio-group v-else v-model:value="selectedPackageFilename" class="package-picker">
        <div
          v-for="item in packages"
          :key="item.filename"
          class="package-choice"
          :class="{ 'package-choice--active': selectedPackageFilename === item.filename }"
        >
          <a-radio :value="item.filename">
            <div class="package-choice__body">
              <strong>{{ item.displayName }}</strong>
              <small>{{ formatDate(item.createdAt) }} · {{ formatSize(item.size) }}</small>
            </div>
          </a-radio>
        </div>
      </a-radio-group>
    </div>

    <div v-else>
      <div class="setting-panel">
        <div class="path-box path-box--compact">
          <span>当前选中存档</span>
          <strong>{{ selectedPackage?.displayName || '未选择' }}</strong>
        </div>
        <a-checkbox-group v-model:value="selectedSettings" :options="settingCheckboxOptions" class="checkbox-group" />
      </div>
    </div>

    <div class="modal-actions">
      <a-button @click="close">取消</a-button>
      <a-button v-if="step === 1" @click="step = 0">上一步</a-button>
      <a-button
        v-if="step === 0"
        type="primary"
        :disabled="!packages.length || !selectedPackageFilename"
        @click="advanceStep"
      >
        下一步
      </a-button>
      <a-button v-else type="primary" :loading="applyLoading" :disabled="!selectedSettings.length" @click="submit">
        确定应用
      </a-button>
    </div>
  </a-modal>
</template>
