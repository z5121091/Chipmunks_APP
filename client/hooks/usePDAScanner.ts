/**
 * PDA 扫码器广播监听 Hook
 * 支持广播模式扫码器
 * 
 * 使用方式：
 * const { broadcastData, clearBroadcastData } = usePDAScanner('com.supoin.PDASERVICE');
 * 
 * 扫码器广播模式通常使用的 action（部分厂商）：
 * - com.supoin.PDASERVICE (销邦)
 * - com.android.referrerbroadcast
 * - com.hsshardware.barcode (新手表)
 * - com.ishareclient.barcodescan (IShare)
 */

import { useEffect, useRef, useCallback } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

interface UsePDAScannerOptions {
  // 广播 action，可根据扫码器型号配置
  action?: string;
  // 收到广播数据时的回调
  onScan?: (data: string) => void;
  // 是否启用广播监听
  enabled?: boolean;
}

// 默认支持的扫码器广播 action
const DEFAULT_ACTIONS = [
  'com.supoin.PDASERVICE',
  'com.android.referrerbroadcast', 
  'com.hsshardware.barcode',
  'com.ishareclient.barcodescan',
  'broadcastthirdparty',
];

export function usePDAScanner({ 
  action = 'com.supoin.PDASERVICE',
  onScan,
  enabled = true 
}: UsePDAScannerOptions = {}) {
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;

    // 尝试获取扫码服务模块
    const PDAService = NativeModules.PDAService;
    
    if (!PDAService) {
      console.log('[PDA Scanner] PDAService module not found, broadcast mode unavailable');
      return;
    }

    // 创建事件发射器
    eventEmitterRef.current = new NativeEventEmitter(PDAService);

    // 监听扫码事件
    const subscription = eventEmitterRef.current.addListener(
      'onBarcodeScan',
      (event: { barcode?: string; data?: string; barCode?: string; content?: string }) => {
        // 兼容不同的字段名
        const code = event.barcode || event.data || event.barCode || event.content || '';
        
        if (!code) return;

        // 防抖处理：200ms 内的重复扫码忽略
        const now = Date.now();
        if (code === lastScanRef.current && now - lastScanTimeRef.current < 200) {
          console.log('[PDA Scanner] 忽略重复扫码:', code);
          return;
        }

        lastScanRef.current = code;
        lastScanTimeRef.current = now;

        console.log('[PDA Scanner] 收到广播扫码:', code);
        
        if (onScan) {
          onScan(code);
        }
      }
    );

    // 尝试启动扫码服务
    PDAService.startScan?.(action).catch?.((err: Error) => {
      console.log('[PDA Scanner] 启动扫码服务失败:', err.message);
    });

    return () => {
      subscription?.remove?.();
      PDAService?.stopScan?.();
    };
  }, [enabled, action, onScan]);

  // 清除最后扫码数据
  const clearLastScan = useCallback(() => {
    lastScanRef.current = '';
    lastScanTimeRef.current = 0;
  }, []);

  return {
    clearLastScan,
  };
}
