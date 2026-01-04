<template>
  <div class="update-modal-overlay" @click="$emit('close')">
    <div class="update-modal" @click.stop>
      <button class="update-modal-close" @click="$emit('close')">
        <X :size="18" />
      </button>

      <div class="update-modal-icon">
        <img src="/favicon-dark.svg" alt="WeMD" width="64" height="64" />
      </div>

      <h2 class="update-modal-title">发现新版本</h2>
      <p class="update-modal-version">WeMD {{ latestVersion }} 已发布</p>

      <button
        v-if="releaseNotes"
        class="update-modal-notes-toggle"
        @click="showNotes = !showNotes"
      >
        <ChevronUp v-if="showNotes" :size="16" />
        <ChevronDown v-else :size="16" />
        {{ showNotes ? "收起更新日志" : "查看更新日志" }}
      </button>

      <div v-if="showNotes && releaseNotes" class="update-modal-notes">
        <pre>{{ formattedReleaseNotes }}</pre>
      </div>

      <div class="update-modal-actions">
        <button class="update-modal-btn secondary" @click="$emit('close')">
          稍后提醒
        </button>
        <button class="update-modal-btn primary" @click="$emit('download')">
          <Download :size="16" />
          前往下载
        </button>
      </div>

      <button class="update-modal-skip" @click="$emit('skip-version')">
        跳过此版本
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, Download, ChevronDown, ChevronUp } from 'lucide-vue-next';
import './UpdateModal.css';

const props = defineProps<{
  latestVersion: string;
  currentVersion: string;
  releaseNotes?: string;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'download'): void;
  (e: 'skip-version'): void;
}>();

const showNotes = ref(false);

const formattedReleaseNotes = computed(() => {
  if (!props.releaseNotes) return '';
  return props.releaseNotes
    .replace(/^### /gm, "◆ ")
    .replace(/^## /gm, "▸ ")
    .replace(/^# /gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^- /gm, "• ")
    .trim();
});
</script>
