# 腾讯云 COS 配置指南

## 📋 前置准备

你已经完成：
- ✅ 创建了 COS 存储桶：`wemd-1302564514`
- ✅ 区域：广州 (`ap-guangzhou`)

## 🔑 获取访问密钥

1. 访问腾讯云控制台：https://console.cloud.tencent.com/cam/capi
2. 点击"新建密钥"（如果还没有）
3. 记下 **SecretId** 和 **SecretKey**

## ⚙️ 配置步骤

### 1. 编辑环境变量文件

打开 `apps/server/.env` 文件，填入你的密钥：

```env
# 服务器端口
PORT=4000

# 腾讯云 COS 配置
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_BUCKET=wemd-1302564514
COS_REGION=ap-guangzhou

# 存储模式: local | cos
STORAGE_MODE=cos
```

### 2. 重启后端服务

```bash
cd apps/server
pnpm run dev
```

### 3. 测试上传

1. 打开前端（http://localhost:5173）
2. 在编辑器中粘贴一张图片
3. 查看返回的 URL，应该是：
   ```
   https://wemd-1302564514.cos.ap-guangzhou.myqcloud.com/images/xxx.jpg
   ```

## 🔄 切换存储模式

### 使用本地存储
```env
STORAGE_MODE=local
```

### 使用腾讯云 COS
```env
STORAGE_MODE=cos
```

## 💰 费用说明

- **存储费用**：0.118元/GB/月
- **流量费用**：0.5元/GB（外网下行）
- **请求费用**：0.01元/万次

**预估**：存 100 张图片（约 10GB），每月约 6-7 元

## ⚠️ 注意事项

1. **不要提交 `.env` 文件到 Git**
   - `.env` 已经在 `.gitignore` 中
   - 只提交 `.env.example` 作为模板

2. **生产环境配置**
   - 部署到服务器时，在服务器上创建 `.env` 文件
   - 或使用环境变量注入（推荐）

3. **安全建议**
   - 定期更换 SecretKey
   - 使用子账号密钥，限制权限范围
