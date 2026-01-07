<template>
  <div class="theme-overlay" @click="$emit('close')">
    <div class="theme-modal" @click.stop>
      <div class="theme-header">
        <div class="theme-header-left">
          <h3>主题管理</h3>
          <div class="ui-theme-selector">
            <span class="ui-theme-label">编辑器主题</span>
            <div class="ui-theme-options">
              <button 
                class="ui-theme-option" 
                :class="{ active: uiTheme === 'default' }"
                @click="setUITheme('default')"
              >
                <Sun :size="14" /> 浅色
              </button>
              <button 
                class="ui-theme-option" 
                :class="{ active: uiTheme === 'dark' }"
                @click="setUITheme('dark')"
              >
                <Moon :size="14" /> 深色
              </button>
            </div>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')" aria-label="关闭">
          <X :size="20" />
        </button>
      </div>

      <div class="theme-body">
        <!-- 左侧主题列表 -->
        <div class="theme-sidebar">
          <button class="btn-new-theme" @click="handleCreateNew">
            <Plus :size="16" /> 新建自定义主题
          </button>
          <button
            class="btn-import-theme"
            @click="fileInputRef?.click()"
          >
            <Upload :size="16" /> 导入主题
          </button>
          <input
            type="file"
            ref="fileInputRef"
            accept=".json"
            style="display: none"
            @change="handleImportFile"
          />

          <div class="theme-list-scroll">
            <div v-if="customThemes.length > 0" class="theme-group">
              <div class="theme-group-title">自定义主题</div>
              <button
                v-for="item in customThemes"
                :key="item.id"
                class="theme-item"
                :class="{ active: item.id === selectedThemeId }"
                @click="handleSelectTheme(item.id)"
              >
                {{ item.name }}
              </button>
            </div>

            <div class="theme-group">
              <div class="theme-group-title">内置主题</div>
              <button
                v-for="item in builtInThemes"
                :key="item.id"
                class="theme-item"
                :class="{ active: item.id === selectedThemeId }"
                @click="handleSelectTheme(item.id)"
              >
                {{ item.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- 右侧编辑区 -->
        <div class="theme-editor" style="position: relative">
          <div v-if="showDeleteConfirm" class="delete-confirm-overlay">
            <div class="delete-confirm-box">
              <div class="confirm-icon-wrapper">
                <AlertTriangle :size="24" color="#ef4444" />
              </div>
              <h4>确认删除</h4>
              <p>
                确定要删除主题 "{{ selectedTheme?.name }}" 吗？此操作无法撤销。
              </p>
              <div class="delete-confirm-actions">
                <button
                  class="btn-secondary"
                  @click="showDeleteConfirm = false"
                >
                  取消
                </button>
                <button
                  class="btn-primary"
                  style="background: #ef4444; box-shadow: none"
                  @click="handleConfirmDelete"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>

          <div class="theme-form">
            <!-- 模式选择步骤 - 新建时首先选择编辑方式 -->
            <div v-if="isCreating && creationStep === 'select-mode'" class="mode-selection">
              <h3>选择创建方式</h3>
              <div class="mode-cards">
                <button
                  class="mode-card"
                  @click="handleSelectCreationMode('visual')"
                >
                  <span class="mode-icon">
                    <Palette :size="32" />
                  </span>
                  <span class="mode-title">可视化设计</span>
                  <span class="mode-desc">
                    通过可视化控件快速定制主题样式
                  </span>
                  <span class="mode-tag">适合快速上手</span>
                </button>
                <button
                  class="mode-card"
                  @click="handleSelectCreationMode('css')"
                >
                  <span class="mode-icon">
                    <Code :size="32" />
                  </span>
                  <span class="mode-title">手写 CSS</span>
                  <span class="mode-desc">
                    直接编写 CSS 代码，完全自由控制
                  </span>
                  <span class="mode-tag">适合高级用户</span>
                </button>
              </div>
            </div>

            <!-- 正式编辑区 - 选择模式后或编辑已有主题时显示 -->
            <template v-if="!isCreating || (isCreating && creationStep === 'editing')">
              <!-- 实时预览区 -->
              <div class="theme-form-preview">
                <ThemeLivePreview :css="previewCss" />
              </div>

              <div class="theme-form-fields">
                <label>主题名称</label>
                <input
                  v-model="nameInput"
                  placeholder="输入主题名称..."
                  :disabled="!isCreating && !isCustomTheme"
                />

                <!-- 可视化设计器 - 可视化模式 -->
                <div 
                  v-if="((isCreating && editorMode === 'visual') || (!isCreating && isCustomTheme && selectedTheme?.editorMode === 'visual'))"
                  class="visual-designer-container"
                >
                  <ThemeDesigner
                    @css-change="handleVisualCssChange"
                    @variables-change="handleVariablesChange"
                    :initial-variables="isCreating ? undefined : selectedTheme?.designerVariables"
                  />
                </div>

                <!-- CSS 编辑器 - CSS 模式或编辑旧版/CSS 主题 -->
                <template v-if="((isCreating && editorMode === 'css') || (!isCreating && selectedTheme?.editorMode !== 'visual'))">
                  <label>CSS 样式</label>
                  <textarea
                    v-model="cssInput"
                    placeholder="输入 CSS 样式代码..."
                    :spellcheck="false"
                    :disabled="!isCreating && !isCustomTheme"
                  />
                </template>

                <p v-if="!isCreating && !isCustomTheme" class="info-hint">
                  💡
                  内置主题不可编辑，点击"复制"按钮可以基于此主题创建自定义主题
                </p>
              </div>
            </template>
          </div>

          <div class="theme-actions">
            <template v-if="isCreating">
              <button
                class="btn-secondary"
                @click="handleCancelCreation"
              >
                取消
              </button>
              <button
                class="btn-primary"
                @click="handleSave"
                :disabled="!canSave"
              >
                保存为新主题
              </button>
            </template>
            <template v-else-if="isCustomTheme">
              <button class="btn-icon-text" @click="handleDuplicate">
                <Copy :size="16" /> 复制
              </button>
              <button
                class="btn-icon-text"
                @click="handleExport"
              >
                <Download :size="16" /> 导出
              </button>
              <button
                class="btn-icon-text"
                @click="handleExportCSS"
              >
                <Download :size="16" /> 导出 CSS
              </button>
              <button
                class="btn-icon-text btn-danger"
                @click="showDeleteConfirm = true"
              >
                <Trash2 :size="16" /> 删除
              </button>
              <div class="flex-spacer"></div>
              <button class="btn-secondary" @click="$emit('close')">
                取消
              </button>
              <button
                class="btn-primary"
                @click="handleSave"
                :disabled="!hasChanges"
              >
                保存修改
              </button>
              <button class="btn-primary" @click="handleApply">
                应用主题
              </button>
            </template>
            <template v-else>
              <button class="btn-icon-text" @click="handleDuplicate">
                <Copy :size="16" /> 复制
              </button>
              <button
                class="btn-icon-text"
                @click="handleExportCSS"
              >
                <Download :size="16" /> 导出 CSS
              </button>
              <div class="flex-spacer"></div>
              <button class="btn-secondary" @click="$emit('close')">
                取消
              </button>
              <button class="btn-primary" @click="handleApply">
                应用主题
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue';
import {
  Plus,
  Copy,
  Trash2,
  X,
  AlertTriangle,
  Palette,
  Code,
  Sun,
  Moon,
  Upload,
  Download,
} from "lucide-vue-next";
import { useEditorStore } from "../../store/editorStore";
import { useThemeStore } from "../../store/themeStore";
import { useHistoryStore } from "../../store/historyStore";
import { useUIThemeStore } from "../../store/uiThemeStore";
import { useToast } from "../../hooks/useToast";
import { platformActions } from "../../utils/platformAdapter";
import type { DesignerVariables } from "./ThemeDesigner/types";
import ThemeLivePreview from "./ThemeLivePreview.vue";

// Props & Emits
const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// Components
const ThemeDesigner = defineAsyncComponent(() => import("./ThemeDesigner/index.vue"));

// Stores
const themeStore = useThemeStore();
const editorStore = useEditorStore();
const historyStore = useHistoryStore();
const uiThemeStore = useUIThemeStore();
const toast = useToast();

// State
const selectedThemeId = ref("");
const nameInput = ref("");
const cssInput = ref("");
const visualCss = ref("");
const designerVariables = ref<DesignerVariables | undefined>(undefined);
const isCreating = ref(false);
const creationStep = ref<'select-mode' | 'editing'>('select-mode');
const showDeleteConfirm = ref(false);
const editorMode = ref<'visual' | 'css'>('visual');
const fileInputRef = ref<HTMLInputElement | null>(null);

// Methods
const handleImportFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const success = await themeStore.importTheme(file);
    if (success) {
      toast.success("主题导入成功");
    } else {
      toast.error("导入失败，请检查文件格式");
    }
    (e.target as HTMLInputElement).value = "";
  }
};

const handleExport = () => {
  themeStore.exportTheme(selectedThemeId.value);
};

const handleExportCSS = () => {
  themeStore.exportThemeCSS(selectedThemeId.value);
};

// Used for change detection
const originalName = ref("");
const originalCss = ref("");

// Computed
const uiTheme = computed(() => uiThemeStore.theme);
const allThemes = computed(() => themeStore.allThemes);
const customThemes = computed(() => allThemes.value.filter((t: any) => !t.isBuiltIn));
const builtInThemes = computed(() => allThemes.value.filter((t: any) => t.isBuiltIn));
const selectedTheme = computed(() => allThemes.value.find((t: any) => t.id === selectedThemeId.value));
const isCustomTheme = computed(() => selectedTheme.value && !selectedTheme.value.isBuiltIn);

const hasChanges = computed(() => {
  return isCustomTheme.value && (nameInput.value !== originalName.value || cssInput.value !== originalCss.value);
});

const previewCss = computed(() => {
  return isCreating.value && editorMode.value === "visual" ? visualCss.value || cssInput.value : cssInput.value;
});

const canSave = computed(() => {
  return nameInput.value.trim() && (
    editorMode.value === "visual"
      ? visualCss.value.trim() || cssInput.value.trim()
      : cssInput.value.trim()
  );
});

// Methods
const setUITheme = (theme: 'default' | 'dark') => {
  uiThemeStore.setTheme(theme);
};

const handleSelectTheme = (themeId: string) => {
  const theme = allThemes.value.find((t: any) => t.id === themeId);
  if (!theme) return;

  selectedThemeId.value = themeId;
  nameInput.value = theme.name;
  cssInput.value = theme.css;
  editorMode.value = (theme.editorMode as 'visual' | 'css') || "css";
  visualCss.value = "";
  designerVariables.value = theme.designerVariables;
  
  originalName.value = theme.name;
  originalCss.value = theme.css;
  
  isCreating.value = false;
  creationStep.value = "select-mode";
  showDeleteConfirm.value = false;
};

const handleCreateNew = () => {
  isCreating.value = true;
  creationStep.value = "select-mode";
  selectedThemeId.value = "";
  nameInput.value = "";
  cssInput.value = "";
  visualCss.value = "";
  designerVariables.value = undefined;
  showDeleteConfirm.value = false;
};

const handleSelectCreationMode = (mode: "visual" | "css") => {
  editorMode.value = mode;
  creationStep.value = "editing";
};

const handleVisualCssChange = (nextCss: string) => {
  visualCss.value = nextCss;
  cssInput.value = nextCss;
};

const handleVariablesChange = (vars: any) => {
  designerVariables.value = vars;
};

const handleCancelCreation = () => {
  isCreating.value = false;
  if (themeStore.themeId) {
    handleSelectTheme(themeStore.themeId);
  }
};

const handleApply = async () => {
  if (hasChanges.value && canSave.value) {
    await handleSave();
  }

  themeStore.selectTheme(selectedThemeId.value);
  if (platformActions.shouldPersistHistory()) {
    await historyStore.persistActiveSnapshot({
      markdown: editorStore.markdown,
      theme: selectedThemeId.value,
      customCSS: "",
      themeName: selectedTheme.value?.name || "默认主题",
    });
  }
  emit('close');
};

const handleSave = async () => {
  if (isCreating.value) {
    const cssToSave = editorMode.value === "visual" ? visualCss.value || cssInput.value : cssInput.value;
    const newTheme = themeStore.createTheme(
      nameInput.value,
      editorMode.value,
      cssToSave,
      editorMode.value === "visual" ? designerVariables.value : undefined,
    );
    themeStore.selectTheme(newTheme.id);

    if (platformActions.shouldPersistHistory()) {
      await historyStore.persistActiveSnapshot({
        markdown: editorStore.markdown,
        theme: newTheme.id,
        customCSS: "",
        themeName: newTheme.name,
      });
    }

    selectedThemeId.value = newTheme.id;
    cssInput.value = cssToSave;
    originalName.value = nameInput.value;
    originalCss.value = cssToSave;
    isCreating.value = false;
    toast.success("主题创建成功");
    
    // 创建成功后自动应用并关闭面板
    emit('close');
  } else if (isCustomTheme.value) {
    const updates: any = {
      name: nameInput.value.trim() || "未命名主题",
      css: cssInput.value,
    };
    if (selectedTheme.value?.editorMode === "visual" && designerVariables.value) {
      updates.designerVariables = designerVariables.value;
    }
    themeStore.updateTheme(selectedThemeId.value, updates);

    if (platformActions.shouldPersistHistory()) {
      if (themeStore.themeId === selectedThemeId.value) {
        await historyStore.persistActiveSnapshot({
          markdown: editorStore.markdown,
          theme: selectedThemeId.value,
          customCSS: "",
          themeName: nameInput.value.trim() || "未命名主题",
        });
      }
    }
    originalName.value = nameInput.value.trim() || "未命名主题";
    originalCss.value = cssInput.value;
    toast.success("主题已保存");
    
    // 保存成功后自动关闭面板
    emit('close');
  }
};

const handleConfirmDelete = () => {
  if (!isCustomTheme.value) return;

  themeStore.deleteTheme(selectedThemeId.value);
  themeStore.selectTheme("default");
  handleSelectTheme("default");
  showDeleteConfirm.value = false;
  toast.success("主题已删除");
};

const handleDuplicate = () => {
  if (!selectedTheme.value) return;
  const newName = `${selectedTheme.value.name} (副本)`;
  const duplicated = themeStore.duplicateTheme(selectedThemeId.value, newName);
  handleSelectTheme(duplicated.id);
  toast.success("主题已复制");
};

// Lifecycle
onMounted(() => {
  if (props.open) {
    const currentThemeId = themeStore.themeId;
    if (currentThemeId) {
      handleSelectTheme(currentThemeId);
    } else {
      editorMode.value = "css";
      designerVariables.value = undefined;
      originalName.value = "";
      originalCss.value = "";
    }
    isCreating.value = false;
    creationStep.value = "select-mode";
    showDeleteConfirm.value = false;
    visualCss.value = "";
  }
});

watch(() => props.open, (newVal: boolean) => {
  if (newVal) {
    const currentThemeId = themeStore.themeId;
    if (currentThemeId) {
      handleSelectTheme(currentThemeId);
    }
  }
});
</script>

<style scoped>
@import "./ThemePanel.css";
</style>
