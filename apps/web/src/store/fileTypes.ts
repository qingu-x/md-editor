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

    // 操作方法
    setWorkspacePath: (path: string | null) => void;
    setFiles: (files: FileItem[]) => void;
    setCurrentFile: (file: FileItem | null) => void;
    setLoading: (loading: boolean) => void;
    setSaving: (saving: boolean) => void;
}
