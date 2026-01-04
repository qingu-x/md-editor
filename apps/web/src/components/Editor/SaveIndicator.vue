<template>
  <span v-if="isSaving" class="save-indicator saving">保存中...</span>
  <span v-else-if="isDirty" class="save-indicator unsaved">编辑中</span>
  <span v-else-if="displayText" class="save-indicator saved">{{ displayText }}</span>
  <span v-else class="save-indicator ready">就绪</span>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';
import { useFileStore } from '../../store/fileStore';
import { useEditorStore } from '../../store/editorStore';

/**
 * 格式化相对时间
 */
function formatRelativeTime(date: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 10) return "刚刚保存";
  if (diffSec < 60) return `${diffSec} 秒前保存`;
  if (diffMin < 60) return `${diffMin} 分钟前保存`;
  if (diffHour < 24) return `${diffHour} 小时前保存`;

  // 超过 24 小时显示具体时间
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} 保存`;
}

const fileStore = useFileStore();
const editorStore = useEditorStore();

const displayText = ref("");

// 判断是否处于文件系统模式
const isFileMode = computed(() => !!fileStore.currentFile);

// 选择使用哪个状态
const lastSavedAt = computed(() => isFileMode.value ? fileStore.lastSavedAt : editorStore.lastAutoSavedAt);
const isDirty = computed(() => isFileMode.value ? fileStore.isDirty : editorStore.isEditing);
const isSaving = computed(() => isFileMode.value ? fileStore.isSaving : false);

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let relativeTimeTimer: ReturnType<typeof setInterval> | null = null;

// 非文件模式：内容变化后 2 秒标记为"已保存"
watch(() => editorStore.markdown, () => {
  if (isFileMode.value) return;
  if (!editorStore.isEditing) return;

  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    editorStore.setLastAutoSavedAt(new Date());
  }, 2000);
});

// 定时刷新相对时间显示
const updateRelativeTime = () => {
  displayText.value = formatRelativeTime(lastSavedAt.value);
};

watch(lastSavedAt, (newVal) => {
  if (!newVal) {
    displayText.value = "";
    if (relativeTimeTimer) {
      clearInterval(relativeTimeTimer);
      relativeTimeTimer = null;
    }
    return;
  }

  updateRelativeTime();
  if (!relativeTimeTimer) {
    relativeTimeTimer = setInterval(updateRelativeTime, 10000);
  }
}, { immediate: true });

onUnmounted(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  if (relativeTimeTimer) clearInterval(relativeTimeTimer);
});
</script>

<style scoped>
/* 样式复用 React 版的，通常在全局 CSS 或父级组件中定义 */
.save-indicator {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.save-indicator.saving {
  color: var(--primary-color);
}

.save-indicator.unsaved {
  color: var(--warning-color);
}

.save-indicator.saved {
  color: var(--text-secondary);
}

.save-indicator.ready {
  color: var(--text-quaternary);
}
</style>
