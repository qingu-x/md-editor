const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    isElectron: true,
    platform: process.platform,

    // 新版文件系统 API
    fs: {
        selectWorkspace: () => ipcRenderer.invoke('workspace:select'),
        setWorkspace: (dir) => ipcRenderer.invoke('workspace:set', dir),
        listFiles: (dir) => ipcRenderer.invoke('file:list', dir),
        readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
        createFile: (payload) => ipcRenderer.invoke('file:create', payload),
        saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
        renameFile: (payload) => ipcRenderer.invoke('file:rename', payload),
        deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
        revealInFinder: (filePath) => ipcRenderer.invoke('file:reveal', filePath),

        // 事件监听
        onRefresh: (callback) => {
            const handler = () => callback();
            ipcRenderer.on('file:refresh', handler);
            return handler;
        },
        removeRefreshListener: (handler) => {
            ipcRenderer.removeListener('file:refresh', handler);
        },

        // 菜单事件
        onMenuNewFile: (callback) => {
            const handler = () => callback();
            ipcRenderer.on('menu:new-file', handler);
            return handler;
        },
        onMenuSave: (callback) => {
            const handler = () => callback();
            ipcRenderer.on('menu:save', handler);
            return handler;
        },
        onMenuSwitchWorkspace: (callback) => {
            const handler = () => callback();
            ipcRenderer.on('menu:switch-workspace', handler);
            return handler;
        },

        // 清理所有菜单监听 (可选)
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
    }
});
