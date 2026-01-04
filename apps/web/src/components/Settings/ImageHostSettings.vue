<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { Cloud, Zap, ShieldCheck, Image as ImageIcon } from 'lucide-vue-next';
import type { ImageHostConfig } from '../../services/image/ImageUploader';


interface AllConfigs {
  currentType: ImageHostConfig['type'];
  configs: {
    official?: any;
    qiniu?: any;
    aliyun?: any;
    tencent?: any;
    s3?: any;
  };
}

const allConfigs = reactive<AllConfigs>((() => {
  const saved = localStorage.getItem('imageHostConfigs');
  return saved ? JSON.parse(saved) : { currentType: 'official', configs: {} };
})());

// 当前查看的标签页（不等于激活的图床）
const viewingType = ref<ImageHostConfig['type']>(allConfigs.currentType);
const testResult = ref<string | null>(null);
const isValidating = ref(false);

// 当前激活的图床类型
const activeType = computed(() => allConfigs.currentType);

// 当前查看的配置
const viewingConfig = computed((): ImageHostConfig => ({
  type: viewingType.value,
  config: allConfigs.configs[viewingType.value] || {}
}));

watch(() => allConfigs, (newConfigs) => {
  // 保存所有配置
  localStorage.setItem('imageHostConfigs', JSON.stringify(newConfigs));
  // 同时保存当前配置到旧的 key，保持兼容性
  const currentConfig = { 
    type: newConfigs.currentType, 
    config: newConfigs.configs[newConfigs.currentType] 
  };
  localStorage.setItem('imageHostConfig', JSON.stringify(currentConfig));
}, { deep: true });

// 切换查看的标签页（不改变激活状态）
const handleTabChange = (type: ImageHostConfig['type']) => {
  viewingType.value = type;
  testResult.value = null;
};

// 激活某个图床
const handleActivate = async (type: ImageHostConfig['type']) => {
  // 官方图床无需验证，直接激活
  if (type === 'official') {
    allConfigs.currentType = type;
    return;
  }

  isValidating.value = true;
  testResult.value = '验证中...';

  // 调用 ImageHostManager 验证配置
  try {
    const { ImageHostManager } = await import('../../services/image/ImageUploader');
    // 构造临时的配置对象用于验证
    const configToTest: ImageHostConfig = {
      type: type,
      config: allConfigs.configs[type]
    };

    const manager = new ImageHostManager(configToTest);
    const valid = await manager.validate();

    if (valid) {
      allConfigs.currentType = type;
      testResult.value = null; // 成功切换清除之前的错误信息
    } else {
      testResult.value = '❌ 无法启用：图床连接测试失败，请检查配置。';
      // 自动触发一次详细测试以显示具体错误
      await testConnection();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    testResult.value = `❌ 无法启用：验证过程出错 (${message})`;
  } finally {
    isValidating.value = false;
  }
};

const handleConfigChange = (key: string, value: any) => {
  if (!allConfigs.configs[viewingType.value]) {
    allConfigs.configs[viewingType.value] = {};
  }
  allConfigs.configs[viewingType.value][key] = value;
};

const testConnection = async () => {
  testResult.value = '测试中...';
  try {
    const { ImageHostManager } = await import('../../services/image/ImageUploader');
    const manager = new ImageHostManager(viewingConfig.value);
    const valid = await manager.validate();
    testResult.value = valid ? '✅ 配置有效' : '❌ 配置无效';
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    testResult.value = `❌ ${message}`;
  }
};

const getDisplayName = (type: ImageHostConfig['type']) => {
  switch (type) {
    case 'aliyun': return '阿里云 OSS';
    case 'tencent': return '腾讯云 COS';
    case 's3': return 'S3 图床';
    case 'qiniu': return '七牛云图床';
    default: return '官方图床';
  }
};
</script>

<template>
  <div class="image-host-settings">
    <!-- 顶部选项卡 -->
    <div class="host-tabs">
      <button
        v-for="type in (['official', 'qiniu', 'aliyun', 'tencent', 's3'] as const)"
        :key="type"
        :class="['host-tab', viewingType === type ? 'active' : '']"
        @click="handleTabChange(type)"
      >
        {{ getDisplayName(type).replace('图床', '') }}
        <span v-if="activeType === type" class="tab-active-badge">使用中</span>
      </button>
    </div>

    <!-- 配置表单 -->
    <div class="host-config-panel">
      <!-- 官方图床 -->
      <div v-if="viewingType === 'official'" class="official-host-intro">
        <div class="intro-header">
          <div class="intro-icon-wrapper">
            <Cloud :size="48" :stroke-width="1.5" class="primary-icon" />
          </div>
          <h3>官方托管服务</h3>
          <p>专为公众号排版优化的图片托管方案</p>
        </div>

        <div class="feature-grid">
          <div class="feature-item">
            <div class="feature-icon"><Zap :size="20" /></div>
            <div class="feature-text">
              <strong>高速访问</strong>
              <span>基于全球边缘网络，加载流畅</span>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><ShieldCheck :size="20" /></div>
            <div class="feature-text">
              <strong>安全稳定</strong>
              <span>无需配置 Key，HTTPS 加密传输</span>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><ImageIcon :size="20" /></div>
            <div class="feature-text">
              <strong>开箱即用</strong>
              <span>默认集成，专注于内容创作</span>
            </div>
          </div>
        </div>

        <div v-if="activeType === 'official'" class="active-status">
          <span class="pulsing-dot"></span>
          <span>当前已启用官方图床</span>
        </div>
        <button v-else class="btn-activate" @click="handleActivate('official')">
          启用官方图床
        </button>
      </div>

      <!-- 七牛云 -->
      <div v-else-if="viewingType === 'qiniu'" class="host-config">
        <div v-if="activeType === 'qiniu'" class="active-status">
          <span class="pulsing-dot"></span>
          <span>当前使用中</span>
        </div>
        <div class="config-field">
          <label>AccessKey</label>
          <input
            type="text"
            placeholder="从七牛云控制台获取"
            :value="allConfigs.configs.qiniu?.accessKey || ''"
            @input="handleConfigChange('accessKey', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>SecretKey</label>
          <input
            type="password"
            placeholder="从七牛云控制台获取"
            :value="allConfigs.configs.qiniu?.secretKey || ''"
            @input="handleConfigChange('secretKey', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>存储空间名称（Bucket）</label>
          <input
            type="text"
            placeholder="your-bucket"
            :value="allConfigs.configs.qiniu?.bucket || ''"
            @input="handleConfigChange('bucket', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>存储区域</label>
          <select
            :value="allConfigs.configs.qiniu?.region || 'z0'"
            @change="handleConfigChange('region', ($event.target as HTMLSelectElement).value)"
            class="config-select"
          >
            <option value="z0">华东-浙江 (z0)</option>
            <option value="cn-east-2">华东-浙江2 (cn-east-2)</option>
            <option value="z1">华北-河北 (z1)</option>
            <option value="z2">华南-广东 (z2)</option>
            <option value="na0">北美-洛杉矶 (na0)</option>
            <option value="as0">亚太-新加坡 (as0)</option>
            <option value="ap-northeast-1">亚太-首尔 (ap-northeast-1)</option>
          </select>
        </div>
        <div class="config-field">
          <label>CDN 域名</label>
          <input
            type="text"
            placeholder="https://xxx.clouddn.com（七牛云测试域名需加 http://）"
            :value="allConfigs.configs.qiniu?.domain || ''"
            @input="handleConfigChange('domain', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-footer">
          <small>
            <a href="https://portal.qiniu.com/kodo/bucket" target="_blank">七牛云控制台</a>
          </small>
          <div v-if="testResult" class="test-result">{{ testResult }}</div>
          <button @click="testConnection">测试连接</button>
        </div>
        <button v-if="activeType !== 'qiniu'" class="btn-activate" :disabled="isValidating" @click="handleActivate('qiniu')">
          {{ isValidating ? '验证中...' : '启用七牛云图床' }}
        </button>
      </div>

      <!-- 阿里云 OSS -->
      <div v-else-if="viewingType === 'aliyun'" class="host-config">
        <div v-if="activeType === 'aliyun'" class="active-status">
          <span class="pulsing-dot"></span>
          <span>当前使用中</span>
        </div>
        <div class="config-field">
          <label>AccessKey ID</label>
          <input
            type="text"
            placeholder="从阿里云控制台获取"
            :value="allConfigs.configs.aliyun?.accessKeyId || ''"
            @input="handleConfigChange('accessKeyId', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>AccessKey Secret</label>
          <input
            type="password"
            placeholder="从阿里云控制台获取"
            :value="allConfigs.configs.aliyun?.accessKeySecret || ''"
            @input="handleConfigChange('accessKeySecret', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>Bucket 名称</label>
          <input
            type="text"
            placeholder="your-bucket"
            :value="allConfigs.configs.aliyun?.bucket || ''"
            @input="handleConfigChange('bucket', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>地域节点</label>
          <input
            type="text"
            placeholder="oss-cn-hangzhou"
            :value="allConfigs.configs.aliyun?.region || ''"
            @input="handleConfigChange('region', ($event.target as HTMLInputElement).value)"
          />
          <small>例如：oss-cn-hangzhou（杭州）、oss-cn-beijing（北京）</small>
        </div>
        <div class="config-field">
          <label>自定义域名（可选）</label>
          <input
            type="text"
            placeholder="https://cdn.example.com"
            :value="allConfigs.configs.aliyun?.endpoint || ''"
            @input="handleConfigChange('endpoint', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-footer">
          <small>
            <a href="https://oss.console.aliyun.com/bucket" target="_blank">阿里云 OSS 控制台</a>
          </small>
          <div v-if="testResult" class="test-result">{{ testResult }}</div>
          <button @click="testConnection">测试连接</button>
        </div>
        <button v-if="activeType !== 'aliyun'" class="btn-activate" :disabled="isValidating" @click="handleActivate('aliyun')">
          {{ isValidating ? '验证中...' : '启用阿里云 OSS' }}
        </button>
      </div>

      <!-- 腾讯云 COS -->
      <div v-else-if="viewingType === 'tencent'" class="host-config">
        <div v-if="activeType === 'tencent'" class="active-status">
          <span class="pulsing-dot"></span>
          <span>当前使用中</span>
        </div>
        <div class="config-field">
          <label>SecretId</label>
          <input
            type="text"
            placeholder="从腾讯云控制台获取"
            :value="allConfigs.configs.tencent?.secretId || ''"
            @input="handleConfigChange('secretId', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>SecretKey</label>
          <input
            type="password"
            placeholder="从腾讯云控制台获取"
            :value="allConfigs.configs.tencent?.secretKey || ''"
            @input="handleConfigChange('secretKey', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>存储桶名称（Bucket）</label>
          <input
            type="text"
            placeholder="your-bucket-1234567890"
            :value="allConfigs.configs.tencent?.bucket || ''"
            @input="handleConfigChange('bucket', ($event.target as HTMLInputElement).value)"
          />
          <small>格式：bucketname-appid</small>
        </div>
        <div class="config-field">
          <label>所属地域</label>
          <input
            type="text"
            placeholder="ap-guangzhou"
            :value="allConfigs.configs.tencent?.region || ''"
            @input="handleConfigChange('region', ($event.target as HTMLInputElement).value)"
          />
          <small>例如：ap-guangzhou（广州）、ap-beijing（北京）</small>
        </div>
        <div class="config-footer">
          <small>
            <a href="https://console.cloud.tencent.com/cos/bucket" target="_blank">腾讯云 COS 控制台</a>
          </small>
          <div v-if="testResult" class="test-result">{{ testResult }}</div>
          <button @click="testConnection">测试连接</button>
        </div>
        <button v-if="activeType !== 'tencent'" class="btn-activate" :disabled="isValidating" @click="handleActivate('tencent')">
          {{ isValidating ? '验证中...' : '启用腾讯云 COS' }}
        </button>
      </div>

      <!-- S3 兼容 -->
      <div v-else-if="viewingType === 's3'" class="host-config">
        <div v-if="activeType === 's3'" class="active-status">
          <span class="pulsing-dot"></span>
          <span>当前使用中</span>
        </div>
        <div class="config-field">
          <label>Endpoint</label>
          <input
            type="text"
            placeholder="https://s3.amazonaws.com"
            :value="allConfigs.configs.s3?.endpoint || ''"
            @input="handleConfigChange('endpoint', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>Region</label>
          <input
            type="text"
            placeholder="us-east-1"
            :value="allConfigs.configs.s3?.region || ''"
            @input="handleConfigChange('region', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>Access Key ID</label>
          <input
            type="text"
            placeholder="Access Key ID"
            :value="allConfigs.configs.s3?.accessKeyId || ''"
            @input="handleConfigChange('accessKeyId', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>Secret Access Key</label>
          <input
            type="password"
            placeholder="Secret Access Key"
            :value="allConfigs.configs.s3?.secretAccessKey || ''"
            @input="handleConfigChange('secretAccessKey', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>Bucket</label>
          <input
            type="text"
            placeholder="your-bucket"
            :value="allConfigs.configs.s3?.bucket || ''"
            @input="handleConfigChange('bucket', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-field">
          <label>自定义域名 (可选)</label>
          <input
            type="text"
            placeholder="https://cdn.example.com"
            :value="allConfigs.configs.s3?.customDomain || ''"
            @input="handleConfigChange('customDomain', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="config-footer">
          <div v-if="testResult" class="test-result">{{ testResult }}</div>
          <button @click="testConnection">测试连接</button>
        </div>
        <button v-if="activeType !== 's3'" class="btn-activate" :disabled="isValidating" @click="handleActivate('s3')">
          {{ isValidating ? '验证中...' : '启用 S3 图床' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  @import './ImageHostSettings.css';
.config-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
  font-size: 14px;
  color: var(--text-primary);
  background-color: var(--bg-primary);
}
</style>
