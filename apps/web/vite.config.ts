import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  // Electron 和大多数静态部署都建议使用相对路径
  base: './',

  plugins: [
    vue({
      script: {
        defineModel: true,
        propsDestructure: true,
      },
    }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    // 目标浏览器
    target: 'esnext',

    // 启用 CSS 代码分割
    cssCodeSplit: true,

    // 构建后是否生成 source map 文件
    sourcemap: false,

    // chunk 大小警告的限制(kb)
    chunkSizeWarningLimit: 1000,

    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        // 生产环境移除 console
        drop_console: true,
        drop_debugger: true,
      },
    },

    rollupOptions: {
      output: {
        // 静态资源分类打包
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',

        manualChunks: (id) => {
          // node_modules 依赖分包
          if (id.includes('node_modules')) {
            // Vue 核心库
            if (id.includes('vue') || id.includes('pinia')) {
              return 'vue-vendor'
            }

            // CodeMirror 编辑器
            if (id.includes('codemirror') || id.includes('@codemirror') || id.includes('@lezer')) {
              return 'codemirror'
            }

            // Markdown 解析相关
            if (id.includes('markdown-it') || id.includes('katex') || id.includes('highlight.js')) {
              return 'markdown'
            }

            // 图标库
            if (id.includes('lucide')) {
              return 'icons'
            }

            // 云存储 SDK
            if (id.includes('cos-js-sdk') || id.includes('qiniu-js') || id.includes('tiny-oss')) {
              return 'cloud-sdk'
            }

            // 其他第三方库
            return 'vendor'
          }
        },
      },
    },
  },

  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'vue',
      'pinia',
      'codemirror',
      '@codemirror/lang-markdown',
      '@codemirror/language',
      '@codemirror/state',
      '@codemirror/view',
      'katex',
      'dompurify',
    ],
    exclude: ['@wemd/core'],
  },

  // 开发服务器配置
  server: {
    port: 5173,
    host: true,
    open: false,
    cors: true,
    // 预热常用文件
    warmup: {
      clientFiles: ['./src/App.vue', './src/main.ts', './src/components/**/*.vue'],
    },
  },

  // 预览服务器配置
  preview: {
    port: 4173,
    host: true,
  },
})
