/**
 * markdown-it-github-alert
 * 解析 GitHub 风格的 Alert 语法
 *
 * 语法：
 * > [!NOTE]
 * > 内容
 *
 * 支持类型：NOTE, TIP, IMPORTANT, WARNING, CAUTION
 */

import type MarkdownIt from "markdown-it";
import Token from "markdown-it/lib/token";
import StateCore from "markdown-it/lib/rules_core/state_core";

interface AlertConfig {
  type: string;
  label: string;
  icon: string;
  cssClass: string;
}

const ALERT_CONFIGS: AlertConfig[] = [
  { type: "NOTE", label: "备注", icon: "ℹ️", cssClass: "note" },
  { type: "TIP", label: "提示", icon: "💡", cssClass: "tip" },
  { type: "IMPORTANT", label: "重要", icon: "📌", cssClass: "important" },
  { type: "WARNING", label: "警告", icon: "⚠️", cssClass: "warning" },
  { type: "CAUTION", label: "危险", icon: "🚨", cssClass: "caution" },
];

// 允许 [!TYPE] 后面接内容或者独占一行
const ALERT_PATTERN = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;

function findAlertType(
  text: string,
): { config: AlertConfig; restContent: string } | null {
  const match = text.match(ALERT_PATTERN);
  if (!match) return null;
  const type = match[1].toUpperCase();
  const config = ALERT_CONFIGS.find((c) => c.type === type);
  if (!config) return null;
  // 返回配置和剩余内容
  const restContent = text.slice(match[0].length);
  return { config, restContent };
}

export default function markdownItGitHubAlert(md: MarkdownIt): void {
  // 在 core 规则中处理 blockquote，转换为 callout
  md.core.ruler.push("github-alert", (state: StateCore) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // 查找 blockquote_open
      if (token.type !== "blockquote_open") continue;

      // 查找对应的 blockquote_close
      let closeIdx = -1;
      let depth = 1;
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === "blockquote_open") depth++;
        if (tokens[j].type === "blockquote_close") {
          depth--;
          if (depth === 0) {
            closeIdx = j;
            break;
          }
        }
      }

      if (closeIdx === -1) continue;

      // 查找第一个 inline token
      let firstInlineIdx = -1;
      for (let j = i + 1; j < closeIdx; j++) {
        if (tokens[j].type === "inline" && tokens[j].content) {
          firstInlineIdx = j;
          break;
        }
      }

      if (firstInlineIdx === -1) continue;

      const firstInline = tokens[firstInlineIdx];
      const content = firstInline.content;

      // 检查是否是 alert 语法
      const alertResult = findAlertType(content);
      if (!alertResult) continue;

      const { config: alertConfig, restContent } = alertResult;

      // 转换为 callout
      // 修改 blockquote_open
      token.type = "callout_open";
      token.tag = "section";
      token.attrSet("class", `callout callout-${alertConfig.cssClass}`);

      // 修改 blockquote_close
      tokens[closeIdx].type = "callout_close";
      tokens[closeIdx].tag = "section";

      // 更新 inline content，移除 [!TYPE] 标记
      firstInline.content = restContent;

      // 同时更新 firstInline.children（如果存在）
      if (firstInline.children && firstInline.children.length > 0) {
        const firstChild = firstInline.children[0];
        if (firstChild.type === "text") {
          const childResult = findAlertType(firstChild.content);
          if (childResult) {
            firstChild.content = childResult.restContent;
          }
        }
      }

      // 在第一个段落开始处插入标题
      // 查找 paragraph_open
      for (let j = i + 1; j < closeIdx; j++) {
        if (tokens[j].type === "paragraph_open") {
          // 插入标题 token
          const titleOpen = new Token("callout_title_open", "div", 1);
          titleOpen.attrSet("class", "callout-title");

          const titleContent = new Token("html_inline", "", 0);
          titleContent.content = `<span class="callout-icon">${alertConfig.icon}</span><span>${alertConfig.label}</span>`;

          const titleClose = new Token("callout_title_close", "div", -1);

          // 插入标题
          tokens.splice(j, 0, titleOpen, titleContent, titleClose);
          break;
        }
      }
    }
  });

  // 渲染规则
  md.renderer.rules.callout_open = (tokens: Token[], idx: number) => {
    const token = tokens[idx];
    const classAttr = token.attrGet("class") || "callout";
    return `<section class="${classAttr}">\n`;
  };

  md.renderer.rules.callout_close = () => "</section>\n";

  md.renderer.rules.callout_title_open = (tokens: Token[], idx: number) => {
    const token = tokens[idx];
    const classAttr = token.attrGet("class") || "callout-title";
    return `<div class="${classAttr}">`;
  };

  md.renderer.rules.callout_title_close = () => "</div>\n";
}
