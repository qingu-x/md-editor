<script setup lang="ts">
import { ref, watch } from 'vue';
import type { StorageType } from '../../storage/types';
import { useStorageStore } from '../../store/storageStore';

const storageStore = useStorageStore();
const loading = ref(false);

const OPTIONS: { type: StorageType; label: string; description: string; notice: string }[] = [
  {
    type: 'filesystem',
    label: '本地存储模式',
    description: '直接读写指定文件夹中的 .md 文件，体验接近桌面版。',
    notice: '⚠️ 注意：更换浏览器或清理站点权限后，需要重新授予该文件夹的访问权限。',
  },
  {
    type: 'indexeddb',
    label: '浏览器存储模式',
    description: '文章会保存在浏览器里，关掉网页文章依然存在，适用于所有浏览器。',
    notice: '⚠️ 注意：只有在“清除浏览数据”里勾选“Cookie 及其他网站数据”并清除时才会删除文章，单独清理历史记录或缓存不会影响文章。',
  },
];

const handleSelect = async (nextType: StorageType) => {
  loading.value = true;
  await storageStore.select(nextType);
  loading.value = false;
};

watch(() => storageStore.ready, (ready) => {
  if (ready) loading.value = false;
});
</script>

<template>
  <div class="storage-mode-selector">
    <p class="storage-mode-tip">选择文章保存的位置：默认保存在浏览器内，也可以授权一个本地文件夹。</p>
    <div class="storage-mode-options">
      <button
        v-for="option in OPTIONS"
        :key="option.type"
        :class="['storage-mode-option', storageStore.type === option.type ? 'active' : '']"
        :disabled="(option.type === 'filesystem' && !storageStore.isFileSystemSupported) || loading"
        @click="handleSelect(option.type)"
      >
        <div class="storage-mode-option__label">
          <span>{{ option.label }}</span>
          <small v-if="storageStore.type === option.type">当前</small>
        </div>
        <p>{{ (option.type === 'filesystem' && !storageStore.isFileSystemSupported) ? '当前浏览器不支持 File System Access API' : option.description }}</p>
        <p class="storage-mode-notice">{{ option.notice }}</p>
      </button>
    </div>
    <div v-if="storageStore.message" class="storage-mode-status">{{ storageStore.message }}</div>
  </div>
</template>

<style scoped>
@import "./StorageModeSelector.css";
</style>
