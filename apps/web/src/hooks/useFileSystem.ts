import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useFileStore } from "../store/fileStore";
import { useEditorStore } from "../store/editorStore";
import { useThemeStore } from "../store/themeStore";
import { useStorageStore } from "../store/storageStore";
import type { FileItem as StoreFileItem } from "../store/fileTypes";
import type { FileItem as StorageFileItem } from "../storage/types";
import { toast } from "./useToast";

// 本地定义 Electron API 类型以确保类型安全
interface ElectronFileItem {
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  size?: number;
  themeName?: string;
}

interface ElectronAPI {
  fs: {
    selectWorkspace: () => Promise<{
      success: boolean;
      path?: string;
      canceled?: boolean;
    }>;
    setWorkspace: (dir: string) => Promise<{ success: boolean; path?: string }>;
    listFiles: (
      dir?: string,
    ) => Promise<{ success: boolean; files?: ElectronFileItem[] }>;
    readFile: (
      path: string,
    ) => Promise<{ success: boolean; content?: string; error?: string }>;
    createFile: (payload: {
      filename?: string;
      content?: string;
    }) => Promise<{ success: boolean; filePath?: string; filename?: string }>;
    saveFile: (payload: {
      filePath: string;
      content: string;
    }) => Promise<{ success: boolean; error?: string }>;
    renameFile: (payload: {
      oldPath: string;
      newName: string;
    }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>;
    revealInFinder: (path: string) => Promise<void>;
    onRefresh: (cb: () => void) => () => void;
    removeRefreshListener: (handler: () => void) => void;
    onMenuNewFile: (cb: () => void) => () => void;
    onMenuSave: (cb: () => void) => () => void;
    onMenuSwitchWorkspace: (cb: () => void) => () => void;
    removeAllListeners: () => void;
  };
}

const getElectron = (): ElectronAPI | null => {
  return (window as any).electron as ElectronAPI;
};

const WORKSPACE_KEY = "wemd-workspace-path";
const LAST_FILE_KEY = "wemd-last-file-path";

export function useFileSystem(options: { registerListeners?: boolean } = {}) {
  const { registerListeners = false } = options;
  const storageStore = useStorageStore();
  const fileStore = useFileStore();
  const editorStore = useEditorStore();
  const themeStore = useThemeStore();

  const electron = getElectron();
  const isCreating = ref(false);

  // 1. 加载工作区
  const loadWorkspace = async (dir?: string) => {
    if (electron) {
      fileStore.setLoading(true);
      try {
        const path = dir || localStorage.getItem(WORKSPACE_KEY) || "";
        if (path) {
          const res = await electron.fs.setWorkspace(path);
          if (res.success) {
            fileStore.setWorkspacePath(res.path || path);
            localStorage.setItem(WORKSPACE_KEY, res.path || path);
            await refreshFiles();
          }
        }
      } catch (error) {
        console.error("Failed to load workspace:", error);
      } finally {
        fileStore.setLoading(false);
      }
    } else if (storageStore.type === "filesystem" && storageStore.ready) {
      // Browser filesystem mode
      await refreshFiles();
    }
  };

  // 2. 刷新文件列表
  const refreshFiles = async () => {
    if (electron) {
      if (!fileStore.workspacePath) return;
      try {
        const res = await electron.fs.listFiles(fileStore.workspacePath);
        if (res.success && res.files) {
          const formattedFiles: StoreFileItem[] = res.files.map((f) => ({
            name: f.name,
            path: f.path,
            createdAt: new Date(f.createdAt),
            updatedAt: new Date(f.updatedAt),
            size: f.size || 0,
            themeName: f.themeName,
          }));
          fileStore.setFiles(formattedFiles);
        }
      } catch (error) {
        console.error("Failed to refresh files:", error);
      }
    } else if (storageStore.adapter) {
      // Browser mode (filesystem or indexeddb)
      try {
        const list = await storageStore.adapter.listFiles();
        const formattedFiles: StoreFileItem[] = list.map(
          (f: StorageFileItem) => ({
            name: f.name,
            path: f.path,
            createdAt: new Date(f.updatedAt || Date.now()), // Browser adapters might not have createdAt
            updatedAt: new Date(f.updatedAt || Date.now()),
            size: f.size || 0,
            themeName: (f.meta?.themeName as string) || undefined,
          }),
        );
        fileStore.setFiles(formattedFiles);
      } catch (error) {
        console.error("Failed to refresh files in browser:", error);
      }
    }
  };

  // 3. 选择工作区
  const selectWorkspace = async () => {
    if (electron) {
      try {
        const res = await electron.fs.selectWorkspace();
        if (res.success && res.path) {
          fileStore.setWorkspacePath(res.path);
          localStorage.setItem(WORKSPACE_KEY, res.path);
          await refreshFiles();
          toast.success("已切换工作区");
        }
      } catch (error) {
        console.error("Failed to select workspace:", error);
      }
    } else {
      // Browser mode: switch to filesystem adapter
      try {
        const res = await storageStore.select("filesystem");
        if (res.ready) {
          await refreshFiles();
          toast.success("已选择本地文件夹");
        }
      } catch (error) {
        console.error("Failed to select filesystem in browser:", error);
      }
    }
  };

  // 4. 读取文件
  const readFile = async (path: string) => {
    if (electron) {
      try {
        const res = await electron.fs.readFile(path);
        if (res.success) {
          return res.content || "";
        } else {
          toast.error(res.error || "读取文件失败");
          return null;
        }
      } catch (error) {
        console.error("Failed to read file:", error);
        return null;
      }
    } else if (storageStore.adapter) {
      try {
        return await storageStore.adapter.readFile(path);
      } catch (error) {
        console.error("Failed to read file in browser:", error);
        toast.error("读取文件失败");
        return null;
      }
    }
    return null;
  };

  // 5. 打开文件
  const openFile = async (file: StoreFileItem) => {
    if (fileStore.currentFile?.path === file.path) return;

    // 如果有未保存的内容，提示
    if (fileStore.isDirty) {
      const confirm = window.confirm("当前文件有未保存的更改，确定要切换吗？");
      if (!confirm) return;
    }

    const content = await readFile(file.path);
    if (content !== null) {
      fileStore.setCurrentFile(file);
      fileStore.setLastSavedContent(content);
      fileStore.setIsDirty(false);

      // 解析 frontmatter (如果有)
      const { body, themeId, themeName } = parseFsFrontmatter(content);
      editorStore.setMarkdown(body);

      if (themeId) {
        themeStore.setTheme(themeId);
      }

      localStorage.setItem(LAST_FILE_KEY, file.path);
    }
  };

  // 6. 新建文件
  const createFile = async () => {
    if (isCreating.value) return;
    if (!electron && !storageStore.adapter) {
      toast.error("存储未就绪");
      return;
    }

    isCreating.value = true;
    try {
      const initialContent = `---\ntheme: default\nthemeName: 默认主题\n---\n\n# 新文章\n\n`;

      if (electron) {
        const res = await electron.fs.createFile({
          content: initialContent,
        });

        if (res.success && res.filePath) {
          await refreshFiles();
          // 自动打开新文件
          const newFile = fileStore.files.find((f) => f.path === res.filePath);
          if (newFile) {
            await openFile(newFile);
          }
          toast.success("已创建新文章");
        }
      } else if (storageStore.adapter) {
        // Browser mode
        const defaultName = "未命名文章.md";
        let filename = defaultName;
        let counter = 1;

        while (await storageStore.adapter.exists(filename)) {
          filename = `未命名文章 (${counter}).md`;
          counter++;
        }

        await storageStore.adapter.writeFile(filename, initialContent);
        await refreshFiles();

        const newFile = fileStore.files.find((f) => f.path === filename);
        if (newFile) {
          await openFile(newFile);
        }
        toast.success("已创建新文章");
      }
    } catch (error) {
      console.error("Failed to create file:", error);
      toast.error("创建失败");
    } finally {
      isCreating.value = false;
    }
  };

  // 7. 保存文件
  const saveFile = async () => {
    if (!fileStore.currentFile) return;
    if (!electron && !storageStore.adapter) return;

    fileStore.setSaving(true);
    try {
      const frontmatter = `---\ntheme: ${themeStore.themeId}\nthemeName: ${themeStore.themeName}\n---\n`;
      const content = `${frontmatter}\n${editorStore.markdown}`;

      // 检查内容是否有变化
      if (content === fileStore.lastSavedContent) {
        fileStore.setSaving(false);
        toast.success("内容无变化");
        return;
      }

      if (electron) {
        const res = await electron.fs.saveFile({
          filePath: fileStore.currentFile.path,
          content,
        });

        if (res.success) {
          fileStore.setLastSavedContent(content);
          fileStore.setIsDirty(false);
          fileStore.setLastSavedAt(new Date());
          await refreshFiles();
          toast.success("保存成功");
        } else {
          toast.error(res.error || "保存失败");
        }
      } else if (storageStore.adapter) {
        await storageStore.adapter.writeFile(
          fileStore.currentFile.path,
          content,
        );
        fileStore.setLastSavedContent(content);
        fileStore.setIsDirty(false);
        fileStore.setLastSavedAt(new Date());
        await refreshFiles();
        toast.success("保存成功");
      }
    } catch (error) {
      console.error("Failed to save file:", error);
      toast.error("保存失败");
    } finally {
      fileStore.setSaving(false);
    }
  };

  // 8. 重命名文件
  const renameFile = async (oldPath: string, newName: string) => {
    if (!electron && !storageStore.adapter) return;

    try {
      // 确保新名字以 .md 结尾
      const safeName = newName.endsWith(".md") ? newName : `${newName}.md`;

      if (electron) {
        const res = await electron.fs.renameFile({
          oldPath,
          newName: safeName,
        });
        if (res.success && res.filePath) {
          await refreshFiles();
          // 如果是当前文件，更新当前文件状态
          if (fileStore.currentFile?.path === oldPath) {
            const updatedFile = fileStore.files.find(
              (f) => f.path === res.filePath,
            );
            if (updatedFile) {
              fileStore.setCurrentFile(updatedFile);
            }
          }
          toast.success("重命名成功");
        } else {
          toast.error(res.error || "重命名失败");
        }
      } else if (storageStore.adapter) {
        // Browser mode rename
        const dir = oldPath.includes("/")
          ? oldPath.substring(0, oldPath.lastIndexOf("/") + 1)
          : "";
        const newPath = dir + safeName;

        if (oldPath === newPath) return;

        if (await storageStore.adapter.exists(newPath)) {
          toast.error("文件名已存在");
          return;
        }

        await storageStore.adapter.renameFile(oldPath, newPath);
        await refreshFiles();

        if (fileStore.currentFile?.path === oldPath) {
          const updatedFile = fileStore.files.find((f) => f.path === newPath);
          if (updatedFile) {
            fileStore.setCurrentFile(updatedFile);
          }
        }
        toast.success("重命名成功");
      }
    } catch (error) {
      console.error("Failed to rename file:", error);
      toast.error("重命名失败");
    }
  };

  // 9. 删除文件
  const deleteFile = async (path: string) => {
    if (!electron && !storageStore.adapter) return;

    try {
      if (electron) {
        const res = await electron.fs.deleteFile(path);
        if (res.success) {
          await refreshFiles();
          // 如果删除的是当前文件，清空当前文件状态
          if (fileStore.currentFile?.path === path) {
            fileStore.setCurrentFile(null);
            fileStore.setLastSavedContent("");
            fileStore.setIsDirty(false);
            localStorage.removeItem(LAST_FILE_KEY);
          }
          toast.success("删除成功");
        } else {
          toast.error(res.error || "删除失败");
        }
      } else if (storageStore.adapter) {
        await storageStore.adapter.deleteFile(path);
        await refreshFiles();

        if (fileStore.currentFile?.path === path) {
          fileStore.setCurrentFile(null);
          fileStore.setLastSavedContent("");
          fileStore.setIsDirty(false);
          localStorage.removeItem(LAST_FILE_KEY);
        }
        toast.success("删除成功");
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.error("删除失败");
    }
  };

  const cleanupListeners = ref<(() => void)[]>([]);

  // 初始化加载
  onMounted(async () => {
    // 只有在指定需要注册监听器（通常是 App.vue）时才执行初始化逻辑
    // 避免多个组件重复注册 Electron 监听器和重复加载
    if (!registerListeners) return;

    if (electron) {
      await loadWorkspace();

      // 恢复上次打开的文件
      const lastFilePath = localStorage.getItem(LAST_FILE_KEY);
      if (lastFilePath) {
        // 等待文件列表刷新完成
        const checkFiles = setInterval(() => {
          if (fileStore.files.length > 0) {
            const lastFile = fileStore.files.find(
              (f) => f.path === lastFilePath,
            );
            if (lastFile) {
              openFile(lastFile);
            }
            clearInterval(checkFiles);
          }
        }, 100);
        setTimeout(() => clearInterval(checkFiles), 2000); // 最多等2秒
      }

      // 注册 Electron 事件监听并保存清理函数
      cleanupListeners.value.push(electron.fs.onRefresh(refreshFiles));
      cleanupListeners.value.push(electron.fs.onMenuNewFile(createFile));
      cleanupListeners.value.push(electron.fs.onMenuSave(saveFile));
      cleanupListeners.value.push(
        electron.fs.onMenuSwitchWorkspace(selectWorkspace),
      );
    } else {
      // Browser mode
      if (storageStore.ready) {
        await refreshFiles();
        const lastFilePath = localStorage.getItem(LAST_FILE_KEY);
        if (lastFilePath) {
          const lastFile = fileStore.files.find((f) => f.path === lastFilePath);
          if (lastFile) {
            await openFile(lastFile);
          }
        }
      }

      // 监听 storageStore 就绪
      watch(
        () => storageStore.ready,
        async (ready) => {
          if (ready) {
            await refreshFiles();
          }
        },
      );
    }
  });

  onUnmounted(() => {
    if (electron && registerListeners) {
      cleanupListeners.value.forEach((cleanup) => cleanup());
      cleanupListeners.value = [];
    }
  });

  return {
    workspacePath: computed(() => fileStore.workspacePath),
    files: computed(() => fileStore.files),
    currentFile: computed(() => fileStore.currentFile),
    isLoading: computed(() => fileStore.isLoading),
    isSaving: computed(() => fileStore.isSaving),
    isDirty: computed(() => fileStore.isDirty),
    loadWorkspace,
    refreshFiles,
    selectWorkspace,
    readFile,
    openFile,
    createFile,
    saveFile,
    renameFile,
    deleteFile,
  };
}

// 辅助函数：解析 Frontmatter
function parseFsFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    return { body: content, themeId: null, themeName: null };
  }

  const body = content.slice(match[0].length);
  const raw = match[1];
  const themeId = raw.match(/theme:\s*(.+)/)?.[1]?.trim() ?? null;
  const themeName =
    raw
      .match(/themeName:\s*(.+)/)?.[1]
      ?.trim()
      ?.replace(/^['"]|['"]$/g, "") ?? null;

  return { body, themeId, themeName };
}
