import { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { ThemePanel } from '../Theme/ThemePanel';
import { StorageModeSelector } from '../StorageModeSelector/StorageModeSelector';
import { ImageHostSettings } from '../Settings/ImageHostSettings';
import './Header.css';
import { Layers, Palette, Send, ImageIcon, Sun, Moon } from 'lucide-react';
import { useUITheme } from '../../hooks/useUITheme';

const DefaultLogoMark = () => (
    <svg width="40" height="40" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M40 20 H160 C171 20 180 29 180 40 V140 C180 151 171 160 160 160 H140 L140 185 L110 160 H40 C29 160 20 151 20 140 V40 C20 29 29 20 40 20 Z" fill="#1A1A1A" />
        <rect x="50" y="50" width="100" height="12" rx="6" fill="#07C160" />
        <path d="M60 85 L60 130 H80 L80 110 L100 130 L120 110 L120 130 H140 L140 85 L120 85 L100 105 L80 85 Z" fill="#FFFFFF" />
    </svg>
);

const structuralismLogoSrc = `${import.meta.env.BASE_URL}favicon-light.svg`;

const StructuralismLogoMark = () => (
    <img src={structuralismLogoSrc} alt="WeMD Logo" width={40} height={40} style={{ display: 'block' }} />
);

export function Header() {
    const { copyToWechat } = useEditorStore();
    const [showThemePanel, setShowThemePanel] = useState(false);
    const [showStorageModal, setShowStorageModal] = useState(false);
    const [showImageHostModal, setShowImageHostModal] = useState(false);
    const uiTheme = useUITheme((state) => state.theme);
    const setTheme = useUITheme((state) => state.setTheme);
    const isStructuralismUI = uiTheme === 'dark';

    const isElectron = typeof window !== 'undefined' && !!(window as unknown as { electron?: unknown }).electron;
    const platform = typeof window !== 'undefined' ? window.electron?.platform : undefined;
    const isWindows = platform === 'win32';

    // Windows 使用自定义按钮，不需要 WCO inset 计算
    useEffect(() => {
        if (!isElectron || isWindows) {
            document.documentElement.style.removeProperty('--titlebar-right-inset');
            document.documentElement.style.removeProperty('--titlebar-left-inset');
            return;
        }
        const controlsOverlay = (navigator as Navigator & {
            windowControlsOverlay?: {
                visible?: boolean;
                getTitlebarAreaRect?: () => DOMRect;
                addEventListener?: (type: 'geometrychange', listener: () => void) => void;
                removeEventListener?: (type: 'geometrychange', listener: () => void) => void;
            };
        }).windowControlsOverlay;

        if (!controlsOverlay?.getTitlebarAreaRect) {
            document.documentElement.style.removeProperty('--titlebar-right-inset');
            document.documentElement.style.removeProperty('--titlebar-left-inset');
            return;
        }

        const updateInset = () => {
            if (controlsOverlay.visible === false) {
                document.documentElement.style.setProperty('--titlebar-right-inset', '0px');
                document.documentElement.style.setProperty('--titlebar-left-inset', '0px');
                return;
            }
            const rect = controlsOverlay.getTitlebarAreaRect();
            const leftInset = Math.max(0, Math.round(rect.x));
            const rightInset = Math.max(0, Math.round(window.innerWidth - (rect.x + rect.width)));
            document.documentElement.style.setProperty('--titlebar-left-inset', `${leftInset}px`);
            document.documentElement.style.setProperty('--titlebar-right-inset', `${rightInset}px`);
        };

        updateInset();
        const handleResize = () => updateInset();
        window.addEventListener('resize', handleResize);
        controlsOverlay.addEventListener?.('geometrychange', updateInset);

        return () => {
            window.removeEventListener('resize', handleResize);
            controlsOverlay.removeEventListener?.('geometrychange', updateInset);
            document.documentElement.style.removeProperty('--titlebar-right-inset');
            document.documentElement.style.removeProperty('--titlebar-left-inset');
        };
    }, [isElectron, isWindows]);

    return (
        <>
            <header className="app-header">
                <div className="header-left">
                    <div className="logo">
                        {isStructuralismUI ? <StructuralismLogoMark /> : <DefaultLogoMark />}
                        <div className="logo-info">
                            <span className="logo-text">WeMD</span>
                            <span className="logo-subtitle">公众号 Markdown 排版编辑器</span>
                        </div>
                    </div>
                </div>

                <div className="header-actions">
                    <div className="header-right">
                        <button
                            className="btn-icon-only"
                            onClick={() => setTheme(uiTheme === 'dark' ? 'default' : 'dark')}
                            aria-label={uiTheme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
                            title={uiTheme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
                        >
                            {uiTheme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
                        </button>
                        {!isElectron && (
                            <button className="btn-secondary" onClick={() => setShowStorageModal(true)}>
                                <Layers size={18} strokeWidth={2} />
                                <span>存储模式</span>
                            </button>
                        )}
                        <button className="btn-secondary" onClick={() => setShowImageHostModal(true)}>
                            <ImageIcon size={18} strokeWidth={2} />
                            <span>图床设置</span>
                        </button>
                        <button className="btn-secondary" onClick={() => setShowThemePanel(true)}>
                            <Palette size={18} strokeWidth={2} />
                            <span>主题管理</span>
                        </button>
                        <button className="btn-primary" onClick={copyToWechat}>
                            <Send size={18} strokeWidth={2} />
                            <span>复制到公众号</span>
                        </button>
                    </div>

                    {/* Windows 自定义标题栏按钮 */}
                    {isWindows && (
                        <div className="window-controls">
                            <button
                                className="win-btn win-minimize"
                                onClick={() => window.electron?.window?.minimize()}
                                aria-label="最小化"
                            >
                                <svg width="10" height="1" viewBox="0 0 10 1">
                                    <rect width="10" height="1" fill="currentColor" />
                                </svg>
                            </button>
                            <button
                                className="win-btn win-maximize"
                                onClick={() => window.electron?.window?.maximize()}
                                aria-label="最大化"
                            >
                                <svg width="10" height="10" viewBox="0 0 10 10">
                                    <rect width="9" height="9" x="0.5" y="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
                                </svg>
                            </button>
                            <button
                                className="win-btn win-close"
                                onClick={() => window.electron?.window?.close()}
                                aria-label="关闭"
                            >
                                <svg width="10" height="10" viewBox="0 0 10 10">
                                    <path d="M0,0 L10,10 M10,0 L0,10" stroke="currentColor" strokeWidth="1.2" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <ThemePanel open={showThemePanel} onClose={() => setShowThemePanel(false)} />

            {showStorageModal && (
                <div className="storage-modal-overlay" onClick={() => setShowStorageModal(false)}>
                    <div className="storage-modal-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="storage-modal-header">
                            <h3>选择存储模式</h3>
                            <button className="storage-modal-close" onClick={() => setShowStorageModal(false)} aria-label="关闭">
                                ×
                            </button>
                        </div>
                        <StorageModeSelector />
                    </div>
                </div>
            )}

            {showImageHostModal && (
                <div className="storage-modal-overlay" onClick={() => setShowImageHostModal(false)}>
                    <div className="storage-modal-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="storage-modal-header">
                            <h3>图床设置</h3>
                            <button className="storage-modal-close" onClick={() => setShowImageHostModal(false)} aria-label="关闭">
                                ×
                            </button>
                        </div>
                        <ImageHostSettings />
                    </div>
                </div>
            )}
        </>
    );
}
