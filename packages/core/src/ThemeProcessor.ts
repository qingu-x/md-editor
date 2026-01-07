import juice from "juice";

// 常量定义
const DATA_TOOL = "WeMD编辑器";
const SECTION_ID = "wemd";

// 需要添加 data-tool 属性的块级元素
const BLOCK_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "table",
  "figure",
  "pre",
  "hr",
] as const;

/**
 * 处理 HTML，添加 data-tool 属性并应用 CSS 样式
 * @param html - 原始 HTML 字符串
 * @param css - CSS 样式字符串
 * @param inlineStyles - 是否内联样式 (使用 juice)，默认为 true。预览模式建议设为 false 以提高性能。
 * @param inlinePseudoElements - 是否内联伪元素内容（如 ::before / ::after），默认为 false。复制到微信时建议设为 true。
 * @param replaceLocalImages - 是否替换本地图片为占位图，默认为 false。预览模式建议设为 true。
 * @returns 处理后的 HTML 字符串
 */
export const processHtml = (
  html: string,
  css: string,
  inlineStyles: boolean = true,
  inlinePseudoElements: boolean = false,
  replaceLocalImages: boolean = false,
): string => {
  if (!html || !css) {
    return html || "";
  }

  // 替换本地图片为占位图
  if (replaceLocalImages) {
    const placeholderUrl =
      "https://img.wemd.app/wemd/local-image-placeholder.png";
    html = html.replace(
      /<img\s+([^>]*?)src="([^"]+)"([^>]*?)>/gi,
      (match, p1, src, p3) => {
        if (
          !src.startsWith("http://") &&
          !src.startsWith("https://") &&
          !src.startsWith("data:")
        ) {
          return `<img ${p1}src="${placeholderUrl}"${p3} data-original-src="${src}" title="Local image - Upload required for WeChat">`;
        }
        return match;
      },
    );
  }

  // 为顶级块元素添加 data-tool 属性
  BLOCK_TAGS.forEach((tag) => {
    const regex = new RegExp(`<${tag}(\\s+[^>]*|)>`, "gi");
    html = html.replace(regex, (match, attributes) => {
      // 检查 data-tool 是否已存在，避免重复
      if (match.includes("data-tool=")) return match;
      // attributes 包含前导空格（如果存在），或者为空字符串
      return `<${tag} data-tool="${DATA_TOOL}"${attributes}>`;
    });
  });

  // 处理 MathJax 相关的替换
  html = html.replace(
    /<mjx-container (class="inline.+?)<\/mjx-container>/g,
    "<span $1</span>",
  );
  html = html.replace(/\s<span class="inline/g, '&nbsp;<span class="inline');
  html = html.replace(/svg><\/span>\s/g, "svg></span>&nbsp;");
  html = html.replace(/mjx-container/g, "section");
  html = html.replace(/class="mjx-solid"/g, 'fill="none" stroke-width="70"');
  html = html.replace(/<mjx-assistive-mml.+?<\/mjx-assistive-mml>/g, "");

  // 保护代码块中的空格，防止微信清洗时删除
  html = html.replace(
    /<code([^>]*class="[^"]*\bhljs\b[^"]*"[^>]*)>([\s\S]*?)<\/code>/g,
    (match, attrs: string, inner: string) => {
      let protected_ = inner;
      protected_ = protected_.replace(/\t/g, "&nbsp;&nbsp;");
      protected_ = protected_.replace(/<\/span> <span/g, " </span><span");
      protected_ = protected_.replace(/\n( +)/g, (m, spaces: string) => {
        return "\n" + "&nbsp;".repeat(spaces.length);
      });
      protected_ = protected_.replace(/^( +)/, (m, spaces: string) => {
        return "&nbsp;".repeat(spaces.length);
      });
      return `<code${attrs}>${protected_}</code>`;
    },
  );

  // 检测 Mac 风格控制栏：同时检测伪元素选择器和红绿灯颜色
  const hasMacBarPseudo =
    css.includes("pre.custom::before") || css.includes("pre::before");
  const hasMacBar = hasMacBarPseudo && css.includes("#ff5f56");

  // 复制到微信时，将 CSS 伪元素替换为真实 HTML（微信会清洗伪元素）
  if (hasMacBar && inlinePseudoElements) {
    let paddingTop = 36;
    const paddingMatch = css.match(
      /pre\s+code\.hljs\s*\{[^}]*padding:\s*(\d+)px/i,
    );
    if (paddingMatch) {
      paddingTop = parseInt(paddingMatch[1], 10);
    }
    const marginTop = -(paddingTop - 12);

    const macBarHtml = `<span style="display:block;margin:${marginTop}px 0 16px 0;line-height:1;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#ff5f56;margin-right:8px;"></span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#ffbd2e;margin-right:8px;"></span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#27c93f;"></span></span>`;
    html = html.replace(
      /<code([^>]*class="[^"]*\bhljs\b[^"]*"[^>]*)>/gi,
      `<code$1>${macBarHtml}`,
    );

    // 移除 CSS 伪元素规则，避免重复
    css = css.replace(
      /#wemd[^{]*pre[^{]*::before\s*\{[^}]*#ff5f56[^}]*\}/gi,
      "",
    );
  }

  // 处理引用的伪元素 (大引号、直角边框等)
  if (inlinePseudoElements) {
    // 1. 大引号样式 (Quotation Marks)
    if (css.includes("blockquote::before") && css.includes('content: "“"')) {
      const quoteColorMatch = css.match(
        /#wemd\s+blockquote::before\s*\{[^}]*color:\s*([^;}]+)/i,
      );
      const quoteColor = quoteColorMatch
        ? quoteColorMatch[1].trim()
        : "inherit";

      html = html.replace(
        /<blockquote([^>]*)>([\s\S]*?)<\/blockquote>/gi,
        (match, attrs, content) => {
          // 如果已经有 data-tool 或其他标识，说明可能是我们处理过的
          const beforeHtml = `<span style="display:block;height:0;font-size:60px;color:${quoteColor};font-family:Georgia,serif;line-height:1;margin-left:-40px;margin-top:-6px;opacity:0.3;pointer-events:none;">“</span>`;
          return `<blockquote${attrs} style="position:relative;">${beforeHtml}<section style="position:relative;z-index:1;">${content}</section></blockquote>`;
        },
      );

      // 移除 CSS 中的伪元素规则
      css = css.replace(
        /#wemd\s+blockquote::before\s*\{[^}]*content:\s*"“"[^}]*\}/gi,
        "",
      );
    }

    // 2. 直角边框样式 (Corner Frame)
    if (
      css.includes("blockquote::before") &&
      css.includes("border-top") &&
      css.includes("border-left")
    ) {
      const beforeMatch = css.match(
        /#wemd\s+blockquote::before\s*\{([^}]*border-top:[^}]*border-left:[^}]*)\}/i,
      );
      const afterMatch = css.match(
        /#wemd\s+blockquote::after\s*\{([^}]*border-bottom:[^}]*border-right:[^}]*)\}/i,
      );

      if (beforeMatch && afterMatch) {
        const beforeStyle = beforeMatch[1]
          .trim()
          .replace(/\n/g, "")
          .replace(/\s+/g, " ");
        const afterStyle = afterMatch[1]
          .trim()
          .replace(/\n/g, "")
          .replace(/\s+/g, " ");

        html = html.replace(
          /<blockquote([^>]*)>([\s\S]*?)<\/blockquote>/gi,
          (match, attrs, content) => {
            const beforeHtml = `<span style="display:block;position:absolute;top:0;left:0;width:20px;height:20px;${beforeStyle}"></span>`;
            const afterHtml = `<span style="display:block;position:absolute;bottom:0;right:0;width:20px;height:20px;${afterStyle}"></span>`;
            return `<blockquote${attrs} style="position:relative;">${beforeHtml}${content}${afterHtml}</blockquote>`;
          },
        );

        // 移除 CSS 中的伪元素规则
        css = css.replace(
          /#wemd\s+blockquote::before\s*\{[^}]*border-top:[^}]*border-left:[^}]*\}/gi,
          "",
        );
        css = css.replace(
          /#wemd\s+blockquote::after\s*\{[^}]*border-bottom:[^}]*border-right:[^}]*\}/gi,
          "",
        );
      }
    }

    // 3. 中心强调样式 (Center Accent)
    if (
      css.includes("blockquote::before") &&
      css.includes("margin: 0 auto 15px")
    ) {
      const beforeMatch = css.match(
        /#wemd\s+blockquote::before\s*\{([^}]*background:[^}]*margin:\s*0\s+auto\s+15px[^}]*)\}/i,
      );
      const afterMatch = css.match(
        /#wemd\s+blockquote::after\s*\{([^}]*background:[^}]*margin:\s*15px\s+auto\s+0[^}]*)\}/i,
      );

      if (beforeMatch && afterMatch) {
        const beforeStyle = beforeMatch[1]
          .trim()
          .replace(/\n/g, "")
          .replace(/\s+/g, " ");
        const afterStyle = afterMatch[1]
          .trim()
          .replace(/\n/g, "")
          .replace(/\s+/g, " ");

        html = html.replace(
          /<blockquote([^>]*)>([\s\S]*?)<\/blockquote>/gi,
          (match, attrs, content) => {
            const beforeHtml = `<span style="display:block;width:40px;${beforeStyle}"></span>`;
            const afterHtml = `<span style="display:block;width:40px;${afterStyle}"></span>`;
            return `<blockquote${attrs} style="text-align:center;">${beforeHtml}${content}${afterHtml}</blockquote>`;
          },
        );

        // 移除 CSS 中的伪元素规则
        css = css.replace(
          /#wemd\s+blockquote::before\s*\{[^}]*margin:\s*0\s+auto\s+15px[^}]*\}/gi,
          "",
        );
        css = css.replace(
          /#wemd\s+blockquote::after\s*\{[^}]*margin:\s*15px\s+auto\s+0[^}]*\}/gi,
          "",
        );
      }
    }
  }

  // 将 HTML 包裹在 id="wemd" 的 section 中，以便 juice 能够匹配以 #wemd 开头的选择器
  const wrappedHtml = `<section id="${SECTION_ID}">${html}</section>`;

  if (!inlineStyles) {
    return wrappedHtml;
  }

  try {
    const res = juice.inlineContent(wrappedHtml, css, {
      inlinePseudoElements,
      preserveImportant: true,
    });

    // 保留 section#wemd 包裹层以保持 #wemd 样式（边距、最大宽度、边框等）
    // 这与遗留行为一致，其中 #wemd 样式应用于容器
    return res;
  } catch (e) {
    console.error("Juice inline error:", e);
    // 返回包装后的 HTML，即使 juice 处理失败
    return wrappedHtml;
  }
};
