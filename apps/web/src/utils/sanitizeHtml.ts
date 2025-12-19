/**
 * HTML 清理工具
 * 使用 DOMPurify 防止 XSS 攻击
 */
import DOMPurify from 'dompurify'

/**
 * 清理 HTML 内容,防止 XSS 攻击
 * @param html - 需要清理的 HTML 字符串
 * @returns 清理后的安全 HTML 字符串
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''

  // 配置 DOMPurify 允许的标签和属性
  // 由于这是 Markdown 编辑器,我们需要允许大部分 HTML 标签和样式
  const config = {
    // 允许所有安全的 HTML 标签
    ALLOWED_TAGS: [
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'figure',
      'figcaption',
      'img',
      'pre',
      'code',
      'hr',
      'a',
      'strong',
      'em',
      'del',
      'mark',
      'span',
      'div',
      'section',
      'br',
      'sup',
      'sub',
      'ruby',
      'rt',
      'rp',
      'dl',
      'dt',
      'dd',
      'svg',
      'path',
      'g',
      'rect',
      'circle',
      'line',
      'polyline',
      'polygon',
      'defs',
      'use',
      'symbol',
      'text',
      'tspan',
      'style', // 允许 style 标签用于主题样式
    ],
    // 允许的属性
    ALLOWED_ATTR: [
      'class',
      'id',
      'style',
      'href',
      'src',
      'alt',
      'title',
      'width',
      'height',
      'data-tool',
      'data-latex',
      'data-lang',
      'colspan',
      'rowspan',
      'aria-hidden',
      'focusable',
      'viewBox',
      'xmlns',
      'fill',
      'stroke',
      'stroke-width',
      'stroke-linecap',
      'd',
      'x',
      'y',
      'x1',
      'y1',
      'x2',
      'y2',
      'cx',
      'cy',
      'r',
      'rx',
      'ry',
      'transform',
      'points',
    ],
    // 允许 data 属性
    ALLOW_DATA_ATTR: true,
    // 保留注释(某些 SVG 可能需要)
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // 允许内联样式
    ALLOW_ARIA_ATTR: true,
    // 返回 DOM 节点而不是字符串
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    // 保留安全的 URI 协议
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  }

  return DOMPurify.sanitize(html, config)
}
