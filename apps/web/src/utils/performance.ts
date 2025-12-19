/**
 * 性能优化工具函数
 */

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间(ms)
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args)
      timeoutId = null
    }, delay)
  }
}

/**
 * 节流函数
 * @param fn 要执行的函数
 * @param delay 延迟时间(ms)
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now()

    if (now - lastTime >= delay) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      fn.apply(this, args)
      lastTime = now
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        fn.apply(this, args)
        lastTime = Date.now()
        timeoutId = null
      }, delay - (now - lastTime))
    }
  }
}

/**
 * RAF 节流 - 使用 requestAnimationFrame 优化滚动等高频事件
 * @param fn 要执行的函数
 * @returns RAF 节流后的函数
 */
export function rafThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null

  return function (this: unknown, ...args: Parameters<T>) {
    if (rafId !== null) {
      return
    }

    rafId = requestAnimationFrame(() => {
      fn.apply(this, args)
      rafId = null
    })
  }
}

/**
 * 简单的 LRU 缓存
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number

  constructor(maxSize = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined
    }
    // 移到最后(最近使用)
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    // 如果已存在,先删除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    // 如果超过容量,删除最旧的
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

/**
 * 记忆化函数 - 缓存函数结果
 * @param fn 要缓存的函数
 * @param keyGenerator 生成缓存键的函数
 * @param maxSize 最大缓存数量
 * @returns 记忆化后的函数
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  maxSize = 100
): T {
  const cache = new LRUCache<string, ReturnType<T>>(maxSize)

  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn.apply(this, args) as ReturnType<T>
    cache.set(key, result)
    return result
  } as T
}

