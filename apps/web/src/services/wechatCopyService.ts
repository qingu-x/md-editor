import { processHtml, createMarkdownParser } from "@wemd/core";
import katexCss from "katex/dist/katex.min.css?raw";
import { loadMathJax } from "../utils/mathJaxLoader";
import { hasMathFormula } from "../utils/katexRenderer";
import { convertLinksToFootnotes } from "../utils/linkFootnote";
import { getLinkToFootnoteEnabled } from "../components/Editor/ToolbarState";
import { toast } from "../hooks/useToast";

const buildCopyCss = (themeCss: string) => {
  if (!themeCss) return katexCss;
  return `${themeCss}\n${katexCss}`;
};

/**
 * 将 HTML 中的 checkbox 转换为 emoji
 * 微信公众号会过滤 <input> 标签，需要转为 emoji 替代
 */
const convertCheckboxesToEmoji = (html: string): string => {
  // 使用 &nbsp; 确保空格不被微信吞掉
  // 先替换选中的 checkbox（包含 checked 属性）
  let result = html.replace(/<input[^>]*checked[^>]*>/gi, "✅&nbsp;");
  // 再替换未选中的 checkbox
  result = result.replace(
    /<input[^>]*type=["']checkbox["'][^>]*>/gi,
    "⬜&nbsp;",
  );
  return result;
};

export async function copyToWechat(
  markdown: string,
  css: string,
): Promise<void> {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  document.body.appendChild(container);

  try {
    const shouldLoadMath = hasMathFormula(markdown);
    if (shouldLoadMath) {
      await loadMathJax();
    }
    const parser = createMarkdownParser();
    const rawHtml = parser.render(markdown);
    const themedCss = buildCopyCss(css);
    const sourceHtml = getLinkToFootnoteEnabled()
      ? convertLinksToFootnotes(rawHtml)
      : rawHtml;
    const styledHtml = processHtml(sourceHtml, themedCss, true, true);
    // 转换 checkbox 为 emoji，微信不支持 input 标签
    const finalHtml = convertCheckboxesToEmoji(styledHtml);

    container.innerHTML = finalHtml;

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(container);
    selection?.removeAllRanges();
    selection?.addRange(range);

    document.execCommand("copy");

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const blob = new Blob([container.innerHTML], { type: "text/html" });
        const textBlob = new Blob([markdown], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blob,
            "text/plain": textBlob,
          }),
        ]);
      } catch (e) {
        console.error("Clipboard API 失败，使用回退方案", e);
      }
    }

    // TODO: 使用统一的 Toast 组件
    toast.success("已复制，可以直接粘贴至微信公众号");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("复制失败详情:", error);
    toast.error(`复制失败: ${errorMsg}`);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
}
