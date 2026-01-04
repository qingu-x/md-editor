import { defineStore } from 'pinia';
import { ref, computed, onMounted } from 'vue';
import type { StorageAdapter } from '../storage/StorageAdapter';
import { StorageManager } from '../storage/StorageManager';
import type { StorageType } from '../storage/types';

export const useStorageStore = defineStore('storage', () => {
  const manager = new StorageManager();
  const adapter = ref<StorageAdapter | null>(null);
  const type = ref<StorageType>('indexeddb');
  const ready = ref(false);
  const message = ref('');

  const isFileSystemSupported = computed(() => StorageManager.isFileSystemSupported());

  async function restoreLastAdapter() {
    try {
      const instance = await manager.restoreLastAdapter();
      if (instance) {
        adapter.value = instance;
        type.value = instance.type;
        ready.value = true;
        message.value = instance.type === 'filesystem' ? '已启用本地文件夹模式' : '已启用浏览器存储模式';
      }
    } catch (error: any) {
      message.value = error.message;
    }
  }

  async function select(nextType: StorageType) {
    const result = await manager.setAdapter(nextType);
    adapter.value = manager.currentAdapter;
    type.value = nextType;
    ready.value = result.ready;
    if (result.ready) {
      message.value = nextType === 'filesystem' ? '已切换到本地文件夹模式' : '已切换到浏览器存储模式';
    } else {
      message.value = result.message ?? '初始化失败，请重试';
    }
    return result;
  }

  onMounted(() => {
    restoreLastAdapter();
  });

  return {
    adapter,
    type,
    ready,
    message,
    isFileSystemSupported,
    select,
  };
});
