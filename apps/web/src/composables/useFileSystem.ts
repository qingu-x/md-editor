import { ref } from 'vue'
import { useFileStore } from '../stores/file'
import { useEditorStore } from '../stores/editor'
import { useThemeStore } from '../stores/theme'
import { adapter, ready as storageReady } from './useStorage'
import type { FileItem } from '../store/fileTypes'
import { toast } from 'vue-sonner'

// 本地定义 Electron API 类型以确保类型安全
interface ElectronFileItem {
  name: string
  path: string
  createdAt: string
  updatedAt: string
  size?: number
  themeName?: string
}

interface ElectronAPI {
  fs: {
    selectWorkspace: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>
    setWorkspace: (dir: string) => Promise<{ success: boolean; path?: string }>
    listFiles: (dir?: string) => Promise<{ success: boolean; files?: ElectronFileItem[] }>
    readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>
    createFile: (payload: {
      filename?: string
      content?: string
    }) => Promise<{ success: boolean; filePath?: string; filename?: string }>
    saveFile: (payload: {
      filePath: string
      content: string
    }) => Promise<{ success: boolean; error?: string }>
    renameFile: (payload: {
      oldPath: string
      newName: string
    }) => Promise<{ success: boolean; filePath?: string; error?: string }>
    deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>
    revealInFinder: (path: string) => Promise<void>
    onRefresh: (cb: () => void) => () => void
    removeRefreshListener: (handler: () => void) => void
    onMenuNewFile: (cb: () => void) => () => void
    onMenuSave: (cb: () => void) => () => void
    onMenuSwitchWorkspace: (cb: () => void) => () => void
    removeAllListeners: () => void
  }
}

const getElectron = (): ElectronAPI | null => {
  // @ts-expect-error - Electron API 在运行时注入
  return window.electron as ElectronAPI
}

const WORKSPACE_KEY = 'wemd-workspace-path'
const LAST_FILE_KEY = 'wemd-last-file-path'

export function useFileSystem() {
  const electron = getElectron()
  const fileStore = useFileStore()
  const editorStore = useEditorStore()
  const themeStore = useThemeStore()

  // 仅保留 isCreating 作为本地防抖
  const isCreating = ref(false)

  // 1. 加载工作区
  async function loadWorkspace(path: string) {
    if (electron) {
      fileStore.setLoading(true)
      try {
        const res = await electron.fs.setWorkspace(path)
        if (res.success) {
          fileStore.setWorkspacePath(path)
          localStorage.setItem(WORKSPACE_KEY, path)
          await refreshFiles(path)
        } else {
          fileStore.setWorkspacePath(null)
          localStorage.removeItem(WORKSPACE_KEY)
        }
      } catch (e) {
        console.error(e)
      } finally {
        fileStore.setLoading(false)
      }
    } else {
      fileStore.setWorkspacePath(path)
      await refreshFiles()
    }
  }

  // 2. 刷新文件列表
  async function refreshFiles(dir?: string) {
    if (electron) {
      const target = dir || fileStore.workspacePath
      if (!target) return

      const res = await electron.fs.listFiles(target)
      if (res.success && res.files) {
        const mapped = res.files.map((f) => ({
          ...f,
          size: f.size ?? 0,
          createdAt: new Date(f.createdAt),
          updatedAt: new Date(f.updatedAt),
        }))
        fileStore.setFiles(mapped)
      }
    } else if (adapter.value && storageReady.value) {
      try {
        const files = await adapter.value.listFiles()
        fileStore.setFiles(
          files.map((f) => ({
            name: f.name,
            path: f.path,
            size: f.size ?? 0,
            createdAt: f.updatedAt ? new Date(f.updatedAt) : new Date(),
            updatedAt: f.updatedAt ? new Date(f.updatedAt) : new Date(),
            themeName: (f.meta?.themeName as string) || undefined,
          }))
        )
      } catch (error) {
        console.error('加载文件列表失败:', error)
        toast.error('无法加载文件列表')
      }
    }
  }

  // 3. 选择工作区（对话框）
  async function selectWorkspace() {
    if (electron) {
      const res = await electron.fs.selectWorkspace()
      if (res.success && res.path) {
        await loadWorkspace(res.path)
      }
    } else {
      toast.info('请在右上角"存储模式"中切换文件夹')
    }
  }

  // 4. 打开文件
  async function openFile(file: FileItem) {
    fileStore.setIsRestoring(true)

    const currentIsDirty = fileStore.isDirty
    const currentCurrentFile = fileStore.currentFile

    if (currentCurrentFile && currentIsDirty) {
      const currentMarkdown = editorStore.markdown
      const currentTheme = themeStore.themeId
      const currentThemeName = themeStore.themeName
      const frontmatter = `---\ntheme: ${currentTheme}\nthemeName: ${currentThemeName}\n---\n`
      const fullContent = frontmatter + '\n' + currentMarkdown

      if (electron) {
        try {
          const res = await electron.fs.saveFile({
            filePath: currentCurrentFile.path,
            content: fullContent,
          })
          if (res.success) {
            fileStore.setIsDirty(false)
            fileStore.setLastSavedContent(fullContent)
            await refreshFiles()
          }
        } catch (e) {
          console.error('切换前保存失败:', e)
        }
      } else if (adapter.value && storageReady.value) {
        try {
          await adapter.value.writeFile(currentCurrentFile.path, fullContent)
          fileStore.setIsDirty(false)
          fileStore.setLastSavedContent(fullContent)
          await refreshFiles()
        } catch (e) {
          console.error('切换前保存失败:', e)
        }
      }
    }

    let content = ''
    let success = false

    if (electron) {
      const res = await electron.fs.readFile(file.path)
      if (res.success && typeof res.content === 'string') {
        content = res.content
        success = true
      }
    } else if (adapter.value && storageReady.value) {
      try {
        content = await adapter.value.readFile(file.path)
        success = true
      } catch (error) {
        console.error('读取文件错误:', error)
      }
    }

    if (success) {
      fileStore.setCurrentFile(file)

      const match = content.match(/^---\n([\s\S]*?)\n---/)

      if (match) {
        const frontmatterRaw = match[1]
        const body = content.slice(match[0].length).trimStart()

        const themeMatch = frontmatterRaw.match(/theme:\s*(.+)/)
        const theme = themeMatch ? themeMatch[1].trim() : 'default'

        editorStore.setMarkdown(body)
        themeStore.selectTheme(theme)

        fileStore.setLastSavedContent(content)
        fileStore.setIsDirty(false)
      } else {
        editorStore.setMarkdown(content)
        themeStore.selectTheme('default')
        fileStore.setLastSavedContent(content)
        fileStore.setIsDirty(false)
      }
    } else {
      toast.error('无法读取文件')
    }

    setTimeout(() => {
      fileStore.setIsRestoring(false)
    }, 100)

    localStorage.setItem(LAST_FILE_KEY, file.path)
  }

  // 5. 创建文件
  async function createFile() {
    if (isCreating.value) return
    isCreating.value = true

    const initialContent = '---\ntheme: default\nthemeName: 默认主题\n---\n\n# 新文章\n\n'

    try {
      if (electron) {
        if (!fileStore.workspacePath) return
        const res = await electron.fs.createFile({ content: initialContent })
        if (res.success && res.filePath) {
          await refreshFiles()
          const newFile = {
            name: res.filename!,
            path: res.filePath!,
            createdAt: new Date(),
            updatedAt: new Date(),
            size: 0,
            themeName: '默认主题',
          }
          await openFile(newFile)
          toast.success('已创建新文章')
        }
      } else if (adapter.value && storageReady.value) {
        const filename = `未命名文章-${Date.now()}.md`
        await adapter.value.writeFile(filename, initialContent)
        await refreshFiles()
        const newFile = {
          name: filename,
          path: filename,
          createdAt: new Date(),
          updatedAt: new Date(),
          size: initialContent.length,
          themeName: '默认主题',
        }
        await openFile(newFile)
        toast.success('已创建新文章')
      }
    } catch {
      toast.error('创建失败')
    } finally {
      isCreating.value = false
    }
  }

  // 6. 保存文件
  async function saveFile(showToast = false) {
    if (!fileStore.currentFile) return
    fileStore.setSaving(true)

    const markdown = editorStore.markdown
    const theme = themeStore.themeId
    const themeName = themeStore.themeName

    const frontmatter = `---
theme: ${theme}
themeName: ${themeName}
---
`
    const fullContent = frontmatter + '\n' + markdown

    if (fullContent === fileStore.lastSavedContent) {
      fileStore.setSaving(false)
      if (showToast) toast.success('内容无变化')
      return
    }

    let success = false
    let errorMsg = ''

    if (electron) {
      const res = await electron.fs.saveFile({
        filePath: fileStore.currentFile.path,
        content: fullContent,
      })
      if (res.success) success = true
      else errorMsg = res.error || 'Unknown error'
    } else if (adapter.value && storageReady.value) {
      try {
        await adapter.value.writeFile(fileStore.currentFile.path, fullContent)
        success = true
      } catch (e: unknown) {
        errorMsg = e instanceof Error ? e.message : String(e)
      }
    }

    fileStore.setSaving(false)

    if (success) {
      fileStore.setLastSavedContent(fullContent)
      fileStore.setIsDirty(false)
      if (showToast) toast.success('已保存')
    } else {
      toast.error('保存失败: ' + errorMsg)
    }
  }

  // 7. 重命名文件
  async function renameFile(file: FileItem, newName: string) {
    const safeName = newName.endsWith('.md') ? newName : `${newName}.md`

    if (electron) {
      const res = await electron.fs.renameFile({ oldPath: file.path, newName })
      if (res.success) {
        toast.success('重命名成功')
        await refreshFiles()
        if (fileStore.currentFile && fileStore.currentFile.path === file.path) {
          fileStore.setCurrentFile({
            ...fileStore.currentFile,
            path: res.filePath!,
            name: safeName,
          })
        }
      } else {
        toast.error(res.error || '重命名失败')
      }
    } else if (adapter.value && storageReady.value) {
      try {
        await adapter.value.renameFile(file.path, safeName)
        toast.success('重命名成功')
        await refreshFiles()
        if (fileStore.currentFile && fileStore.currentFile.path === file.path) {
          fileStore.setCurrentFile({ ...fileStore.currentFile, path: safeName, name: safeName })
        }
      } catch {
        toast.error('重命名失败')
      }
    }
  }

  // 8. 删除文件
  async function deleteFile(file: FileItem) {
    let success = false

    if (electron) {
      const res = await electron.fs.deleteFile(file.path)
      success = res.success
    } else if (adapter.value && storageReady.value) {
      try {
        await adapter.value.deleteFile(file.path)
        success = true
      } catch (error) {
        console.error(error)
      }
    }

    if (success) {
      toast.success('已删除')
      await refreshFiles()
      if (fileStore.currentFile && fileStore.currentFile.path === file.path) {
        fileStore.setCurrentFile(null)
        editorStore.setMarkdown('')
        fileStore.setIsDirty(false)
        fileStore.setLastSavedContent('')
      }
    } else {
      toast.error('删除失败')
    }
  }

  return {
    workspacePath: fileStore.workspacePath,
    files: fileStore.files,
    currentFile: fileStore.currentFile,
    isLoading: fileStore.isLoading,
    isSaving: fileStore.isSaving,
    selectWorkspace,
    openFile,
    createFile,
    saveFile,
    renameFile,
    deleteFile,
    refreshFiles,
    loadWorkspace,
  }
}
