import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface FileItem {
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  themeName?: string;
}

export const useFileStore = defineStore('file', () => {
  const workspacePath = ref<string | null>(null);
  const files = ref<FileItem[]>([]);
  const currentFile = ref<FileItem | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);

  // 状态同步字段
  const lastSavedContent = ref("");
  const lastSavedAt = ref<Date | null>(null);
  const isDirty = ref(false);
  const isRestoring = ref(false);

  function setWorkspacePath(path: string | null) {
    workspacePath.value = path;
  }

  function setFiles(newFiles: FileItem[]) {
    files.value = newFiles;
  }

  function setCurrentFile(file: FileItem | null) {
    currentFile.value = file;
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  function setSaving(saving: boolean) {
    isSaving.value = saving;
  }

  function setLastSavedContent(content: string) {
    lastSavedContent.value = content;
  }

  function setLastSavedAt(time: Date | null) {
    lastSavedAt.value = time;
  }

  function setIsDirty(dirty: boolean) {
    isDirty.value = dirty;
  }

  function setIsRestoring(restoring: boolean) {
    isRestoring.value = restoring;
  }

  return {
    workspacePath,
    files,
    currentFile,
    isLoading,
    isSaving,
    lastSavedContent,
    lastSavedAt,
    isDirty,
    isRestoring,
    setWorkspacePath,
    setFiles,
    setCurrentFile,
    setLoading,
    setSaving,
    setLastSavedContent,
    setLastSavedAt,
    setIsDirty,
    setIsRestoring,
  };
});
