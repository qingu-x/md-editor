<template>
  <div class="welcome-container">
    <div class="welcome-content">
      <img
        src="/favicon-dark.svg"
        alt="WeMD Logo"
        class="welcome-logo"
      />
      <h1>欢迎使用 WeMD</h1>
      <p>请选择一个文件夹作为工作区以开始写作</p>
      <button class="btn-primary" @click="selectWorkspace">
        <FolderOpen :size="20" />
        选择工作区文件夹
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen } from 'lucide-vue-next';
import { useFileSystem } from '../../hooks/useFileSystem';
import './Welcome.css';

const { selectWorkspace } = useFileSystem();
</script>
