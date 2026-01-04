import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useThemeStore } from './themeStore';
import { copyToWechat as execCopyToWechat } from "../services/wechatCopyService";

export interface ResetOptions {
  markdown?: string;
  theme?: string;
  customCSS?: string;
  themeName?: string;
}

export const defaultMarkdown = `# 欢迎使用 WeMD

这是一个现代化的 Markdown 编辑器，专为**微信公众号**排版设计。

## 1. 基础语法
**这是加粗文本**

*这是斜体文本*

***这是加粗斜体文本***

~~这是删除线文本~~

==这是高亮文本==

这是一个 [链接](https://github.com/your-repo)

## 2. 特殊格式
### 上标和下标

水的化学式：H~2~O

爱因斯坦质能方程：E=mc^2^

### Emoji 表情
今天天气真好 :sunny: 

让我们一起学习 :books: 

加油 :rocket:

## 3. 列表展示
### 无序列表
- 列表项 1
- 列表项 2
  - 子列表项 2.1
  - 子列表项 2.2

### 有序列表
1. 第一步
2. 第二步
3. 第三步

## 4. 引用
> 这是一个一级引用
> 
> > 这是一个二级引用
> > 
> > > 这是一个三级引用
> 

> [!TIP]
> 这是一个技巧提示块

> [!NOTE]
> 这是一个备注提示块

> [!IMPORTANT]
> 这是一个重要信息提示块
`;

export const useEditorStore = defineStore('editor', () => {
  const markdown = ref(defaultMarkdown);
  const lastAutoSavedAt = ref<Date | null>(null);
  const isEditing = ref(false);
  const currentFilePath = ref<string | undefined>(undefined);
  const workspaceDir = ref<string | undefined>(undefined);

  function setMarkdown(val: string) {
    markdown.value = val;
  }

  function setLastAutoSavedAt(time: Date | null) {
    lastAutoSavedAt.value = time;
  }

  function setIsEditing(editing: boolean) {
    isEditing.value = editing;
  }

  function setFilePath(path?: string) {
    currentFilePath.value = path;
  }

  function setWorkspaceDir(dir?: string) {
    workspaceDir.value = dir;
  }

  function resetDocument(options?: ResetOptions) {
    if (options?.markdown !== undefined) {
      markdown.value = options.markdown;
    } else {
      markdown.value = defaultMarkdown;
    }

    // 重置主题（通过 themeStore）
    const themeStore = useThemeStore();
    const targetTheme = options?.theme ?? "default";
    themeStore.selectTheme(targetTheme);
    if (options?.customCSS !== undefined) {
      themeStore.setCustomCSS(options.customCSS);
    } else {
      themeStore.setCustomCSS('');
    }
  }

  async function copyToWechat(css: string) {
    await execCopyToWechat(markdown.value, css);
  }

  return {
    markdown,
    lastAutoSavedAt,
    isEditing,
    currentFilePath,
    workspaceDir,
    setMarkdown,
    setLastAutoSavedAt,
    setIsEditing,
    setFilePath,
    setWorkspaceDir,
    resetDocument,
    copyToWechat,
  };
});
