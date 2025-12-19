<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { ImageHostManager, type ImageHostConfig } from '../../services/image/ImageUploader'
import '../StorageModeSelector/StorageModeSelector.css'
import './ImageHostSettings.css'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

type HostType = 'official' | 'qiniu' | 'aliyun' | 'tencent'

interface StoredConfig {
  type: HostType
  accessKey?: string
  secretKey?: string
  bucket?: string
  region?: string
  domain?: string
}

interface HostOption {
  value: HostType
  label: string
  desc: string
}

const hostOptions: HostOption[] = [
  { value: 'official', label: '官方图床', desc: '稳定快速，推荐使用' },
  { value: 'qiniu', label: '七牛云', desc: '国内 CDN，稳定快速' },
  { value: 'aliyun', label: '阿里云 OSS', desc: '阿里云对象存储，企业级稳定' },
  { value: 'tencent', label: '腾讯云 COS', desc: '腾讯云对象存储，高性能' },
]

const hostType = ref<HostType>('official')
const accessKey = ref('')
const secretKey = ref('')
const bucket = ref('')
const region = ref('')
const domain = ref('')
const testing = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

function loadConfig() {
  const saved = localStorage.getItem('imageHostConfig')
  if (saved) {
    try {
      const config: StoredConfig = JSON.parse(saved)
      hostType.value = config.type
      accessKey.value = config.accessKey || ''
      secretKey.value = config.secretKey || ''
      bucket.value = config.bucket || ''
      region.value = config.region || ''
      domain.value = config.domain || ''
    } catch {
      // ignore
    }
  }
}

onMounted(() => {
  loadConfig()
})

watch(() => props.open, (open: boolean) => {
  if (open) {
    loadConfig()
    testResult.value = null
  }
})

function buildConfig(): ImageHostConfig {
  if (hostType.value === 'official') {
    return { type: 'official' }
  }
  return {
    type: hostType.value,
    config: {
      accessKey: accessKey.value,
      secretKey: secretKey.value,
      bucket: bucket.value,
      region: region.value,
      domain: domain.value,
    },
  }
}

function buildStoredConfig(): StoredConfig {
  return {
    type: hostType.value,
    accessKey: accessKey.value,
    secretKey: secretKey.value,
    bucket: bucket.value,
    region: region.value,
    domain: domain.value,
  }
}

async function handleTest() {
  testing.value = true
  testResult.value = null
  try {
    const config = buildConfig()
    const manager = new ImageHostManager(config)
    await manager.validate()
    testResult.value = { success: true, message: '连接测试成功！' }
  } catch (err) {
    testResult.value = { success: false, message: `测试失败: ${err instanceof Error ? err.message : String(err)}` }
  } finally {
    testing.value = false
  }
}

function handleSave() {
  try {
    const config = buildStoredConfig()
    localStorage.setItem('imageHostConfig', JSON.stringify(config))
    toast.success('配置已保存')
    emit('close')
  } catch (err) {
    toast.error(`保存失败: ${err instanceof Error ? err.message : String(err)}`)
  }
}

const needsCredentials = computed(() => hostType.value !== 'official')
</script>

<template>
  <div
    v-if="open"
    class="storage-modal-overlay"
    @click="emit('close')"
  >
    <div
      class="storage-modal-panel"
      @click.stop
    >
      <div class="storage-modal-header">
        <h3>图床设置</h3>
        <button
          class="storage-modal-close"
          aria-label="关闭"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <div class="image-host-settings">
        <div class="settings-layout">
          <div class="host-type-selector">
            <label
              v-for="opt in hostOptions"
              :key="opt.value"
            >
              <input
                type="radio"
                :value="opt.value"
                :checked="hostType === opt.value"
                @change="hostType = opt.value"
              />
              <div class="host-option">
                <strong>{{ opt.label }}</strong>
                <span>{{ opt.desc }}</span>
              </div>
            </label>
          </div>
          <div class="host-config-panel">
            <div
              v-if="!needsCredentials"
              class="config-empty"
            >
              <p>✅ 官方图床无需配置，直接可用</p>
            </div>
            <div
              v-else
              class="host-config"
            >
              <div class="config-field">
                <label>Access Key</label>
                <input
                  v-model="accessKey"
                  type="text"
                  placeholder="请输入 Access Key"
                />
              </div>
              <div class="config-field">
                <label>Secret Key</label>
                <input
                  v-model="secretKey"
                  type="password"
                  placeholder="请输入 Secret Key"
                />
              </div>
              <div class="config-field">
                <label>Bucket</label>
                <input
                  v-model="bucket"
                  type="text"
                  placeholder="请输入 Bucket 名称"
                />
              </div>
              <div class="config-field">
                <label>Region</label>
                <input
                  v-model="region"
                  type="text"
                  placeholder="请输入 Region（如 cn-hangzhou）"
                />
              </div>
              <div class="config-field">
                <label>自定义域名（可选）</label>
                <input
                  v-model="domain"
                  type="text"
                  placeholder="如 https://cdn.example.com"
                />
              </div>
              <button
                :disabled="testing"
                @click="handleTest"
              >
                {{ testing ? '测试中...' : '测试连接' }}
              </button>
              <div
                v-if="testResult"
                class="test-result"
                :class="{ success: testResult.success, error: !testResult.success }"
              >
                {{ testResult.message }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="storage-modal-footer">
        <button
          class="btn-secondary"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          class="btn-primary"
          @click="handleSave"
        >
          保存配置
        </button>
      </div>
    </div>
  </div>
</template>

