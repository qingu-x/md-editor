import { useState, useMemo } from 'react';
import { useFileSystem } from '../../hooks/useFileSystem';
import { useEditorStore } from '../../store/editorStore';
import { Search, Plus, Trash2, FolderOpen, Edit2, MoreHorizontal } from 'lucide-react';
import { createPortal } from 'react-dom';
import './FileSidebar.css';

import type { FileItem } from '../../store/fileTypes';

export function FileSidebar() {
    const { files, currentFile, openFile, createFile, renameFile, deleteFile, selectWorkspace, workspacePath } = useFileSystem();
    const currentThemeName = useEditorStore((state) => state.themeName);
    const [filter, setFilter] = useState('');
    const [renamingPath, setRenamingPath] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Context Menu State
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [menuTarget, setMenuTarget] = useState<FileItem | null>(null);

    const filteredFiles = useMemo(() => {
        if (!filter) return files;
        return files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));
    }, [files, filter]);

    const handleContextMenu = (e: React.MouseEvent, file: FileItem) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuTarget(file);
        setMenuPos({ x: e.clientX, y: e.clientY });
        setMenuOpen(true);
    };

    const closeMenu = () => {
        setMenuOpen(false);
        setMenuTarget(null);
    };

    const startRename = (file: FileItem) => {
        setRenamingPath(file.path);
        setRenameValue(file.name.replace('.md', ''));
        closeMenu();
    };

    const submitRename = async () => {
        if (renamingPath && renameValue) {
            const file = files.find(f => f.path === renamingPath);
            if (file) {
                await renameFile(file, renameValue);
            }
        }
        setRenamingPath(null);
    };

    return (
        <aside className="file-sidebar">
            <div className="fs-header">
                <div className="fs-workspace-info" onClick={selectWorkspace} title={workspacePath || '选择工作区'}>
                    <FolderOpen size={14} />
                    <span>{workspacePath ? workspacePath.split('/').pop() : '选择工作区'}</span>
                </div>
                <div className="fs-actions">
                    <button className="fs-btn-secondary fs-btn-icon-only" onClick={createFile} title="新建文章">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="fs-search">
                <div className="fs-search-wrapper">
                    <Search size={14} className="fs-search-icon" />
                    <input
                        type="text"
                        placeholder="搜索文件..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="fs-body">
                <div className="fs-list">
                    {filteredFiles.map(file => (
                        <div
                            key={file.path}
                            className={`fs-item ${currentFile?.path === file.path ? 'active' : ''}`}
                            onClick={() => openFile(file)}
                            onContextMenu={(e) => handleContextMenu(e, file)}
                        >
                            <div className="fs-item-main">
                                <div className="fs-title-block">
                                    <span className="fs-time">{new Date(file.updatedAt).toLocaleString()}</span>
                                    {renamingPath === file.path ? (
                                        <div className="fs-rename" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                value={renameValue}
                                                onChange={e => setRenameValue(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') submitRename();
                                                    if (e.key === 'Escape') setRenamingPath(null);
                                                }}
                                                autoFocus
                                            />
                                            <button onClick={() => submitRename()}>确认</button>
                                            <button onClick={() => setRenamingPath(null)}>取消</button>
                                        </div>
                                    ) : (
                                        <span className="fs-title" title={file.name}>{file.name}</span>
                                    )}
                                    {renamingPath !== file.path && (
                                        <span className="fs-theme-info">
                                            {currentFile?.path === file.path ? currentThemeName : (file.themeName || '默认主题')}
                                        </span>
                                    )}
                                </div>
                                <button
                                    className="fs-action-trigger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleContextMenu(e, file);
                                    }}
                                >
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredFiles.length === 0 && (
                        <div className="fs-empty">暂无文件</div>
                    )}
                </div>
            </div>

            {/* Context Menu Portal */}
            {menuOpen && createPortal(
                <div className="fs-context-menu-overlay" onClick={closeMenu}>
                    <div
                        className="fs-context-menu"
                        style={{ top: menuPos.y, left: menuPos.x }}
                    >
                        <button onClick={() => startRename(menuTarget)}>
                            <Edit2 size={14} /> 重命名
                        </button>
                        <button className="danger" onClick={() => { deleteFile(menuTarget); closeMenu(); }}>
                            <Trash2 size={14} /> 删除
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </aside>
    );
}
