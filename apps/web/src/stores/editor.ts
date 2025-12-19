/**
 * 编辑器状态管理
 * 只管理编辑器核心功能：Markdown 内容、文件路径、复制到微信
 * 主题相关功能已迁移到 theme.ts
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useThemeStore } from './theme'
import { copyToWechat as execCopyToWechat } from '../services/wechatCopyService'

export interface ResetOptions {
  markdown?: string
  theme?: string
  customCSS?: string
  themeName?: string
}

/**
 * 默认 Markdown 内容
 */
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

::: tip
这是一个技巧提示块 (Tip)
:::

::: note
这是一个提示块 (Note)
:::

::: info
这是一个信息提示块 (Info)
:::

::: success
这是一个成功提示块 (Success)
:::

::: warning
这是一个警告提示块 (Warning)
:::

::: danger
这是一个危险提示块 (Danger)
:::

## 5. 代码展示
### 行内代码
我们在代码中通常使用 \`console.log()\` 来输出信息。

### 代码块
\`\`\`javascript
// JavaScript 示例
function hello() {
  console.log('Hello, WeMD!');
  const a = 1;
  const b = 2;
  return a + b;
}
\`\`\`

## 6. 数学公式
行内公式: $E=mc^2$

行间公式:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## 7. 表格
| 姓名 | 年龄 | 职业 |
| :--- | :---: | ---: |
| 张三 | 18 | 工程师 |
| 李四 | 20 | 设计师 |
| 王五 | 22 | 产品经理 |

## 8. 分割线
---

## 9. 图片
![WeMD](https://img.wemd.app/favicon-dark.png)

**开始编辑吧!** 🚀
`

export const useEditorStore = defineStore('editor', () => {
  // Markdown 内容
  const markdown = ref(defaultMarkdown)

  // 文件路径（本地文件模式）
  const currentFilePath = ref<string | undefined>(undefined)
  const workspaceDir = ref<string | undefined>(undefined)

  function setMarkdown(value: string) {
    markdown.value = value
  }

  function setFilePath(path?: string) {
    currentFilePath.value = path
  }

  function setWorkspaceDir(dir?: string) {
    workspaceDir.value = dir
  }

  function resetDocument(options?: ResetOptions) {
    const themeStore = useThemeStore()
    const allThemes = themeStore.getAllThemes()

    // 验证主题是否存在
    let targetTheme = options?.theme ?? 'default'

    const themeExists = allThemes.some((t) => t.id === targetTheme)
    if (!themeExists) {
      console.warn(`Theme ${targetTheme} not found, falling back to default`)
      targetTheme = 'default'
    }

    // 重置编辑器内容
    markdown.value = options?.markdown ?? defaultMarkdown

    // 重置主题（通过 themeStore）
    themeStore.selectTheme(targetTheme)
    if (options?.customCSS) {
      themeStore.setCustomCSS(options.customCSS)
    }
  }

  async function copyToWechat() {
    const themeStore = useThemeStore()
    const css = themeStore.getThemeCSS(themeStore.themeId)

    try {
      await execCopyToWechat(markdown.value, css)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  return {
    markdown,
    currentFilePath,
    workspaceDir,
    setMarkdown,
    setFilePath,
    setWorkspaceDir,
    resetDocument,
    copyToWechat,
  }
})
