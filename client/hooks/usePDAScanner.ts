/**
 * PDA 扫码器广播监听 Hook
 * 支持斯维尔等扫码器广播模式
 * 
 * 斯维尔扫码器配置：
 * - 广播名称: com.tlsj.scan.result
 * - 广播键值: scan_result
 * 
 * 使用方式：
 * import { usePDAScanner } from '@/hooks/usePDAScanner';
 * 
 * const { clearLastScan } = usePDAScanner({
 *   onScan: (code) => {
 *     console.log('收到扫码:', code);
 *   }
 * });
 */

import { useEffect, useRef, useCallback } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

interface UsePDAScannerOptions {
  /** 扫码器广播 action */
  action?: string;
  /** 扫码结果字段名 */
  key?: string;
  /** 收到扫码数据时的回调 */
  onScan?: (data: string) => void;
  /** 是否启用广播监听 */
  enabled?: boolean;
}

// 斯维尔扫码器配置（默认）
const SWA_ACTIONS = {
  // 斯维尔扫码器
  siweier: {
    action: 'com.tlsj.scan.result',
    key: 'scan_result',
  },
  // 销邦扫码器
  xiaobang: {
    action: 'com.supoin.PDASERVICE',
    key: 'data',
  },
  // 新大陆扫码器
  xindalu: {
    action: 'nlscan.action.SCANNER_RESULT',
    key: 'SCAN_BARCODE1',
  },
  // 通用 Android 扫码
  android: {
    action: 'android.intent.action.SCANRESULT',
    key: 'value',
  },
};

// 斯维尔扫码器默认配置
const DEFAULT_SIWEI_ACTION = 'com.tlsj.scan.result';
const DEFAULT_SIWEI_KEY = 'scan_result';

export function usePDAScanner({
  action = DEFAULT_SIWEI_ACTION,
  key = DEFAULT_SIWEI_KEY,
  onScan,
  enabled = true,
}: UsePDAScannerOptions = {}) {
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  const subscriptionRef = useRef<{ remove?: () => void } | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      console.log('[PDA Scanner] 广播模式不可用（非 Android 设备）');
      return;
    }

    // 尝试获取扫码服务模块
    const PDAService = NativeModules.PDAService;

    if (!PDAService) {
      console.log('[PDA Scanner] PDAService 模块未找到，请确认是否已配置原生模块');
      console.log('[PDA Scanner] 提示：需要创建本地原生模块来接收广播');
      return;
    }

    try {
      // 创建事件发射器
      eventEmitterRef.current = new NativeEventEmitter(PDAService);

      // 监听扫码事件
      const subscription = eventEmitterRef.current.addListener(
        'onBarcodeScan',
        (event: Record<string, unknown>) => {
          // 兼容不同的字段名
          // 斯维尔: scan_result
          // 其他: data, barcode, content, barCode
          const code = (event[key] as string) ||
                       (event.data as string) ||
                       (event.barcode as string) ||
                       (event.content as string) ||
                       (event.barCode as string) ||
                       (event.value as string) ||
                       (event.barcode_string as string) ||
                       (event.scannerdata as string) || '';

          if (!code || typeof code !== 'string') {
            return;
          }

          // 防抖处理：200ms 内的重复扫码忽略
          const now = Date.now();
          if (code === lastScanRef.current && now - lastScanTimeRef.current < 200) {
            console.log('[PDA Scanner] 忽略重复扫码:', code);
            return;
          }

          lastScanRef.current = code;
          lastScanTimeRef.current = now;

          console.log('[PDA Scanner] 收到广播扫码:', code, 'action:', action, 'key:', key);

          if (onScan) {
            onScan(code);
          }
        }
      );

      subscriptionRef.current = subscription;

      // 尝试启动扫码服务
      if (typeof PDAService.startScan === 'function') {
        PDAService.startScan(action).catch((err: Error) => {
          console.log('[PDA Scanner] 启动扫码服务失败:', err.message);
        });
      }
    } catch (error) {
      console.error('[PDA Scanner] 初始化失败:', error);
    }

    return () => {
      try {
        subscriptionRef.current?.remove?.();
        if (typeof PDAService?.stopScan === 'function') {
          PDAService.stopScan();
        }
      } catch (error) {
        console.error('[PDA Scanner] 清理失败:', error);
      }
    };
  }, [enabled, action, key, onScan]);

  // 清除最后扫码数据
  const clearLastScan = useCallback(() => {
    lastScanRef.current = '';
    lastScanTimeRef.current = 0;
  }, []);

  return {
    clearLastScan,
    config: {
      action,
      key,
    },
  };
}

// 导出预置配置
export { SWA_ACTIONS };
