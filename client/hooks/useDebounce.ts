/**
 * 防重复点击 Hook
 * 
 * 提供防止按钮重复点击的功能，支持防抖和节流
 */
import { useRef, useCallback } from 'react';

interface UseDebouncedCallbackOptions {
  /** 防抖延迟（毫秒），默认 1000ms */
  delay?: number;
  /** 是否在延迟期间禁用 */
  disableWhileRunning?: boolean;
}

/**
 * 防重复点击 Hook
 * 
 * @param callback - 要执行的回调函数
 * @param options - 配置选项
 * @returns - 包装后的回调函数和运行状态
 * 
 * @example
 * ```tsx
 * const [handleSubmit, isRunning] = useDebouncedCallback(async () => {
 *   await saveData();
 * });
 * 
 * <Button onPress={handleSubmit} disabled={isRunning}>
 *   {isRunning ? '保存中...' : '保存'}
 * </Button>
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  options: UseDebouncedCallbackOptions = {}
): [(...args: Parameters<T>) => void, boolean] {
  const { delay = 1000, disableWhileRunning = true } = options;
  const isRunningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // 如果正在运行，直接返回
      if (isRunningRef.current && disableWhileRunning) {
        return;
      }

      // 清除之前的定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // 标记为运行中
      if (disableWhileRunning) {
        isRunningRef.current = true;
      }

      // 执行回调
      const result = callback(...args);

      // 如果返回 Promise，等待完成后重置状态
      if (result instanceof Promise) {
        (result as Promise<unknown>)
          .finally(() => {
            timerRef.current = setTimeout(() => {
              isRunningRef.current = false;
            }, delay);
          });
      } else {
        // 非 Promise 的情况下，延迟后重置
        timerRef.current = setTimeout(() => {
          isRunningRef.current = false;
        }, delay);
      }
    },
    [callback, delay, disableWhileRunning]
  );

  return [debouncedCallback, isRunningRef.current];
}

/**
 * 防抖 Hook（简化版）
 * 
 * @param callback - 要执行的回调函数
 * @param delay - 防抖延迟（毫秒），默认 500ms
 * @returns - 包装后的回调函数
 * 
 * @example
 * ```tsx
 * const handleSearch = useDebounce((text: string) => {
 *   fetchResults(text);
 * }, 500);
 * 
 * <SearchInput onChangeText={handleSearch} />
 * ```
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 500
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
}

/**
 * 节流 Hook
 * 
 * @param callback - 要执行的回调函数
 * @param delay - 节流间隔（毫秒），默认 1000ms
 * @returns - 包装后的回调函数
 * 
 * @example
 * ```tsx
 * const handleScroll = useThrottle((event: ScrollEvent) => {
 *   console.log('Scroll position:', event.nativeEvent.contentOffset.y);
 * }, 100);
 * ```
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 1000
): T {
  const lastCallRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        // 清除之前的定时器
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        // 设置定时器，在延迟结束后执行
        timerRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  ) as T;
}
