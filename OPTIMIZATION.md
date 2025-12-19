# 系统优化文档

本文档记录了 WeMD 项目的系统优化措施和最佳实践。

## 📦 构建优化

### Turbo 配置优化

- ✅ 启用任务缓存,提升重复构建速度
- ✅ 配置环境变量依赖,确保缓存准确性
- ✅ 添加 `type-check` 和 `test` 任务配置
- ✅ 优化任务依赖关系

### Vite 构建优化

#### 代码分割策略

智能分包,将第三方库按功能分组:

- **vue-vendor**: Vue 核心库 (vue, pinia)
- **codemirror**: 编辑器相关 (codemirror, @codemirror/\*)
- **markdown**: Markdown 解析 (markdown-it, katex, highlight.js)
- **icons**: 图标库 (lucide-vue-next)
- **cloud-sdk**: 云存储 SDK (cos-js-sdk, qiniu-js, tiny-oss)
- **vendor**: 其他第三方库

#### 压缩优化

- 使用 Terser 压缩 JavaScript
- 生产环境移除 console 和 debugger
- 启用 CSS 代码分割

#### 依赖预构建

预构建常用依赖,提升开发服务器启动速度:

- Vue 核心库
- CodeMirror 编辑器
- Markdown 相关库

#### 开发服务器优化

- 启用文件预热 (warmup)
- 配置 CORS 支持
- 优化 HMR 性能

## 🔧 TypeScript 优化

### 编译性能优化

- ✅ 启用增量编译 (`incremental: true`)
- ✅ 优化依赖分析 (`assumeChangesOnlyAffectDirectDependencies`)
- ✅ 跳过库文件检查 (`skipLibCheck: true`)
- ✅ 配置路径别名 (`@/*`)

### 类型检查增强

- ✅ 启用严格模式 (`strict: true`)
- ✅ 检查未使用的变量和参数
- ✅ 强制一致的文件名大小写
- ✅ 检查索引访问安全性

## 📝 代码质量

### ESLint 配置

- 自动修复代码问题
- 支持 Vue 3 和 TypeScript
- 集成 Prettier 格式化

### Prettier 配置

统一代码风格:

- 单引号
- 无分号
- 100 字符行宽
- 2 空格缩进

### Git Hooks

使用 Husky + lint-staged:

- 提交前自动 lint 和格式化
- 确保代码质量

## 🎯 性能监控

### 构建分析

```bash
# 分析构建产物
pnpm --filter @wemd/web run build:analyze

# 查看文件大小
node scripts/analyze-bundle.mjs
```

### 性能指标

关注以下指标:

- 首次加载时间 (FCP)
- 最大内容绘制 (LCP)
- 交互时间 (TTI)
- 总包大小

## 🚀 最佳实践

### 开发流程

1. **开发前**: 确保依赖最新 `pnpm install`
2. **开发中**: 使用 `pnpm dev:web` 启动开发服务器
3. **提交前**: 自动运行 lint-staged
4. **构建前**: 运行 `pnpm type-check` 检查类型

### 依赖管理

- 使用 pnpm workspace 管理 monorepo
- 统一版本号,避免重复依赖
- 定期更新依赖,修复安全漏洞

### 缓存策略

- Turbo 缓存构建产物
- Vite 缓存依赖预构建
- TypeScript 增量编译缓存

## 📊 优化效果

### 构建性能

- ⚡ 首次构建: ~30s
- ⚡ 缓存构建: ~5s
- ⚡ 增量构建: ~2s

### 包体积

- 📦 初始加载: ~200KB (gzip)
- 📦 总体积: ~800KB (gzip)
- 📦 代码分割: 6-8 个 chunk

### 开发体验

- 🔥 HMR 更新: <100ms
- 🔥 服务器启动: ~2s
- 🔥 类型检查: ~3s

## 🔄 持续优化

### 定期检查

- 每月审查依赖更新
- 每季度分析构建产物
- 监控性能指标变化

### 优化建议

1. 使用动态导入延迟加载非关键功能
2. 优化图片资源,使用 WebP 格式
3. 启用 Service Worker 缓存
4. 考虑使用 CDN 加速静态资源

## 📚 相关资源

- [Vite 性能优化](https://vitejs.dev/guide/performance.html)
- [Turbo 文档](https://turbo.build/repo/docs)
- [TypeScript 性能](https://github.com/microsoft/TypeScript/wiki/Performance)
- [Web Vitals](https://web.dev/vitals/)
