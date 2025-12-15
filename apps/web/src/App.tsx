import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Header } from './components/Header/Header';
import { FileSidebar } from './components/Sidebar/FileSidebar';
import { HistoryPanel } from './components/History/HistoryPanel';
import { Welcome } from './components/Welcome/Welcome';
import { MarkdownEditor } from './components/Editor/MarkdownEditor';
import { MarkdownPreview } from './components/Preview/MarkdownPreview';
import { useFileSystem } from './hooks/useFileSystem';
import './styles/global.css';
import './App.css';

import { useStorageContext } from './storage/StorageContext';
import { HistoryManager } from './components/History/HistoryManager';
import { Loader2 } from 'lucide-react';
import { useHistoryStore } from './store/historyStore';
import { useFileStore } from './store/fileStore';

function App() {
  const { workspacePath, saveFile } = useFileSystem();
  const { type: storageType, ready } = useStorageContext();
  const historyLoading = useHistoryStore((state) => state.loading);
  const fileLoading = useFileStore((state) => state.isLoading);

  // 全局保存快捷键（统一监听器）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFile(true); // showToast = true
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveFile]);

  // 检查是否在 Electron 中运行
  const isElectron = useMemo(() => {
    // @ts-expect-error Electron 类型定义
    return typeof window !== 'undefined' && window.electron?.isElectron;
  }, []);

  const [showHistory, setShowHistory] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('wemd-show-history');
    return saved !== 'false';
  });
  const [historyWidth, setHistoryWidth] = useState<string>(showHistory ? '280px' : '0px');

  useEffect(() => {
    try {
      localStorage.setItem('wemd-show-history', String(showHistory));
    } catch {
      /* 忽略持久化错误 */
    }
  }, [showHistory]);

  useEffect(() => {
    if (showHistory) {
      setHistoryWidth('280px');
      return;
    }
    const timer = window.setTimeout(() => setHistoryWidth('0px'), 350);
    return () => window.clearTimeout(timer);
  }, [showHistory]);

  const mainClass = 'app-main';
  const mainStyle = useMemo(
    () =>
      ({
        '--history-width': historyWidth,
      }) as CSSProperties,
    [historyWidth],
  );

  // Electron 模式：强制选择工作区
  if (isElectron && !workspacePath) {
    return (
      <>
        <Toaster position="top-center" />
        <Welcome />
      </>
    );
  }

  return (
    <div className="app">
      {/* 只在存储上下文完全就绪且确认为 IndexedDB 模式时才渲染 HistoryManager */}
      {!isElectron && ready && storageType === 'indexeddb' && <HistoryManager />}

      <>
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'premium-toast',
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#1a1a1a',
              boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.12)',
              borderRadius: '50px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid rgba(0, 0, 0, 0.05)',
              maxWidth: '400px',
            },
            success: {
              iconTheme: {
                primary: '#07c160',
                secondary: '#fff',
              },
              duration: 2000,
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              duration: 3000,
            },
          }}
        />
        <Header />
        <main className={mainClass} style={mainStyle} data-show-history={showHistory}>
          <button
            className={`history-toggle ${showHistory ? '' : 'is-collapsed'}`}
            onClick={() => setShowHistory((prev) => !prev)}
            aria-label={showHistory ? '隐藏列表' : '显示列表'}
          >
            <span className="sr-only">{showHistory ? '隐藏列表' : '显示列表'}</span>
          </button>
          <div className={`history-pane ${showHistory ? 'is-visible' : 'is-hidden'}`} aria-hidden={!showHistory}>
            <div className="history-pane__content">
              {/* ready 后渲染，防止闪烁 */}
              {ready && (isElectron || storageType === 'filesystem' ? (
                <FileSidebar />
              ) : (
                <HistoryPanel />
              ))}
            </div>
          </div>
          {isElectron && <div className="window-drag-region" />}
          <div className="workspace">
            <div className="editor-pane">
              {/* 存储未就绪或文件/历史加载中显示 loading */}
              {(!ready || fileLoading || (historyLoading && !isElectron && storageType === 'indexeddb')) ? (
                <div className="workspace-loading">
                  <Loader2 className="animate-spin" size={24} />
                  <p>正在加载文章</p>
                </div>
              ) : (
                <MarkdownEditor />
              )}
            </div>
            <div className="preview-pane">
              {(!ready || fileLoading || (historyLoading && !isElectron && storageType === 'indexeddb')) ? (
                <div className="workspace-loading">
                  <Loader2 className="animate-spin" size={24} />
                  <p>正在加载文章</p>
                </div>
              ) : (
                <MarkdownPreview />
              )}
            </div>
          </div>
        </main>
      </>
    </div>
  );
}

export default App;
