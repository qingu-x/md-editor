<script setup lang="ts">
import { ref, watch } from "vue";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Minus,
  Loader2,
  ListEnd,
} from "lucide-vue-next";
import { ImageHostManager } from "../../services/image/ImageUploader";
import type { ImageHostConfig } from "../../services/image/ImageUploader";
import { setLinkToFootnoteEnabled } from "./ToolbarState";
import { toast } from "../../hooks/useToast";

const emit = defineEmits<{
  (e: "insert", prefix: string, suffix: string, placeholder: string): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const linkToFootnote = ref(localStorage.getItem("wemd-link-to-footnote") === "true");

// 同步状态到全局变量和 localStorage
watch(linkToFootnote, (newVal: boolean) => {
  setLinkToFootnoteEnabled(newVal);
  localStorage.setItem("wemd-link-to-footnote", String(newVal));
}, { immediate: true });

const tools = [
  {
    icon: Bold,
    label: "粗体",
    prefix: "**",
    suffix: "**",
    placeholder: "粗体文字",
  },
  {
    icon: Italic,
    label: "斜体",
    prefix: "*",
    suffix: "*",
    placeholder: "斜体文字",
  },
  {
    icon: Strikethrough,
    label: "删除线",
    prefix: "~~",
    suffix: "~~",
    placeholder: "删除文字",
  },
  {
    icon: Heading1,
    label: "一级标题",
    prefix: "# ",
    suffix: "",
    placeholder: "标题",
  },
  {
    icon: Heading2,
    label: "二级标题",
    prefix: "## ",
    suffix: "",
    placeholder: "标题",
  },
  {
    icon: Heading3,
    label: "三级标题",
    prefix: "### ",
    suffix: "",
    placeholder: "标题",
  },
  {
    icon: List,
    label: "无序列表",
    prefix: "- ",
    suffix: "",
    placeholder: "列表项",
  },
  {
    icon: ListOrdered,
    label: "有序列表",
    prefix: "1. ",
    suffix: "",
    placeholder: "列表项",
  },
  {
    icon: Quote,
    label: "引用",
    prefix: "> ",
    suffix: "",
    placeholder: "引用文字",
  },
  {
    icon: Code,
    label: "代码块",
    prefix: "```\n",
    suffix: "\n```",
    placeholder: "代码",
  },
  {
    icon: Link,
    label: "链接",
    prefix: "[",
    suffix: "](url)",
    placeholder: "链接文字",
  },
  {
    icon: Minus,
    label: "分割线",
    prefix: "\n---\n",
    suffix: "",
    placeholder: "",
  },
];

const handleImageClick = () => {
  fileInputRef.value?.click();
};

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // 验证文件类型
  if (!file.type.startsWith("image/")) {
    toast.error("请选择图片文件");
    return;
  }

  // 验证文件大小（最大 2MB，微信公众号限制）
  if (file.size > 2 * 1024 * 1024) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    toast.error(`请压缩图片后再试，公众号不支持超过 2MB 的图片外链(当前 ${sizeMB}MB)`);
    return;
  }

  uploading.value = true;
  try {
    // 获取图床配置
    const configStr = localStorage.getItem("imageHostConfig");
    const config: ImageHostConfig = configStr
      ? JSON.parse(configStr)
      : { type: "official" };

    // 上传图片
    const manager = new ImageHostManager(config);
    const url = await manager.upload(file);

    // 插入 Markdown
    emit("insert", "![", `](${url})`, file.name.replace(/\.[^/.]+$/, ""));
    toast.success("图片上传成功");
  } catch (error: any) {
    console.error("图片上传失败:", error);
    toast.error(error instanceof Error ? error.message : "图片上传失败");
  } finally {
    uploading.value = false;
    // 清空 input，允许重复上传同一文件
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
  }
};

const toggleLinkToFootnote = () => {
  const next = !linkToFootnote.value;
  linkToFootnote.value = next;
  toast.success(next ? "已开启：外链转脚注" : "已关闭：外链转脚注", 2000);
};
</script>

<template>
  <div class="md-toolbar">
    <button
      v-for="(tool, index) in tools"
      :key="index"
      class="md-toolbar-btn"
      @click="emit('insert', tool.prefix, tool.suffix, tool.placeholder)"
      :data-tooltip="tool.label"
    >
      <component :is="tool.icon" :size="16" />
    </button>

    <!-- 图片上传按钮 -->
    <button
      class="md-toolbar-btn"
      @click="handleImageClick"
      :disabled="uploading"
      data-tooltip="上传图片"
    >
      <Loader2 v-if="uploading" :size="16" class="spinning" />
      <Image v-else :size="16" />
    </button>

    <!-- 分隔符 -->
    <div class="md-toolbar-divider" />

    <!-- 外链转脚注开关 -->
    <button
      class="md-toolbar-btn md-toolbar-toggle"
      :class="{ active: linkToFootnote }"
      @click="toggleLinkToFootnote"
      :data-tooltip="linkToFootnote ? '外链转脚注：开启' : '外链转脚注：关闭'"
    >
      <ListEnd :size="16" />
    </button>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      @change="handleFileChange"
      style="display: none"
    />
  </div>
</template>

<style scoped>
@import "./Toolbar.css";
</style>
