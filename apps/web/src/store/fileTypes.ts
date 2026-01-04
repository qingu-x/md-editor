export interface FileItem {
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  themeName?: string;
}

export interface FileStoreState {
  workspacePath: string | null;
  files: FileItem[];
  currentFile: FileItem | null;
  isLoading: boolean;
  isSaving: boolean;

  // 状态同步字段
  lastSavedContent: string;
  lastSavedAt: Date | null; // 最后保存时间
  isDirty: boolean; // 内容是否已修改但未保存
  isRestoring: boolean; // 是否正在切换文件/恢复内容
}
