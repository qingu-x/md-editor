# WeMD Electron App

基于 Electron 的 WeMD 桌面应用，完全复用 Web 端代码。

## 开发

### 前置条件
确保 Web 应用的开发服务器正在运行：

```bash
# 在项目根目录或 apps/web 目录
cd apps/web
npm run dev
```

### 启动 Electron
```bash
cd apps/electron
npm run dev
```

Electron 会自动加载 `http://localhost:5173`。

## 生产构建

### 1. 构建 Web 应用
```bash
cd apps/web
npm run build
```

### 2. 打包 Electron

#### macOS
```bash
cd apps/electron
npm run build:mac
```

生成的 `.dmg` 和 `.zip` 文件在 `apps/electron/dist/` 目录。

#### Windows
```bash
npm run build:win
```

#### Linux
```bash
npm run build:linux
```

## 功能特性

- ✅ 完全复用 Web 端代码和样式
- ✅ 支持所有微信公众号自定义 CSS
- ✅ 原生 macOS 窗口体验
- ✅ 中文菜单
- ✅ 开发模式热重载

## 目录结构

```
apps/electron/
├── main.js                 # Electron 主进程
├── preload.js             # 预加载脚本
├── package.json           # 依赖配置
├── electron-builder.json  # 打包配置
└── dist/                  # 构建产物（打包后生成）
```

## 注意事项

1. **开发模式**：必须先启动 Web 开发服务器（`npm run dev` in apps/web）
2. **生产构建**：必须先构建 Web 应用（`npm run build` in apps/web）
3. **图标**：如需自定义图标，请在 `apps/electron/assets/` 目录放置图标文件
