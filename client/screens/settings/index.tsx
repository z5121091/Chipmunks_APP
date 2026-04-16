import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllMaterials,
  getAllUnpackRecords,
  getAllCustomFields,
  getAllInboundRecords,
  getAllInventoryCheckRecords,
  exportBackupData,
  importBackupData,
  getConfigStats,
  clearAllBusinessData,
  incrementExportCount,
  CustomField,
  STORAGE_KEYS,
} from '@/utils/database';
import { formatDateTime, formatTime, formatDate } from '@/utils/time';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { MenuCard, SwitchCard } from '@/components/MenuCard';
import { SyncSettings } from '@/components/SyncSettings';
import { useCustomAlert } from '@/components/CustomAlert';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Spacing } from '@/constants/theme';
import { rs } from '@/utils/responsive';
import { APP_VERSION, APP_NAME, COMPANY_NAME, AUTHOR } from '@/constants/version';
import { setSoundEnabled as setSoundEnabledFn, initSoundSetting } from '@/utils/feedback';
import { syncExcelToComputer } from '@/utils/excel';
import { testConnection } from '@/utils/heartbeat';
import {
  UPDATE_CONFIG,
  NETWORK_CONFIG,
  SyncConfig,
  ConnectionStatus,
} from '@/constants/config';
import {
  extractDisplayUrl,
  parseAuthFromUrl,
  checkForUpdate,
  downloadAndInstall,
  UpdateInfo,
} from '@/utils/update';

// 使用 any 绕过类型检查
const FileSystem = FileSystemLegacy as any;

export default function SettingsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const alert = useCustomAlert();

  // 样式
  const styles = useMemo(() => createStyles(theme, 0, insets), [theme, insets]);

  // 状态
  const [configStats, setConfigStats] = useState({ rules: 0, customFields: 0 });
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({ ip: '', port: '8080' });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 同步状态
  const [syncingInbound, setSyncingInbound] = useState(false);
  const [syncingOutbound, setSyncingOutbound] = useState(false);
  const [syncingInventory, setSyncingInventory] = useState(false);
  const [syncingLabels, setSyncingLabels] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // 更新状态
  const [updateServerUrl, setUpdateServerUrl] = useState(UPDATE_CONFIG.DEFAULT_SERVER);
  const [updateServerDisplayUrl, setUpdateServerDisplayUrl] = useState(UPDATE_CONFIG.DEFAULT_SERVER);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Refs
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureCountRef = useRef(0);
  const downloadProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============ 数据加载 ============
  const loadData = useCallback(async () => {
    const [stats, savedSyncConfig, savedConnectionStatus, savedUpdateServer, savedSoundEnabled] = await Promise.all([
      getConfigStats(),
      AsyncStorage.getItem(STORAGE_KEYS.SYNC_CONFIG),
      AsyncStorage.getItem(STORAGE_KEYS.CONNECTION_STATUS),
      AsyncStorage.getItem(STORAGE_KEYS.UPDATE_SERVER_URL),
      AsyncStorage.getItem(STORAGE_KEYS.SOUND_ENABLED),
    ]);

    setConfigStats(stats);

    if (savedSoundEnabled !== null) {
      setSoundEnabled(savedSoundEnabled === 'true');
    }

    if (savedUpdateServer) {
      setUpdateServerUrl(savedUpdateServer);
      setUpdateServerDisplayUrl(extractDisplayUrl(savedUpdateServer));
    }

    if (savedSyncConfig) {
      const config = JSON.parse(savedSyncConfig);
      setSyncConfig(config);

      if (savedConnectionStatus === 'success' && config.ip) {
        setConnectionStatus('testing');
        const success = await testConnection(config);
        setConnectionStatus(success ? 'success' : 'disconnected');
      } else if (savedConnectionStatus === 'disconnected') {
        setConnectionStatus('disconnected');
      }
    }
  }, []);

  // ============ 声音开关 ============
  const toggleSound = useCallback(async (value: boolean) => {
    setSoundEnabled(value);
    setSoundEnabledFn(value);
    await AsyncStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(value));
  }, []);

  // ============ 心跳检测 ============
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }
    failureCountRef.current = 0;

    heartbeatTimerRef.current = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), NETWORK_CONFIG.HEARTBEAT_TIMEOUT);

        const response = await fetch(
          `http://${syncConfig.ip}:${syncConfig.port || NETWORK_CONFIG.DEFAULT_PORT}/health`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
          failureCountRef.current = 0;
        } else {
          failureCountRef.current++;
        }
      } catch {
        failureCountRef.current++;
      }

      if (failureCountRef.current >= NETWORK_CONFIG.MAX_FAILURE_COUNT) {
        setConnectionStatus('disconnected');
        await AsyncStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'disconnected');
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
      }
    }, NETWORK_CONFIG.HEARTBEAT_INTERVAL);
  }, [syncConfig.ip, syncConfig.port]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    initSoundSetting();
    return () => stopHeartbeat();
  }, [stopHeartbeat]);

  useEffect(() => {
    if (connectionStatus === 'success' && syncConfig.ip) {
      startHeartbeat();
    }
    return () => stopHeartbeat();
  }, [connectionStatus, syncConfig.ip, startHeartbeat, stopHeartbeat]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ============ 连接测试 ============
  const handleIpChange = useCallback((text: string) => {
    setSyncConfig((prev) => ({ ...prev, ip: text }));
    setConnectionStatus('idle');
  }, []);

  const handlePortChange = useCallback((text: string) => {
    setSyncConfig((prev) => ({ ...prev, port: text }));
    setConnectionStatus('idle');
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!syncConfig.ip) {
      alert.showWarning('请输入服务器地址');
      return;
    }

    setConnectionStatus('testing');
    const success = await testConnection(syncConfig);
    const status: ConnectionStatus = success ? 'success' : 'error';
    setConnectionStatus(status);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(syncConfig)),
      AsyncStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, status),
    ]);
  }, [syncConfig, alert]);

  // ============ 同步功能 ============
  const syncToComputerMultiSheet = useCallback(async (
    sheets: Array<{ name: string; headers: string[]; rows: unknown[][] }>,
    endpoint: string,
    setLoading: (loading: boolean) => void,
    nameSuffix?: string
  ) => {
    setLoading(true);
    try {
      const result = await syncExcelToComputer(
        sheets,
        endpoint,
        syncConfig,
        nameSuffix,
        (path: string) => alert.showSuccess(`同步成功！\n路径: ${path}`),
        (error: string) => alert.showError(error)
      );

      if (!result.success && result.message) {
        alert.showError(result.message);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      alert.showError(`同步失败: ${err.message || '请检查服务是否运行'}`);
    } finally {
      setLoading(false);
    }
  }, [syncConfig, alert]);

  const handleSyncInbound = useCallback(async () => {
    const records = await getAllInboundRecords();
    if (records.length === 0) {
      alert.showWarning('暂无数据可同步');
      return;
    }

    setSyncingInbound(true);
    try {
      const todayCount = await incrementExportCount('inbound');
      const seqNo = String(todayCount).padStart(2, '0');

      const headers = [
        '入库单号', '仓库名称', '存货编码', '扫描型号', '批次', '数量', '版本号', '封装',
        '生产日期', '追溯码', '箱号', '入库日期', '序号', '备注', '创建时间'
      ];

      const rows = records.map((r) => [
        r.inbound_no || '', r.warehouse_name || '', r.inventory_code || '', r.scan_model || '',
        r.batch || '', r.quantity || 0, r.version || '', r.package || '',
        r.productionDate || '', r.traceNo || '', r.sourceNo || '', r.in_date || '',
        `-${seqNo}`, r.notes || '', r.created_at ? formatDateTime(r.created_at) : '',
      ]);

      const warehouses = [...new Set(records.map((r) => r.warehouse_name).filter(Boolean))];
      const nameSuffix = warehouses.length === 1 ? warehouses[0] : (warehouses.length > 1 ? '多仓库' : '');

      await syncToComputerMultiSheet([{ name: '入库明细', headers, rows }], '/inbound', setSyncingInbound, nameSuffix);
    } catch (error: unknown) {
      const err = error as { message?: string };
      alert.showError(`同步失败: ${err.message || '请检查服务是否运行'}`);
    }
  }, [syncToComputerMultiSheet, alert]);

  const handleSyncOutbound = useCallback(async () => {
    const records = await getAllMaterials();
    if (records.length === 0) {
      alert.showWarning('暂无数据可同步');
      return;
    }

    setSyncingOutbound(true);
    try {
      const todayCount = await incrementExportCount('outbound');
      const seqNo = String(todayCount).padStart(2, '0');

      const headers = [
        '订单号', '客户', '仓库名称', '存货编码', '型号', '批次', '封装', '生产日期', '版本',
        '数量', '追踪码', '箱号', '扫描日期', '序号', '扫描时间'
      ];

      const rows = records.map((r) => [
        r.order_no || '',
        r.customer_name || '',
        r.warehouse_name || '',
        r.inventory_code || '',
        r.model || '',
        r.batch || '',
        r.package || '',
        r.productionDate || '',
        r.version || '',
        parseInt(r.quantity, 10) || 0,
        r.traceNo || '',
        r.sourceNo || '',
        formatDate(r.scanned_at) || '',
        `-${seqNo}`,
        formatTime(r.scanned_at) || '',
      ]);

      const warehouses = [...new Set(records.map((r) => r.warehouse_name).filter(Boolean))];
      const nameSuffix = warehouses.length === 1 ? warehouses[0] : (warehouses.length > 1 ? '多仓库' : '');

      await syncToComputerMultiSheet([{ name: '出库明细', headers, rows }], '/outbound', setSyncingOutbound, nameSuffix);
    } catch (error: unknown) {
      const err = error as { message?: string };
      alert.showError(`同步失败: ${err.message || '请检查服务是否运行'}`);
    }
  }, [syncToComputerMultiSheet, alert]);

  const handleSyncInventory = useCallback(async () => {
    const records = await getAllInventoryCheckRecords();

    const headers = [
      '盘点单号', '仓库名称', '存货编码', '扫描型号', '数量', '盘点类型', '实际数量', '盘点日期', '备注', '创建时间'
    ];

    const rows = records.map((r) => [
      r.check_no || '', r.warehouse_name || '', r.inventory_code || '', r.scan_model || '',
      r.quantity || 0, r.check_type === 'whole' ? '整包' : '拆包', r.actual_quantity || '',
      r.check_date || '', r.notes || '', r.created_at || '',
    ]);

    const warehouses = [...new Set(records.map((r) => r.warehouse_name).filter(Boolean))];
    const nameSuffix = warehouses.length === 1 ? warehouses[0] : (warehouses.length > 1 ? '多仓库' : '');

    await syncToComputerMultiSheet([{ name: '盘点明细', headers, rows }], '/inventory', setSyncingInventory, nameSuffix);
  }, [syncToComputerMultiSheet, alert]);

  const handleSyncLabels = useCallback(async () => {
    const records = await getAllUnpackRecords();

    const headers = [
      '仓库名称', '标签类型', '订单号', '客户', '型号', '存货编码', '批次', '封装', '版本',
      '原数量', '标签数量', '生产日期', '追踪码', '箱号', '拆包时间', '备注'
    ];

    const rows = records.map((r) => [
      r.warehouse_name || '',
      r.label_type === 'shipped' ? '发货标签' : '剩余标签',
      r.order_no || '', r.customer_name || '', r.model || '', r.inventory_code || '',
      r.batch || '', r.package || '', r.version || '',
      parseInt(r.original_quantity, 10) || 0,
      parseInt(r.new_quantity, 10) || 0,
      r.productionDate || '',
      r.label_type === 'shipped' ? (r.new_traceNo || r.traceNo || '') : (r.traceNo || ''),
      r.sourceNo || '', formatTime(r.unpacked_at) || '', r.notes || '',
    ]);

    await syncToComputerMultiSheet([{ name: '标签明细', headers, rows }], '/labels', setSyncingLabels);
  }, [syncToComputerMultiSheet, alert]);

  // ============ 备份还原 ============
  const handleExportBackup = useCallback(async () => {
    setBackupLoading(true);
    try {
      const result = await exportBackupData();
      alert.showSuccess(`备份成功:\n• ${result.stats.rules} 条解析规则\n• ${result.stats.customFields} 个自定义字段\n• ${result.stats.inventoryBindings} 条物料绑定\n• ${result.stats.warehouses} 个仓库`);
    } catch (error) {
      console.error('备份失败:', error);
      alert.showError('备份失败，请重试');
    } finally {
      setBackupLoading(false);
    }
  }, [alert]);

  const handleImportBackup = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (result.canceled || !result.assets?.[0]) return;

      setRestoreLoading(true);

      const fileContent = await (await fetch(result.assets[0].uri)).text();
      const result2 = await importBackupData(JSON.parse(fileContent));

      if (result2.success) {
        alert.showSuccess(`恢复成功:\n• 解析规则: ${result2.stats.rules} 条\n• 自定义字段: ${result2.stats.customFields} 个\n• 物料绑定: ${result2.stats.inventoryBindings} 条\n• 仓库: ${result2.stats.warehouses} 个`);
        loadData();
      } else {
        alert.showError(result2.message);
      }
    } catch (error) {
      console.error('恢复失败:', error);
      alert.showError('请重试');
    } finally {
      setRestoreLoading(false);
    }
  }, [alert, loadData]);

  // ============ 更新功能 ============

  // 获取更新服务器地址
  const getUpdateServerUrl = (): string => {
    if (updateServerUrl.includes('@')) {
      return UPDATE_CONFIG.DEFAULT_SERVER;
    }
    return updateServerUrl;
  };

  // base64 编码
  const base64Encode = (str: string): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let i = 0; i < str.length; i += 3) {
      const char1 = str.charCodeAt(i);
      const char2 = i + 1 < str.length ? str.charCodeAt(i + 1) : NaN;
      const char3 = i + 2 < str.length ? str.charCodeAt(i + 2) : NaN;
      const enc1 = char1 >> 2;
      const enc2 = ((char1 & 3) << 4) | (char2 >> 4);
      let enc3 = ((char2 & 15) << 2) | (char3 >> 6);
      let enc4 = char3 & 63;
      if (isNaN(char2)) { enc3 = enc4 = 64; }
      else if (isNaN(char3)) { enc4 = 64; }
      output += characters.charAt(enc1) + characters.charAt(enc2) + characters.charAt(enc3) + characters.charAt(enc4);
    }
    return output;
  };

  // 版本号比较函数
  const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  };

  // 检查更新
  const handleCheckForUpdate = useCallback(async () => {
    if (checkingUpdate) return;

    setCheckingUpdate(true);
    try {
      const baseUrl = getUpdateServerUrl();
      const versionUrl = `${baseUrl}/version.json`;

      const authInfo = parseAuthFromUrl(baseUrl);
      const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };

      if (authInfo) {
        const authString = `${authInfo.username}:${authInfo.password}`;
        const authBase64 = base64Encode(authString);
        headers['Authorization'] = `Basic ${authBase64}`;
      }

      const response = await fetch(versionUrl, { method: 'GET', headers });

      if (!response.ok) {
        let errorMessage = `无法连接到更新服务器 (${response.status})`;
        if (response.status === 401) {
          errorMessage = '认证失败，请检查服务器地址中的用户名和密码是否正确';
        } else if (response.status === 404) {
          errorMessage = '更新文件不存在，请检查服务器地址是否正确';
        }
        alert.showError(errorMessage);
        return;
      }

      const data = await response.json();
      const currentVersion = APP_VERSION.replace(/^V/, '');
      const latestVersion = (data.version || '0.0.0').replace(/^V/, '');

      const isNewVersion = compareVersions(latestVersion, currentVersion) > 0;

      if (isNewVersion) {
        let changelogText = '优化用户体验';
        if (Array.isArray(data.changelog)) {
          changelogText = data.changelog[0]?.changes
            ?.map((c: { type: string; text: string }) => `${c.text}`)
            .join('\n') || '优化用户体验';
        } else if (typeof data.changelog === 'string') {
          changelogText = data.changelog;
        }
        setUpdateInfo({
          version: data.version || latestVersion,
          downloadUrl: data.downloadUrl || `${baseUrl}/app-release.apk`,
          changelog: changelogText,
          forceUpdate: data.forceUpdate || false,
        });
        setUpdateModalVisible(true);
      } else {
        alert.showSuccess(`当前已是最新版本 (${APP_VERSION})`);
      }
    } catch (error) {
      alert.showError('检查更新失败，请检查网络连接');
    } finally {
      setCheckingUpdate(false);
    }
  }, [updateServerUrl, alert, checkingUpdate]);

  const handleDownloadAndInstall = useCallback(async () => {
    if (!updateInfo) return;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      await downloadAndInstall(
        updateInfo,
        setDownloadProgress,
        parseAuthFromUrl,
        alert,
        FileSystem
      );
    } finally {
      setDownloading(false);
    }
  }, [updateInfo, alert, FileSystem]);

  // ============ 渲染 ============
  const canSync = syncConfig.ip && connectionStatus === 'success';

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>设置</Text>
        </View>

        {/* 基础配置 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>基础配置</Text>
        </View>
        <View style={{ gap: rs(2) }}>
          <MenuCard
            title="仓库管理"
            desc="添加、编辑仓库信息"
            iconName="home"
            color={theme.primary}
            onPress={() => router.push('/warehouse-management')}
            theme={theme}
          />
          <SwitchCard
            title="扫码提示音"
            desc="扫码成功/重复时播放提示音"
            iconName="volume-2"
            color={theme.primary}
            value={soundEnabled}
            onValueChange={toggleSound}
            theme={theme}
          />
          <MenuCard
            title="检查更新"
            desc={`当前版本 ${APP_VERSION}`}
            iconName="refresh-cw"
            color={theme.success}
            onPress={handleCheckForUpdate}
            loading={checkingUpdate}
            theme={theme}
          />
        </View>

        {/* 解析配置 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>解析配置</Text>
        </View>
        <View style={{ gap: rs(2) }}>
          <MenuCard
            title="解析规则"
            desc="二维码解析规则配置"
            iconName="sliders"
            color={theme.accent}
            onPress={() => router.push('/rules')}
            rightText={`${configStats.rules} 条`}
            theme={theme}
          />
          <MenuCard
            title="自定义字段"
            desc="扩展物料信息字段"
            iconName="plus-square"
            color={theme.warning}
            onPress={() => router.push('/custom-fields')}
            rightText={`${configStats.customFields} 个`}
            theme={theme}
          />
        </View>

        {/* 数据同步 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>数据同步</Text>
        </View>
        <SyncSettings
          syncConfig={syncConfig}
          connectionStatus={connectionStatus}
          onIpChange={handleIpChange}
          onPortChange={handlePortChange}
          onTestConnection={handleTestConnection}
          theme={theme}
        />
        <View style={{ gap: rs(2) }}>
          <MenuCard
            title="同步入库单"
            desc="入库记录导出到电脑"
            iconName="download-cloud"
            color={theme.success}
            onPress={handleSyncInbound}
            disabled={!canSync}
            loading={syncingInbound}
            theme={theme}
          />
          <MenuCard
            title="同步出库单"
            desc="出库物料导出到电脑"
            iconName="upload-cloud"
            color={theme.primary}
            onPress={handleSyncOutbound}
            disabled={!canSync}
            loading={syncingOutbound}
            theme={theme}
          />
          <MenuCard
            title="同步盘点单"
            desc="盘点记录导出到电脑"
            iconName="file-text"
            color={theme.accent}
            onPress={handleSyncInventory}
            disabled={!canSync}
            loading={syncingInventory}
            theme={theme}
          />
          <MenuCard
            title="同步标签数据"
            desc="拆包标签导出到电脑打印"
            iconName="tag"
            color={theme.purple}
            onPress={handleSyncLabels}
            disabled={!canSync}
            loading={syncingLabels}
            theme={theme}
          />
        </View>

        {/* 备份还原 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>备份还原</Text>
        </View>
        <View style={{ gap: rs(2) }}>
          <MenuCard
            title="备份配置"
            desc="导出规则、字段、物料绑定、仓库、同步服务器"
            iconName="save"
            color={theme.primary}
            onPress={handleExportBackup}
            loading={backupLoading}
            theme={theme}
          />
          <MenuCard
            title="恢复配置"
            desc="从备份文件恢复全部配置"
            iconName="rotate-ccw"
            color={theme.accent}
            onPress={handleImportBackup}
            loading={restoreLoading}
            theme={theme}
          />
          <MenuCard
            title="清除业务数据"
            desc="清空订单、物料、标签数据"
            iconName="trash-2"
            color={theme.error}
            onPress={() => {
              alert.showConfirm(
                '确认清空',
                '确定要清空所有业务数据吗？\n\n将清空：订单、物料、标签、入库记录、盘点记录\n保留：仓库、物料绑定、解析规则、自定义字段',
                async () => {
                  try {
                    await clearAllBusinessData();
                    alert.showSuccess('业务数据已清空');
                    loadData();
                  } catch (error) {
                    alert.showError('操作失败，请重试');
                  }
                },
                true
              );
            }}
            theme={theme}
          />
        </View>

        {/* 关于 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>关于</Text>
        </View>
        <View style={[styles.aboutCard, { backgroundColor: theme.backgroundSecondary }]}>
          {/* App图标和名称 */}
          <View style={styles.aboutAppSection}>
            <View style={[styles.aboutLogo, { backgroundColor: theme.primary + '15' }]}>
              <Feather name="package" size={rs(16)} color={theme.primary} />
            </View>
            <Text style={[styles.aboutAppName, { color: theme.textPrimary }]}>{APP_NAME}</Text>
            <View style={[styles.aboutVersionBadge, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.aboutVersionText, { color: theme.primary }]}>{APP_VERSION}</Text>
            </View>
          </View>
          
          <View style={[styles.aboutDivider, { backgroundColor: theme.border }]} />
          
          {/* 公司信息 */}
          <View style={styles.aboutDetailsSection}>
            <View style={styles.aboutDetailRow}>
              <View style={styles.aboutDetailIconWrapper}>
                <Feather name="briefcase" size={rs(14)} color={theme.textSecondary} />
              </View>
              <Text style={[styles.aboutDetailLabel, { color: theme.textSecondary }]}>公司</Text>
              <View style={styles.aboutDetailRight}>
                <Text style={[styles.aboutDetailValue, { color: theme.textPrimary }]}>{COMPANY_NAME}</Text>
                <Feather name="external-link" size={rs(12)} color={theme.textMuted} />
              </View>
            </View>
            
            <View style={styles.aboutDetailRow}>
              <View style={styles.aboutDetailIconWrapper}>
                <Feather name="user" size={rs(14)} color={theme.textSecondary} />
              </View>
              <Text style={[styles.aboutDetailLabel, { color: theme.textSecondary }]}>作者</Text>
              <Text style={[styles.aboutDetailValue, { color: theme.textPrimary }]}>{AUTHOR}</Text>
            </View>
          </View>
          
          <View style={[styles.aboutDivider, { backgroundColor: theme.border }]} />
          
          {/* 使用说明和更新日志 */}
          <View style={styles.helpRow}>
            <TouchableOpacity
              style={styles.helpEntry}
              onPress={() => router.push('/help')}
              activeOpacity={0.7}
            >
              <Feather name="book-open" size={rs(14)} color={theme.textMuted} style={styles.helpIconWrapper} />
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>使用说明</Text>
              <Feather name="chevron-right" size={rs(14)} color={theme.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.helpEntry}
              onPress={() => router.push('/changelog')}
              activeOpacity={0.7}
            >
              <Feather name="file-text" size={rs(14)} color={theme.textMuted} style={styles.changelogIconWrapper} />
              <Text style={[styles.changelogText, { color: theme.textSecondary }]}>更新日志</Text>
              <Feather name="chevron-right" size={rs(14)} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
