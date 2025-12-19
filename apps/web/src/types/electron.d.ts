interface ElectronAPI {
    isElectron: boolean;
    platform: string;
    fs: {
        selectWorkspace: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>;
        setWorkspace: (dir: string) => Promise<{ success: boolean; path?: string; error?: string }>;
        listFiles: (dir?: string) => Promise<{ success: boolean; files?: unknown[]; error?: string }>;
        readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
        createFile: (payload: { filename?: string; content?: string }) => Promise<{ success: boolean; filePath?: string; filename?: string; error?: string }>;
        saveFile: (payload: { filePath: string; content: string }) => Promise<{ success: boolean; error?: string }>;
        renameFile: (payload: { oldPath: string; newName: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
        deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
        revealInFinder: (filePath: string) => Promise<void>;
        onRefresh: (callback: () => void) => unknown;
        removeRefreshListener: (handler: unknown) => void;
        onMenuNewFile: (callback: () => void) => unknown;
        onMenuSave: (callback: () => void) => unknown;
        onMenuSwitchWorkspace: (callback: () => void) => unknown;
        removeAllListeners: () => void;
    };
    window?: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
    };
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}

export { };
