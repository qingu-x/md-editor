import { onMounted, onUnmounted } from "vue";

interface WindowControlsOverlay {
  visible: boolean;
  getTitlebarAreaRect: () => DOMRect;
  addEventListener: (type: "geometrychange", listener: () => void) => void;
  removeEventListener: (type: "geometrychange", listener: () => void) => void;
}

export function useWindowControls() {
  // SSR/Node 环境的基本安全检查
  const hasWindow = typeof window !== "undefined";
  const isElectron = hasWindow && (window.electron?.isElectron ?? false);
  const platform = hasWindow ? window.electron?.platform : undefined;
  const isWindows = platform === "win32";
  const isMac = platform === "darwin";

  const updateInset = () => {
    const nav = navigator as Navigator & {
      windowControlsOverlay?: WindowControlsOverlay;
    };

    const controlsOverlay = nav.windowControlsOverlay;

    if (!controlsOverlay?.getTitlebarAreaRect) {
      document.documentElement.style.removeProperty("--titlebar-right-inset");
      document.documentElement.style.removeProperty("--titlebar-left-inset");
      return;
    }

    if (controlsOverlay.visible === false) {
      document.documentElement.style.setProperty(
        "--titlebar-right-inset",
        "0px"
      );
      document.documentElement.style.setProperty(
        "--titlebar-left-inset",
        "0px"
      );
      return;
    }
    const rect = controlsOverlay.getTitlebarAreaRect();
    const leftInset = Math.max(0, Math.round(rect.x));
    const rightInset = Math.max(
      0,
      Math.round(window.innerWidth - (rect.x + rect.width))
    );
    document.documentElement.style.setProperty(
      "--titlebar-left-inset",
      `${leftInset}px`
    );
    document.documentElement.style.setProperty(
      "--titlebar-right-inset",
      `${rightInset}px`
    );
  };

  onMounted(() => {
    if (!isElectron || isWindows) {
      document.documentElement.style.removeProperty("--titlebar-right-inset");
      document.documentElement.style.removeProperty("--titlebar-left-inset");
      return;
    }

    const nav = navigator as Navigator & {
      windowControlsOverlay?: WindowControlsOverlay;
    };

    const controlsOverlay = nav.windowControlsOverlay;

    updateInset();
    window.addEventListener("resize", updateInset);
    controlsOverlay?.addEventListener?.("geometrychange", updateInset);
  });

  onUnmounted(() => {
    const nav = navigator as Navigator & {
      windowControlsOverlay?: WindowControlsOverlay;
    };

    const controlsOverlay = nav.windowControlsOverlay;

    window.removeEventListener("resize", updateInset);
    controlsOverlay?.removeEventListener?.("geometrychange", updateInset);
    document.documentElement.style.removeProperty("--titlebar-right-inset");
    document.documentElement.style.removeProperty("--titlebar-left-inset");
  });

  return {
    isElectron,
    isWindows,
    isMac,
    platform,
    // 安全访问：如果不是 Electron 或 window 未定义，则为 undefined
    minimize: hasWindow ? window.electron?.window?.minimize : undefined,
    maximize: hasWindow ? window.electron?.window?.maximize : undefined,
    close: hasWindow ? window.electron?.window?.close : undefined,
  };
}
