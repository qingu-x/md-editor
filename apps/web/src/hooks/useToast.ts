import { ref, reactive } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

const toasts = ref<ToastItem[]>([]);
const position = ref('top-center');
let idCounter = 0;

export function useToast() {
  const addToast = (message: string, type: ToastType = 'info', duration = 3000) => {
    const id = idCounter++;
    const toast: ToastItem = { id, message, type, duration };
    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  };

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };

  const updateToast = (id: number, updates: Partial<Omit<ToastItem, 'id'>>) => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.value[index] = { ...toasts.value[index], ...updates };
      
      // 如果更新了 duration，重新设置定时器
      if (updates.duration && updates.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, updates.duration);
      }
    }
  };

  const success = (message: string, duration?: number) => addToast(message, 'success', duration);
  const error = (message: string, duration?: number) => addToast(message, 'error', duration);
  const info = (message: string, duration?: number) => addToast(message, 'info', duration);

  const promise = async <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: (err: any) => string }
  ) => {
    const toastId = addToast(msgs.loading, 'info', 0);
    try {
      const result = await promise;
      updateToast(toastId, {
        message: msgs.success,
        type: 'success',
        duration: 3000
      });
      return result;
    } catch (err) {
      updateToast(toastId, {
        message: msgs.error(err),
        type: 'error',
        duration: 5000
      });
      throw err;
    }
  };

  return {
    toasts,
    position,
    success,
    error,
    info,
    promise,
    updateToast,
    removeToast
  };
}

// 导出一个单例供非组件使用
export const toast = {
  success: (message: string, duration?: number) => useToast().success(message, duration),
  error: (message: string, duration?: number) => useToast().error(message, duration),
  info: (message: string, duration?: number) => useToast().info(message, duration),
  promise: <T>(p: Promise<T>, msgs: any) => useToast().promise(p, msgs),
  update: (id: number, updates: any) => useToast().updateToast(id, updates),
  remove: (id: number) => useToast().removeToast(id),
};
