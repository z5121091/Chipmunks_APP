/**
 * 全局应用状态管理
 * 
 * 提供全局共享的应用状态，如仓库列表、用户设置等
 */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';
import { getAllWarehouses, Warehouse } from '@/utils/database';

/** 仓库列表上下文类型 */
interface WarehouseContextType {
  warehouses: Warehouse[];
  selectedWarehouseId: number | null;
  selectedWarehouse: Warehouse | null;
  isLoading: boolean;
  refreshWarehouses: () => Promise<void>;
  selectWarehouse: (id: number | null) => Promise<void>;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

/** 仓库 Provider */
export function WarehouseProvider({ children }: { children: ReactNode }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getAllWarehouses();
      setWarehouses(list);

      // 加载上次选择的仓库
      const savedId = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_WAREHOUSE);
      if (savedId) {
        setSelectedWarehouseId(parseInt(savedId, 10));
      }
    } catch (error) {
      console.error('加载仓库列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 刷新仓库列表
  const refreshWarehouses = useCallback(async () => {
    await loadWarehouses();
  }, [loadWarehouses]);

  // 选择仓库
  const selectWarehouse = useCallback(async (id: number | null) => {
    setSelectedWarehouseId(id);
    if (id !== null) {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_WAREHOUSE, String(id));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_WAREHOUSE);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  // 计算当前选中的仓库
  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) || null;

  return (
    <WarehouseContext.Provider
      value={{
        warehouses,
        selectedWarehouseId,
        selectedWarehouse,
        isLoading,
        refreshWarehouses,
        selectWarehouse,
      }}
    >
      {children}
    </WarehouseContext.Provider>
  );
}

/** 使用仓库上下文 */
export function useWarehouses(): WarehouseContextType {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error('useWarehouses must be used within a WarehouseProvider');
  }
  return context;
}

/** 应用设置上下文类型 */
interface AppSettingsContextType {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  syncConfig: { ip: string; port: string } | null;
  setSyncConfig: (config: { ip: string; port: string }) => Promise<void>;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

/** 应用设置 Provider */
export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [syncConfig, setSyncConfigState] = useState<{ ip: string; port: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 加载设置
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [savedSound, savedSync] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SOUND_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.SYNC_CONFIG),
      ]);

      if (savedSound !== null) {
        setSoundEnabledState(savedSound === 'true');
      }

      if (savedSync) {
        setSyncConfigState(JSON.parse(savedSync));
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 设置声音开关
  const setSoundEnabled = useCallback(async (enabled: boolean) => {
    setSoundEnabledState(enabled);
    await AsyncStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
  }, []);

  // 设置同步配置
  const setSyncConfig = useCallback(async (config: { ip: string; port: string }) => {
    setSyncConfigState(config);
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(config));
  }, []);

  // 刷新设置
  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  // 初始化加载
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <AppSettingsContext.Provider
      value={{
        soundEnabled,
        setSoundEnabled,
        syncConfig,
        setSyncConfig,
        isLoading,
        refreshSettings,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

/** 使用应用设置上下文 */
export function useAppSettings(): AppSettingsContextType {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
