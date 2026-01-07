<template>
  <div class="theme-live-preview">
    <div class="preview-header-mini">
      <span>实时预览</span>
    </div>
    <iframe
      ref="iframeRef"
      class="preview-iframe"
      :srcdoc="shellDoc"
      title="主题预览"
      sandbox="allow-same-origin"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { createMarkdownParser, processHtml, convertCssToWeChatDarkMode } from "@wemd/core";
import { useUIThemeStore } from "../../store/uiThemeStore";

const props = defineProps<{
  css: string;
}>();

// 主题预览用的示例 Markdown
const PREVIEW_MARKDOWN = `# 一级标题示例

这是一段**加粗文本**、*斜体文本*、~~删除线文本~~、==高亮文本==和 [链接示例](https://github.com/qingu-x/md-editor)。
正文段落通常需要设置行高和间距，以保证阅读体验。

---

## 二级标题

> 这是一个引用块示例，通常用于强调重要内容或摘录。

| 平台 | 特点 | 适用程度 |
| :--- | :--- | :--- |
| 微信 | 封闭但流量大 | ⭐⭐⭐⭐⭐ |
| 博客 | 自由但流量小 | ⭐⭐⭐ |

### 三级标题

这里演示脚注的使用：[WeChat Markdown](https://github.com/qingu-x/md-editor "WeMD 是一款专为公众号设计的编辑器") 可以极大提升排版效率。

> [!TIP]
> 这是一个提示块示例。支持切换“默认彩色”或“跟随主题色”风格，让排版更统一。

- 无序列表
  - 嵌套的无序列表 A
  - 嵌套的无序列表 B


1. 有序列表
   1. 嵌套的有序列表 A
   2. 嵌套的有序列表 B


#### 四级标题

这里有 \`行内代码\` 样式，也可以用来表示 \`npm install wemd\` 等指令。

\`\`\`js
// 代码块示例
function hello() {
  console.log("Hello WeMD");
}
\`\`\`

![WeMD 示例图片：不仅支持常规排版，更可以深度定制每一个细节。](https://img.wemd.app/example.jpg)
`;

const uiThemeStore = useUIThemeStore();
const isDarkMode = computed(() => uiThemeStore.theme === "dark");
const iframeRef = ref<HTMLIFrameElement | null>(null);

const parser = createMarkdownParser();

const shellDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style id="base-style">
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      font-size: 14px;
      line-height: 1.6;
      transition: background 0.2s, color 0.2s;
    }
    /* 隐藏滚动条直到内容加载 */
    body:empty { display: none; }
  </style>
  <style id="theme-style"></style>
</head>
<body><div id="preview-root"></div></body>
</html>
`;

const rawHtml = computed(() => parser.render(PREVIEW_MARKDOWN));

const finalCss = computed(() => (isDarkMode.value ? convertCssToWeChatDarkMode(props.css) : props.css));

const html = computed(() => {
  return processHtml(rawHtml.value, finalCss.value, false);
});

const updateContent = (() => {
  let timer: any = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const iframe = iframeRef.value;
      if (!iframe) return;

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      const themeStyle = doc.getElementById("theme-style");
      const root = doc.getElementById("preview-root");

      if (themeStyle && root) {
        // 保存当前滚动位置
        const scrollY = iframe.contentWindow?.scrollY || 0;

        // 更新颜色
        doc.body.style.background = isDarkMode.value ? "#252526" : "#fff";
        doc.body.style.color = isDarkMode.value ? "#d4d4d4" : "#000";

        // 更新样式和 HTML
        themeStyle.textContent = finalCss.value;
        root.innerHTML = html.value;

        // 恢复滚动位置
        iframe.contentWindow?.scrollTo(0, scrollY);
      }
    }, 100);
  };
})();

watch([html, finalCss, isDarkMode], () => {
  updateContent();
}, { immediate: true });

onMounted(() => {
  const iframe = iframeRef.value;
  if (!iframe) return;

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc && doc.readyState === "complete" && doc.getElementById("preview-root")) {
    updateContent();
  } else {
    iframe.onload = updateContent;
  }
});
</script>

<style scoped>
.theme-live-preview {
  flex: 1;
  min-width: 280px;
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  min-height: 0;
}

.preview-header-mini {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: var(--bg-primary);
  flex-shrink: 0;
}

.preview-iframe {
  flex: 1;
  width: 100%;
  border: none;
  background: #fff;
}
</style>
