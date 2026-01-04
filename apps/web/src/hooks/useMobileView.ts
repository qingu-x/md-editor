import { ref, computed, onMounted, onUnmounted } from 'vue';

const MOBILE_BREAKPOINT = 768;

export type MobileViewType = "editor" | "preview";

/**
 * 移动端视图管理 Hook
 * 在 768px 以下屏幕宽度时启用移动端模式
 */
export function useMobileView() {
  const isMobile = ref(typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false);
  const activeView = ref<MobileViewType>("editor");

  const handleResize = () => {
    const mobile = window.innerWidth < MOBILE_BREAKPOINT;
    isMobile.value = mobile;
    // 切换到桌面模式时重置视图
    if (!mobile) {
      activeView.value = "editor";
    }
  };

  onMounted(() => {
    window.addEventListener("resize", handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
  });

  return {
    isMobile,
    activeView,
    setActiveView: (view: MobileViewType) => activeView.value = view,
    isEditor: computed(() => activeView.value === "editor"),
    isPreview: computed(() => activeView.value === "preview"),
  };
}
