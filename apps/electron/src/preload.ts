import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    isElectron: true,
    platform: process.platform,

    fs: {
        selectWorkspace: () => ipcRenderer.invoke('workspace:select'),
        setWorkspace: (dir: string) => ipcRenderer.invoke('workspace:set', dir),
        listFiles: (dir?: string) => ipcRenderer.invoke('file:list', dir),
        readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
        createFile: (payload: { filename?: string; content?: string }) => ipcRenderer.invoke('file:create', payload),
        saveFile: (payload: { filePath: string; content: string }) => ipcRenderer.invoke('file:save', payload),
        renameFile: (payload: { oldPath: string; newName: string }) => ipcRenderer.invoke('file:rename', payload),
        deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
        revealInFinder: (filePath: string) => ipcRenderer.invoke('file:reveal', filePath),

        onRefresh: (callback: () => void) => {
            ipcRenderer.removeAllListeners('file:refresh');
            const handler = (_event: IpcRendererEvent) => callback();
            ipcRenderer.on('file:refresh', handler);
            return () => ipcRenderer.removeListener('file:refresh', handler);
        },
        onMenuNewFile: (callback: () => void) => {
            ipcRenderer.removeAllListeners('menu:new-file');
            const handler = (_event: IpcRendererEvent) => callback();
            ipcRenderer.on('menu:new-file', handler);
            return () => ipcRenderer.removeListener('menu:new-file', handler);
        },
        onMenuSave: (callback: () => void) => {
            ipcRenderer.removeAllListeners('menu:save');
            const handler = (_event: IpcRendererEvent) => callback();
            ipcRenderer.on('menu:save', handler);
            return () => ipcRenderer.removeListener('menu:save', handler);
        },
        onMenuSwitchWorkspace: (callback: () => void) => {
            ipcRenderer.removeAllListeners('menu:switch-workspace');
            const handler = (_event: IpcRendererEvent) => callback();
            ipcRenderer.on('menu:switch-workspace', handler);
            return () => ipcRenderer.removeListener('menu:switch-workspace', handler);
        },

        removeAllListeners: () => {
            ipcRenderer.removeAllListeners('file:refresh');
            ipcRenderer.removeAllListeners('menu:new-file');
            ipcRenderer.removeAllListeners('menu:save');
            ipcRenderer.removeAllListeners('menu:switch-workspace');
        }
    },

    // 窗口控制 (用于 Windows 自定义标题栏)
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    },

    // 更新相关
    update: {
        onUpdateAvailable: (callback: (data: {
            latestVersion: string;
            currentVersion: string;
            releaseUrl: string;
            releaseNotes: string;
            force: boolean;
        }) => void) => {
            ipcRenderer.removeAllListeners('update:available');
            const handler = (_event: IpcRendererEvent, data: any) => callback(data);
            ipcRenderer.on('update:available', handler);
            return handler;
        },
        onUpToDate: (callback: (data: { currentVersion: string }) => void) => {
            ipcRenderer.removeAllListeners('update:upToDate');
            const handler = (_event: IpcRendererEvent, data: any) => callback(data);
            ipcRenderer.on('update:upToDate', handler);
            return handler;
        },
        onUpdateError: (callback: () => void) => {
            ipcRenderer.removeAllListeners('update:error');
            const handler = (_event: IpcRendererEvent) => callback();
            ipcRenderer.on('update:error', handler);
            return handler;
        },
        removeUpdateListener: (handler: any) => {
            ipcRenderer.removeListener('update:available', handler);
            ipcRenderer.removeListener('update:upToDate', handler);
            ipcRenderer.removeListener('update:error', handler);
        },
        openReleases: () => ipcRenderer.invoke('update:openReleases'),
    }
});
