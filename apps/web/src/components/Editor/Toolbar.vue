<script setup lang="ts">
import { ref } from 'vue'
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code,
  Link, Image, Minus, Loader2
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { ImageHostManager } from '../../services/image/ImageUploader'
import type { ImageHostConfig } from '../../services/image/ImageUploader'
import './Toolbar.css'

const emit = defineEmits<{
  insert: [prefix: string, suffix: string, placeholder: string]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const tools = [
  { icon: Bold, label: '粗体', prefix: '**', suffix: '**', placeholder: '粗体文字' },
  { icon: Italic, label: '斜体', prefix: '*', suffix: '*', placeholder: '斜体文字' },
  { icon: Strikethrough, label: '删除线', prefix: '~~', suffix: '~~', placeholder: '删除文字' },
  { icon: Heading1, label: '一级标题', prefix: '# ', suffix: '', placeholder: '标题' },
  { icon: Heading2, label: '二级标题', prefix: '## ', suffix: '', placeholder: '标题' },
  { icon: Heading3, label: '三级标题', prefix: '### ', suffix: '', placeholder: '标题' },
  { icon: List, label: '无序列表', prefix: '- ', suffix: '', placeholder: '列表项' },
  { icon: ListOrdered, label: '有序列表', prefix: '1. ', suffix: '', placeholder: '列表项' },
  { icon: Quote, label: '引用', prefix: '> ', suffix: '', placeholder: '引用文字' },
  { icon: Code, label: '代码块', prefix: '```\n', suffix: '\n```', placeholder: '代码' },
  { icon: Link, label: '链接', prefix: '[', suffix: '](url)', placeholder: '链接文字' },
  { icon: Minus, label: '分割线', prefix: '\n---\n', suffix: '', placeholder: '' },
]

function handleImageClick() {
  fileInputRef.value?.click()
}

async function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }

  // 验证文件大小（最大 2MB，微信公众号限制）
  if (file.size > 2 * 1024 * 1024) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    toast.error(`请压缩图片后再试，公众号不支持超过 2MB 的图片外链(当前 ${sizeMB}MB)`, { duration: 4000 })
    return
  }

  uploading.value = true
  try {
    // 获取图床配置
    const configStr = localStorage.getItem('imageHostConfig')
    const config: ImageHostConfig = configStr
      ? JSON.parse(configStr)
      : { type: 'official' }

    // 上传图片
    const manager = new ImageHostManager(config)
    const url = await manager.upload(file)

    // 插入 Markdown
    emit('insert', '![', `](${url})`, file.name.replace(/\.[^/.]+$/, ''))
    toast.success('图片上传成功')
  } catch (error) {
    console.error('图片上传失败:', error)
    toast.error(error instanceof Error ? error.message : '图片上传失败')
  } finally {
    uploading.value = false
    // 清空 input，允许重复上传同一文件
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}
</script>

<template>
  <div class="md-toolbar">
    <button
      v-for="(tool, index) in tools"
      :key="index"
      class="md-toolbar-btn"
      :data-tooltip="tool.label"
      @click="emit('insert', tool.prefix, tool.suffix, tool.placeholder)"
    >
      <component
        :is="tool.icon"
        :size="16"
      />
    </button>

    <!-- 图片上传按钮 -->
    <button
      class="md-toolbar-btn"
      :disabled="uploading"
      data-tooltip="上传图片"
      @click="handleImageClick"
    >
      <Loader2
        v-if="uploading"
        :size="16"
        class="spinning"
      />
      <Image
        v-else
        :size="16"
      />
    </button>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileChange"
    />
  </div>
</template>

