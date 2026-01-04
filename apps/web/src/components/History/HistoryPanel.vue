<template>
  <FileSystemHistory v-if="storageType === 'filesystem' && adapter" :adapter="adapter" />
  <IndexedHistoryPanel v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useStorageStore } from '../../store/storageStore';
import IndexedHistoryPanel from './IndexedHistoryPanel.vue';
import FileSystemHistory from './FileSystemHistory.vue';

const storageStore = useStorageStore();
const adapter = computed(() => storageStore.adapter);
const storageType = computed(() => storageStore.type);
</script>
