import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useEditorStore } from "./editorStore";
import {
  addHistoryToDb,
  clearHistoryDb,
  deleteHistoryFromDb,
  loadHistoryFromDb,
  updateHistoryInDb,
} from "./historyDb";
import type { HistorySnapshot, HistorySnapshotInput } from "./historyTypes";

export type { HistorySnapshot } from "./historyTypes";

const MAX_HISTORY_ENTRIES = 30;

type ElectronFileAPI = {
  deleteFiles?: (paths: string[]) => Promise<{ success: boolean }>;
  renameFile?: (
    from: string,
    to: string,
  ) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  fileExists?: (path: string) => Promise<{ success: boolean; exists: boolean }>;
};

const getElectronFile = (): ElectronFileAPI | null => {
  if (typeof window === "undefined") return null;
  const electron = (
    window as typeof window & { electron?: { file?: ElectronFileAPI } }
  ).electron;
  return electron?.file ?? null;
};

const normalizeFileName = (title: string) => {
  const base = (title || "未命名文章").trim() || "未命名文章";
  return `${base
    .replace(/[\\\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 60)}.md`;
};

const splitPath = (filePath: string) => {
  const last = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  const dir = last >= 0 ? filePath.slice(0, last) : "";
  const base = last >= 0 ? filePath.slice(last + 1) : filePath;
  const sep = filePath.includes("\\") ? "\\" : "/";
  return { dir, base, sep };
};

const joinPath = (dir: string, name: string, sep: string) => {
  if (!dir) return name;
  if (dir.endsWith(sep)) return `${dir}${name}`;
  return `${dir}${sep}${name}`;
};

function createSnapshot(data: HistorySnapshotInput): HistorySnapshot {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = new Date().toISOString();
  return {
    ...data,
    id: randomId,
    createdAt: now,
    savedAt: now,
  };
}

function isSameSnapshot(a?: HistorySnapshot, b?: HistorySnapshotInput) {
  if (!a || !b) return false;
  return (
    a.markdown === b.markdown &&
    a.theme === b.theme &&
    a.themeName === b.themeName &&
    a.customCSS === b.customCSS &&
    a.title === (b.title?.trim() || "未命名文章") &&
    a.filePath === b.filePath
  );
}

function hasChanges(
  entry: HistorySnapshot,
  data: Partial<HistorySnapshotInput>,
) {
  if (data.markdown !== undefined && data.markdown !== entry.markdown)
    return true;
  if (data.theme !== undefined && data.theme !== entry.theme) return true;
  if (data.themeName !== undefined && data.themeName !== entry.themeName)
    return true;
  if (data.customCSS !== undefined && data.customCSS !== entry.customCSS)
    return true;
  if (
    data.title !== undefined &&
    (data.title.trim() || "未命名文章") !== entry.title
  )
    return true;
  if (data.filePath !== undefined && data.filePath !== entry.filePath)
    return true;
  return false;
}

export const useHistoryStore = defineStore("history", () => {
  const history = ref<HistorySnapshot[]>([]);
  const loading = ref(true);
  const filter = ref("");
  const activeId = ref<string | null>(null);

  const refreshOrder = (entries: HistorySnapshot[]) =>
    [...entries].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    );

  const deleteFiles = async (paths: string[]) => {
    if (typeof window === "undefined") return;
    const electronFile = getElectronFile();
    if (!electronFile?.deleteFiles) return;
    const valid = paths.filter(Boolean);
    if (valid.length === 0) return;
    try {
      await electronFile.deleteFiles(valid);
    } catch (error) {
      console.error("[History] delete files failed", error);
    }
  };

  const pruneMissingFiles = async (entries: HistorySnapshot[]) => {
    const electronFile = getElectronFile();
    const checkFile = electronFile?.fileExists;
    if (!checkFile) return entries;
    const checks = await Promise.all(
      entries.map((entry) =>
        entry.filePath
          ? checkFile(entry.filePath).catch(() => ({ exists: true }))
          : Promise.resolve({ exists: true }),
      ),
    );
    const remaining: HistorySnapshot[] = [];
    const removed: HistorySnapshot[] = [];
    entries.forEach((entry, idx) => {
      const exists = entry.filePath ? checks[idx]?.exists !== false : true;
      if (exists) {
        remaining.push(entry);
      } else {
        removed.push(entry);
      }
    });
    if (removed.length) {
      await Promise.all(removed.map((entry) => deleteHistoryFromDb(entry.id)));
    }
    return remaining;
  };

  const updateEntryState = async (
    id: string,
    updates: Partial<HistorySnapshot>,
  ) => {
    const entries = history.value;
    const index = entries.findIndex((entry) => entry.id === id);
    if (index === -1) return null;
    if (!hasChanges(entries[index], updates)) {
      return entries[index];
    }
    const updated: HistorySnapshot = {
      ...entries[index],
      ...updates,
      savedAt: updates.savedAt ?? new Date().toISOString(),
    };
    await updateHistoryInDb(updated);
    history.value = refreshOrder(
      entries.map((entry, idx) => (idx === index ? updated : entry)),
    );
    return updated;
  };

  async function loadHistory() {
    loading.value = true;
    let entries = refreshOrder(await loadHistoryFromDb());
    entries = await pruneMissingFiles(entries);
    history.value = entries;
    loading.value = false;
    activeId.value = entries[0]?.id ?? null;
  }

  function setFilter(value: string) {
    filter.value = value;
  }

  function setActiveId(id: string | null) {
    activeId.value = id;
  }

  async function saveSnapshot(
    data: HistorySnapshotInput,
    options?: { force?: boolean },
  ) {
    if (!data.markdown.trim()) return null;
    const latestHistory = history.value[0];
    const shouldCreateHistory =
      options?.force || !isSameSnapshot(latestHistory, data);

    if (shouldCreateHistory) {
      const historyEntry = createSnapshot({
        ...data,
        title: data.title?.trim() || "未命名文章",
        themeName: data.themeName || "默认主题",
      });
      await addHistoryToDb(historyEntry);
      history.value = refreshOrder([historyEntry, ...history.value]).slice(
        0,
        MAX_HISTORY_ENTRIES,
      );
      activeId.value = historyEntry.id;
      return historyEntry;
    }
    return null;
  }

  async function persistActiveSnapshot(
    data: Omit<HistorySnapshotInput, "title"> & { title?: string },
  ) {
    const id = activeId.value;
    if (!id) return null;
    const entry = history.value.find((item) => item.id === id);
    if (!entry) return null;
    const title = data.title?.trim() || entry.title || "未命名文章";
    const payload = {
      ...data,
      title,
      themeName: data.themeName ?? entry.themeName,
    };
    if (!hasChanges(entry, payload)) return entry;
    return updateEntryState(id, payload);
  }

  async function deleteEntry(id: string) {
    const entry = history.value.find((item) => item.id === id);
    if (entry?.filePath) {
      await deleteFiles([entry.filePath]);
    }
    await deleteHistoryFromDb(id);
    const nextHistory = history.value
      .filter((entry) => entry.id !== id)
      .slice(0, MAX_HISTORY_ENTRIES);
    const nextActive =
      activeId.value === id ? (nextHistory[0]?.id ?? null) : activeId.value;
    history.value = nextHistory;
    activeId.value = nextActive;
  }

  async function clearHistory() {
    const filePaths = history.value
      .map((entry) => entry.filePath)
      .filter((p): p is string => !!p);
    await deleteFiles(filePaths);
    await clearHistoryDb();
    history.value = [];
    activeId.value = null;
  }

  async function updateTitle(id: string, title: string) {
    const trimmed = title.trim() || "未命名文章";
    const entry = history.value.find((item) => item.id === id);
    let nextFilePath = entry?.filePath;
    if (entry?.filePath) {
      const { dir, sep } = splitPath(entry.filePath);
      const target = joinPath(dir, normalizeFileName(trimmed), sep);
      if (target !== entry.filePath) {
        const electronFile = getElectronFile();
        if (electronFile?.renameFile) {
          try {
            const result = await electronFile.renameFile(
              entry.filePath,
              target,
            );
            if (result?.success && result.filePath) {
              nextFilePath = result.filePath;
              if (activeId.value === id) {
                const editorStore = useEditorStore();
                editorStore.setFilePath(result.filePath);
              }
            } else if (result?.error) {
              console.error("[History] rename failed", result.error);
            }
          } catch (error) {
            console.error("[History] rename error", error);
          }
        }
      }
    }
    await updateEntryState(id, {
      title: trimmed,
      savedAt: new Date().toISOString(),
      filePath: nextFilePath,
    });
  }

  return {
    history,
    loading,
    filter,
    activeId,
    loadHistory,
    setFilter,
    setActiveId,
    saveSnapshot,
    persistActiveSnapshot,
    deleteEntry,
    clearHistory,
    updateTitle,
  };
});
