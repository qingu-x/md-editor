<script setup lang="ts">
import { computed } from 'vue'
import { useStorage } from '../../composables/useStorage'
import '../StorageModeSelector/StorageModeSelector.css'

const { storageMode, setStorageMode } = useStorage()

const isFileSystemMode = computed(() => storageMode.value === 'filesystem')
</script>

<template>
  <div class="storage-mode-selector">
    <div class="storage-mode-options">
      <button
        :class="['storage-mode-option', { active: !isFileSystemMode }]"
        @click="setStorageMode('indexeddb')"
      >
        <div class="storage-mode-option__label">
          <span>浏览器存储</span>
        </div>
        <p>文件保存在浏览器本地存储中</p>
      </button>
      <button
        :class="['storage-mode-option', { active: isFileSystemMode }]"
        @click="setStorageMode('filesystem')"
      >
        <div class="storage-mode-option__label">
          <span>本地文件夹</span>
        </div>
        <p>文件直接保存到本地文件夹</p>
      </button>
    </div>
  </div>
</template>

