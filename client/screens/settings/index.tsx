import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  Alert,
  Linking,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import * as MediaLibrary from 'expo-media-library';
import * as XLSX from 'xlsx';
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
  BackupData,
  STORAGE_KEYS,
} from '@/utils/database';
import { formatDateTime, formatTime, formatDate, formatDateTimeExport } from '@/utils/time';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { AnimatedCard } from '@/components/AnimatedCard';
import { getSpacing, Spacing } from '@/constants/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Feather } from '@expo/vector-icons';
import { useCustomAlert } from '@/components/CustomAlert';
import { rs } from '@/utils/responsive';
import { APP_VERSION, APP_NAME, COMPANY_NAME, AUTHOR } from '@/constants/version';
import { feedbackSuccess, feedbackWarning, setSoundEnabled as setSoundEnabledFn, initSoundSetting } from '@/utils/feedback';
import { syncExcelToComputer, ExcelSheet } from '@/utils/excel';
import { 
  testConnection, 
  useHeartbeat 
} from '@/utils/heartbeat';
import {
  UPDATE_CONFIG,
  NETWORK_CONFIG,
  SyncConfig,
  ConnectionStatus,
} from '@/constants/config';

// 使用 any 绕过类型检查
const FileSystem = FileSystemLegacy as any;

// 更新服务器配置（请修改为你的NAS地址）
// 完整URL（含认证信息），兼容Android 7.0
const DEFAULT_UPDATE_SERVER = UPDATE_CONFIG.DEFAULT_SERVER;

export default function SettingsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const alert = useCustomAlert();

  // 监听屏幕尺寸变化
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);

  useEffect(() => {
    // 初始化声音设置
    initSoundSetting();
    
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
      setScreenHeight(window.height);
    });
    return () => subscription?.remove();
  }, []);

  // 根据屏幕尺寸动态创建样式
  const styles = useMemo(() => createStyles(theme, screenHeight, insets), [theme, screenHeight, insets]);
  
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  
  // 配置统计
  const [configStats, setConfigStats] = useState({
    rules: 0,
    customFields: 0,
  });
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  
  // 电脑同步配置
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({ ip: '', port: '8080' });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  
  // 声音开关
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // 各数据类型的同步状态
  const [syncingInbound, setSyncingInbound] = useState(false);
  const [syncingOutbound, setSyncingOutbound] = useState(false);
  const [syncingInventory, setSyncingInventory] = useState(false);
  const [syncingLabels, setSyncingLabels] = useState(false);
  
  // 在线更新相关状态
  const [updateServerUrl, setUpdateServerUrl] = useState(DEFAULT_UPDATE_SERVER);
  const [updateServerDisplayUrl, setUpdateServerDisplayUrl] = useState(DEFAULT_UPDATE_SERVER); // 用于显示，隐藏认证信息
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateServerEditing, setUpdateServerEditing] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    downloadUrl: string;
    changelog: string;
    forceUpdate: boolean;
  } | null>(null);
  
  // 心跳检测相关
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureCountRef = useRef(0);
  const downloadProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 加载数据
  const loadData = useCallback(async () => {
    const [fieldsData, stats, savedSyncConfig, savedConnectionStatus, savedUpdateServer, savedSoundEnabled] = await Promise.all([
      getAllCustomFields(),
      getConfigStats(),
      AsyncStorage.getItem(STORAGE_KEYS.SYNC_CONFIG),
      AsyncStorage.getItem(STORAGE_KEYS.CONNECTION_STATUS),
      AsyncStorage.getItem(STORAGE_KEYS.UPDATE_SERVER_URL),
      AsyncStorage.getItem(STORAGE_KEYS.SOUND_ENABLED),
    ]);
    setCustomFields(fieldsData);
    setConfigStats(stats);
    
    // 加载声音开关状态，默认为 true
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
      
      // 如果之前是已连接状态，自动验证连接
      if (savedConnectionStatus === 'success' && config.ip) {
        setConnectionStatus('testing');
        const success = await testConnection(config);
        setConnectionStatus(success ? 'success' : 'disconnected');
      } else if (savedConnectionStatus === 'disconnected') {
        setConnectionStatus('disconnected');
      }
    }
  }, []);
  
  // 切换声音开关
  const toggleSound = useCallback(async (value: boolean) => {
    setSoundEnabled(value);
    setSoundEnabledFn(value);
    await AsyncStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(value));
  }, []);
  
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
  
  // 心跳检测
  useEffect(() => {
    if (connectionStatus === 'success' && syncConfig.ip) {
      startHeartbeat();
    }
    return () => stopHeartbeat();
  }, [connectionStatus, syncConfig.ip]);
  
  const startHeartbeat = () => {
    stopHeartbeat();
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
        stopHeartbeat();
      }
    }, NETWORK_CONFIG.HEARTBEAT_INTERVAL);
  };
  
  const stopHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };
  
  // IP变更
  const handleIpChange = (text: string) => {
    setSyncConfig(prev => ({ ...prev, ip: text }));
    setConnectionStatus('idle');
  };
  
  // 端口变更
  const handlePortChange = (text: string) => {
    setSyncConfig(prev => ({ ...prev, port: text }));
    setConnectionStatus('idle');
  };
  
  // 测试连接
  const handleTestConnection = async () => {
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
  };
  
  // 生成 Excel 并同步到电脑（支持多Sheet）
  const syncToComputerMultiSheet = async (
    sheets: Array<{
      name: string;
      headers: string[];
      rows: any[][];
    }>,
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
        (path) => alert.showSuccess(`同步成功！\n路径: ${path}`),
        (error) => alert.showError(error)
      );
      
      if (!result.success && result.message) {
        alert.showError(result.message);
      }
    } catch (error: any) {
      alert.showError(`同步失败: ${error.message || '请检查服务是否运行'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 同步入库单（包含所有扩展字段）
  const handleSyncInbound = async () => {
    const records = await getAllInboundRecords();

    if (records.length === 0) {
      alert.showWarning('暂无数据可同步');
      return;
    }

    setSyncingInbound(true);
    try {
      // 获取当天的导出序号（按天递增）
      const todayCount = await incrementExportCount('inbound');
      const seqNo = String(todayCount).padStart(2, '0');

      // 入库明细表
      const detailHeaders = [
        '入库单号', '仓库名称', '存货编码', '扫描型号', '批次', '数量', '版本号', '封装',
        '生产日期', '追溯码', '箱号', '入库日期', '序号', '备注', '创建时间'
      ];

      const detailRows = records.map(r => [
        r.inbound_no || '',
        r.warehouse_name || '',
        r.inventory_code || '',
        r.scan_model || '',
        r.batch || '',
        r.quantity || 0,
        r.version || '',
        r.package || '',
        r.productionDate || '',
        r.traceNo || '',
        r.sourceNo || '',
        r.in_date || '',
        `-${seqNo}`,
        r.notes || '',
        r.created_at ? formatDateTime(r.created_at) : '',
      ]);

      // 获取唯一仓库名称列表
      const warehouses = [...new Set(records.map(r => r.warehouse_name).filter(Boolean))];
      const nameSuffix = warehouses.length === 1 ? warehouses[0] : (warehouses.length > 1 ? '多仓库' : '');

      await syncToComputerMultiSheet(
        [{ name: '入库明细', headers: detailHeaders, rows: detailRows }],
        '/inbound',
        setSyncingInbound,
        nameSuffix
      );
    } catch (error: any) {
      alert.showError(`同步失败: ${error.message || '请检查服务是否运行'}`);
      setSyncingInbound(false);
    }
  };
  
  // 同步出库单（扫码出库的物料信息）
  const handleSyncOutbound = async () => {
    const records = await getAllMaterials();
    
    // 获取当天的导出序号（按天递增）
    const todayCount = await incrementExportCount('outbound');
    const seqNo = String(todayCount).padStart(2, '0');
    
    // 调整列顺序：生产日期放在封装后面（与入库单一致）
    const headers = [
      '订单号', '客户', '仓库名称', '存货编码', '型号', '批次', '封装', '生产日期', '版本',
      '数量', '追踪码', '箱号', '扫描日期', '序号', '扫描时间'
    ];
    
    const rows = records.map(r => [
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
    
    // 获取唯一仓库名称列表
    const warehouses = [...new Set(records.map(r => r.warehouse_name).filter(Boolean))];
    const nameSuffix = warehouses.length === 1 ? warehouses[0] : (warehouses.length > 1 ? '多仓库' : '');

    await syncToComputerMultiSheet(
      [{ name: '出库明细', headers, rows }],
      '/outbound',
      setSyncingOutbound,
      nameSuffix
    );
  };
  
  // 同步盘点单
  const handleSyncInventory = async () => {
    const records = await getAllInventoryCheckRecords();
    
    const headers = [
      '盘点单号', '仓库名称', '存货编码', '扫描型号', '数量', '盘点类型', '实际数量', '盘点日期', '创建时间'
    ];
    
    const rows = records.map(r => [
      r.check_no || '',
      r.warehouse_name || '',
      r.inventory_code || '',
      r.scan_model || '',
      r.quantity || 0,
      r.check_type === 'whole' ? '整包' : '拆包',
      r.actual_quantity || '',
      r.check_date || '',
      formatDateTimeExport(r.created_at),
    ]);
    
    // 获取唯一仓库名称列表
    const warehouses = [...new Set(records.map(r => r.warehouse_name).filter(Boolean))];
    const nameSuffix = warehouses.length === 1 ? warehouses[0] : (warehouses.length > 1 ? '多仓库' : '');
    
    await syncToComputerMultiSheet(
      [{ name: '盘点明细', headers, rows }],
      '/inventory',
      setSyncingInventory,
      nameSuffix
    );
  };
  
  // 同步标签数据
  const handleSyncLabels = async () => {
    const records = await getAllUnpackRecords();
    
    const headers = [
      '仓库名称', '标签类型', '订单号', '客户', '型号', '存货编码', '批次', '封装', '版本',
      '原数量', '标签数量', '生产日期', '追踪码', '箱号', '拆包时间', '备注'
    ];
    
    const rows = records.map(r => [
      r.warehouse_name || '',
      r.label_type === 'shipped' ? '发货标签' : '剩余标签',
      r.order_no || '',
      r.customer_name || '',
      r.model || '',
      r.inventory_code || '',
      r.batch || '',
      r.package || '',
      r.version || '',
      parseInt(r.original_quantity, 10) || 0,
      parseInt(r.new_quantity, 10) || 0,
      r.productionDate || '',
      r.label_type === 'shipped' ? (r.new_traceNo || r.traceNo || '') : (r.traceNo || ''),
      r.sourceNo || '',
      formatTime(r.unpacked_at) || '',
      r.notes || '',
    ]);
    
    await syncToComputerMultiSheet(
      [{ name: '标签明细', headers, rows }],
      '/labels',
      setSyncingLabels
    );
  };
  
  // ==================== 在线更新功能 ====================
  
  // 获取更新服务器URL（兼容旧格式）
  const getUpdateServerUrl = (): string => {
    // 如果保存的URL包含@符号（旧格式），使用默认URL
    if (updateServerUrl.includes('@')) {
      return DEFAULT_UPDATE_SERVER;
    }
    return updateServerUrl;
  };
  
  // 从URL中提取不含认证信息的显示用URL
  const extractDisplayUrl = (url: string): string => {
    try {
      // 匹配 http://user:pass@host/path 或 https://user:pass@host/path 格式
      const match = url.match(/^https?:\/\/[^:]+:[^@]+@(.*)$/);
      if (match) {
        return `${url.startsWith('https') ? 'https' : 'http'}://${match[1]}`;
      }
      return url;
    } catch {
      return url;
    }
  };
  
  // 从URL中解析用户名和密码
  const parseAuthFromUrl = (url: string): { baseUrl: string; username: string; password: string } | null => {
    try {
      // 匹配 http://user:pass@host/path 格式
      const match = url.match(/^(https?:\/\/)([^:@]+):([^:@\/]+)@(.+)$/);
      if (match) {
        const [, protocol, username, password, rest] = match;
        return {
          baseUrl: `${protocol}${rest}`,
          username,
          password,
        };
      }
      return null;
    } catch {
      return null;
    }
  };
  
  // Base64编码（兼容Android 7.0）
  const base64Encode = (str: string): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;
    
    const utf8Str = unescape(encodeURIComponent(str));
    
    while (i < utf8Str.length) {
      const chr1 = utf8Str.charCodeAt(i++);
      const chr2 = utf8Str.charCodeAt(i++);
      const chr3 = utf8Str.charCodeAt(i++);
      
      const enc1 = chr1 >> 2;
      const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      let enc4 = chr3 & 63;
      
      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }
      
      output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
    }
    
    return output;
  };
  
  // 检查更新
  const checkForUpdate = async () => {
    if (checkingUpdate) return;
    
    setCheckingUpdate(true);
    try {
      const baseUrl = getUpdateServerUrl();
      const versionUrl = `${baseUrl}/version.json`;
      
      console.log('检查更新 URL:', versionUrl);
      
      // 解析URL中的认证信息
      const authInfo = parseAuthFromUrl(baseUrl);
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache',
      };
      
      // 如果URL包含认证信息，添加Authorization头
      if (authInfo) {
        const authString = `${authInfo.username}:${authInfo.password}`;
        const authBase64 = base64Encode(authString);
        headers['Authorization'] = `Basic ${authBase64}`;
        console.log('使用Authorization头认证');
      }
      
      const response = await fetch(versionUrl, {
        method: 'GET',
        headers,
      });
      
      console.log('检查更新响应状态:', response.status);
      
      if (!response.ok) {
        let errorMessage = `无法连接到更新服务器 (${response.status})`;
        
        if (response.status === 401) {
          errorMessage = '认证失败，请检查服务器地址中的用户名和密码是否正确';
        } else if (response.status === 403) {
          errorMessage = '禁止访问，请检查服务器权限设置';
        } else if (response.status === 404) {
          errorMessage = '更新文件不存在，请检查服务器地址是否正确';
        } else {
          errorMessage = `无法连接到更新服务器 (${response.status})，请检查网络和服务器地址`;
        }
        
        alert.showError(errorMessage);
        return;
      }
      
      const data = await response.json();
      console.log('检查更新响应数据:', data);
      
      // 比较版本号
      const currentVersion = APP_VERSION.replace(/^V/, '');
      const latestVersion = (data.version || '0.0.0').replace(/^V/, '');
      
      const isNewVersion = compareVersions(latestVersion, currentVersion) > 0;
      
      if (isNewVersion) {
        // 处理 changelog：可能是数组（旧格式）或对象数组（新格式）
        let changelogText = '优化用户体验';
        if (Array.isArray(data.changelog)) {
          // 新格式：数组 [{version, date, changes}]
          changelogText = data.changelog[0]?.changes
            ?.map((c: { type: string; text: string }) => `${c.text}`)
            .join('\n') || '优化用户体验';
        } else if (typeof data.changelog === 'string') {
          // 旧格式：字符串
          changelogText = data.changelog;
        }
        setUpdateInfo({
          version: data.version || latestVersion,
          downloadUrl: data.downloadUrl || `${baseUrl}/app-release.apk`,
          changelog: changelogText,
          forceUpdate: data.forceUpdate || false,
        });
        setUpdateServerEditing(false); // 重置编辑状态
        setUpdateModalVisible(true);
      } else {
        alert.showSuccess(`当前已是最新版本 (${APP_VERSION})`);
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      alert.showError('检查更新失败，请检查网络连接');
    } finally {
      setCheckingUpdate(false);
    }
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
  
  // 下载并安装更新
  const downloadAndInstall = async () => {
    if (!updateInfo || downloading) return;
    
    // Android 平台检查
    if (Platform.OS !== 'android') {
      alert.showError('目前仅支持 Android 系统更新');
      return;
    }
    
    setDownloading(true);
    setDownloadProgress(0);
    
    try {
      // 下载目录：使用应用缓存目录
      let apkUri: string;
      
      if (FileSystem.cacheDirectory) {
        apkUri = FileSystem.cacheDirectory + 'ZhongCangWarehouse_update.apk';
      } else if (FileSystem.documentDirectory) {
        apkUri = FileSystem.documentDirectory + 'ZhongCangWarehouse_update.apk';
      } else {
        alert.showError('无法获取存储目录');
        setDownloading(false);
        return;
      }
      
      // 清理之前的下载
      await FileSystem.deleteAsync(apkUri, { idempotent: true });
      
      // 创建下载回调
      const downloadCallback = (downloadProgressData: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
        const progress = downloadProgressData.totalBytesWritten / downloadProgressData.totalBytesExpectedToWrite;
        setDownloadProgress(Math.round(progress * 100));
      };
      
      // 解析URL中的认证信息
      const downloadUrl = updateInfo.downloadUrl;
      const authInfo = parseAuthFromUrl(downloadUrl);
      const downloadHeaders: Record<string, string> = {};
      
      if (authInfo) {
        const authString = `${authInfo.username}:${authInfo.password}`;
        const authBase64 = base64Encode(authString);
        downloadHeaders['Authorization'] = `Basic ${authBase64}`;
      }
      
      // 开始下载
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        apkUri,
        { headers: downloadHeaders },
        downloadCallback
      );
      
      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        // 下载完成
        setDownloadProgress(100);
        console.log('APK下载成功，路径:', result.uri);
        
        // 使用 Sharing 分享，让用户选择保存或安装
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'application/vnd.android.package-archive',
            dialogTitle: '保存 APK 安装包',
            UTI: 'public.data',
          });
          alert.showSuccess('APK 已准备好，请选择保存位置或直接安装');
        } else {
          alert.showError('分享功能不可用，请检查存储权限');
        }
        
        setDownloading(false);
      } else {
        alert.showError('下载失败，请重试');
        setDownloading(false);
      }
    } catch (error) {
      console.error('下载失败:', error);
      alert.showError('下载失败，请检查网络连接');
      setDownloading(false);
    }
  };

  
  // 保存更新服务器地址
  const saveUpdateServer = async () => {
    if (!updateServerDisplayUrl.trim()) {
      alert.showError('服务器地址不能为空');
      return;
    }
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UPDATE_SERVER_URL, updateServerDisplayUrl.trim());
      setUpdateServerUrl(updateServerDisplayUrl.trim());
      setUpdateServerEditing(false);
      alert.showSuccess('更新服务器地址已保存');
    } catch (error) {
      console.error('保存失败:', error);
      alert.showError('保存失败');
    }
  };
  
  // 数据备份
  const handleBackup = async () => {
    if (backupLoading) return;
    
    setBackupLoading(true);
    try {
      const backupData = await exportBackupData();
      const backupJson = JSON.stringify(backupData, null, 2);
      
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const fileName = `掌上仓库备份_${dateStr}_${timeStr}.json`;
      
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, backupJson, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // 检测 Android 版本（API 26 = Android 8.0）
      const isAndroid8OrAbove = Platform.OS === 'android' && Platform.Version >= 26;
      
      if (isAndroid8OrAbove) {
        // Android 8.0+：直接使用 Sharing 分享
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/json',
            dialogTitle: '保存配置备份',
            UTI: 'public.json',
          });
          alert.showSuccess(`已备份配置:\n• 解析规则: ${backupData.rules.length} 条\n• 自定义字段: ${backupData.customFields.length} 个\n• 物料绑定: ${backupData.inventoryBindings.length} 条\n• 仓库: ${backupData.warehouses.length} 个\n• 同步服务器: ${backupData.syncConfig ? backupData.syncConfig.ip : '未配置'}\n\n请妥善保管备份文件！`);
        }
      } else {
        // Android 7.0 及以下：保存到 Downloads 文件夹
        try {
          // 请求媒体库权限
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            alert.showError('需要存储权限才能保存备份');
            // 备选方案：使用 Sharing
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(filePath, {
                mimeType: 'application/json',
                dialogTitle: '保存配置备份',
                UTI: 'public.json',
              });
            }
            return;
          }

          // 将文件保存到媒体库
          const asset = await MediaLibrary.createAssetAsync(filePath);

          // 获取 Downloads 相册
          try {
            const albums = await MediaLibrary.getAlbumsAsync();
            let downloadAlbum = albums.find((album: any) => 
              album.title === 'Download' || album.title === 'Downloads'
            );
            
            if (!downloadAlbum) {
              downloadAlbum = await MediaLibrary.createAlbumAsync('Downloads', asset, false);
            } else {
              await MediaLibrary.addAssetsToAlbumAsync([asset], downloadAlbum.id, false);
            }
          } catch (albumError) {
            console.log('添加到相册失败:', albumError);
          }

          // 尝试打开 Downloads 文件夹
          try {
            await Linking.openURL('content://downloads/all_downloads');
          } catch {
            try {
              await Linking.openURL('content://com.android.providers.downloads.documents/root/downloads');
            } catch {
              // 都打不开就算了
            }
          }

          alert.showSuccess(`备份已保存到 Downloads 文件夹:\n${fileName}\n\n• 解析规则: ${backupData.rules.length} 条\n• 自定义字段: ${backupData.customFields.length} 个\n• 物料绑定: ${backupData.inventoryBindings.length} 条\n• 仓库: ${backupData.warehouses.length} 个\n• 同步服务器: ${backupData.syncConfig ? backupData.syncConfig.ip : '未配置'}`);
        } catch (mediaError) {
          console.error('保存到Downloads失败:', mediaError);
          
          // 备选方案：使用 Sharing
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, {
              mimeType: 'application/json',
              dialogTitle: '保存配置备份',
              UTI: 'public.json',
            });
            alert.showSuccess(`已备份配置:\n• 解析规则: ${backupData.rules.length} 条\n• 自定义字段: ${backupData.customFields.length} 个\n• 物料绑定: ${backupData.inventoryBindings.length} 条\n• 仓库: ${backupData.warehouses.length} 个\n• 同步服务器: ${backupData.syncConfig ? backupData.syncConfig.ip : '未配置'}`);
          } else {
            alert.showError('备份失败，请重试');
          }
        }
      }
    } catch (error) {
      console.error('备份失败:', error);
      alert.showError('请重试');
    } finally {
      setBackupLoading(false);
    }
  };
  
  // 数据恢复
  const handleRestore = async () => {
    if (restoreLoading) return;
    
    try {
      // Android 7.0 及以下不支持 application/json 类型，使用 */* 替代
      const isAndroid7OrBelow = Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version <= 24;
      const documentType = isAndroid7OrBelow ? '*/*' : 'application/json';
      
      const result = await DocumentPicker.getDocumentAsync({
        type: documentType,
        copyToCacheDirectory: true,
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      
      const fileUri = result.assets[0].uri;
      
      // 如果选择的是所有文件，需要检查扩展名
      if (isAndroid7OrBelow && !fileUri.toLowerCase().endsWith('.json')) {
        alert.showWarning('请选择 .json 格式的备份文件');
        return;
      }
      
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      let backupData: BackupData;
      try {
        backupData = JSON.parse(fileContent);
      } catch (e) {
        alert.showError('无效的备份文件格式');
        return;
      }
      
      alert.showConfirm(
        '确认恢复配置',
        `备份时间: ${formatDateTimeExport(backupData.backupTime)}\n\n即将恢复以下配置:\n• 解析规则: ${backupData.rules?.length || 0} 条\n• 自定义字段: ${backupData.customFields?.length || 0} 个\n• 物料绑定: ${backupData.inventoryBindings?.length || 0} 条\n• 仓库: ${backupData.warehouses?.length || 0} 个\n• 同步服务器: ${backupData.syncConfig ? backupData.syncConfig.ip : '未配置'}\n\n[警告] 当前配置将被覆盖！`,
        async () => {
          setRestoreLoading(true);
          try {
            const result = await importBackupData(backupData);
            if (result.success) {
              alert.showSuccess(`备份时间: ${formatDateTimeExport(backupData.backupTime)}\n\n恢复成功:\n• 解析规则: ${result.stats.rules} 条\n• 自定义字段: ${result.stats.customFields} 个\n• 物料绑定: ${result.stats.inventoryBindings} 条\n• 仓库: ${result.stats.warehouses} 个\n• 同步服务器: ${result.stats.hasSyncConfig ? '已恢复' : '未配置'}`);
              loadData();
            } else {
              alert.showError(result.message);
            }
          } catch (error) {
            console.error('恢复失败:', error);
            alert.showError('请重试');
          } finally {
            setRestoreLoading(false);
          }
        },
        true
      );
    } catch (error) {
      console.error('选择文件失败:', error);
      alert.showError('无法读取备份文件');
    }
  };
  
  // 是否可以同步
  const canSync = syncConfig.ip && connectionStatus === 'success';
  
  // 渲染菜单卡片
  const renderMenuCard = (
    title: string,
    desc: string,
    iconName: keyof typeof Feather.glyphMap,
    color: string,
    onPress: () => void,
    disabled?: boolean,
    loading?: boolean,
    rightText?: string
  ) => (
    <AnimatedCard 
      onPress={onPress} 
      disabled={disabled || loading}
      style={disabled ? styles.exportCardDisabled : undefined}
    >
      <View style={styles.exportCardContainer}>
        <View style={styles.exportCard}>
          <View style={[styles.exportIcon, { backgroundColor: color + '15' }]}>
            {loading ? (
              <ActivityIndicator size="small" color={color} />
            ) : (
              <Feather name={iconName} size={20} color={color} />
            )}
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>
              {loading ? '处理中...' : title}
            </Text>
            <Text style={styles.exportDesc}>{desc}</Text>
          </View>
          {rightText ? (
            <Text style={[styles.rightText, { color }]}>{rightText}</Text>
          ) : (
            <Feather name="chevron-right" size={16} color={theme.textMuted} />
          )}
        </View>
      </View>
    </AnimatedCard>
  );
  
  // 渲染开关设置项
  const renderSwitchCard = (
    title: string,
    desc: string,
    iconName: keyof typeof Feather.glyphMap,
    color: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <AnimatedCard onPress={() => onValueChange(!value)}>
      <View style={styles.exportCardContainer}>
        <View style={styles.exportCard}>
          <View style={[styles.exportIcon, { backgroundColor: color + '15' }]}>
            <Feather name={iconName} size={20} color={color} />
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>{title}</Text>
            <Text style={styles.exportDesc}>{desc}</Text>
          </View>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: theme.border, true: color + '80' }}
            thumbColor={value ? color : theme.textMuted}
          />
        </View>
      </View>
    </AnimatedCard>
  );
  
  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>设置</Text>
        </View>
        
        {/* ========== 基础配置 ========== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>基础配置</Text>
        </View>
        
        <View style={{ gap: getSpacing().md }}>
          {renderMenuCard(
            '仓库管理',
            '添加、编辑仓库信息',
            'home',
            theme.primary,
            () => router.push('/warehouse-management')
          )}
          
          {renderSwitchCard(
            '扫码提示音',
            '扫码成功/重复时播放提示音',
            'volume-2',
            theme.primary,
            soundEnabled,
            toggleSound
          )}
          
          {renderMenuCard(
            '检查更新',
            `当前版本 ${APP_VERSION}`,
            'refresh-cw',
            theme.success,
            checkForUpdate,
            checkingUpdate,
            checkingUpdate
          )}
        </View>
        
        {/* ========== 解析配置 ========== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>解析配置</Text>
        </View>
        
        <View style={{ gap: getSpacing().md }}>
          {renderMenuCard(
            '解析规则',
            '二维码解析规则配置',
            'sliders',
            theme.accent,
            () => router.push('/rules'),
            false,
            false,
            `${configStats.rules} 条`
          )}
          
          {renderMenuCard(
            '自定义字段',
            '扩展物料信息字段',
            'plus-square',
            theme.warning,
            () => router.push('/custom-fields'),
            false,
            false,
            `${configStats.customFields} 个`
          )}
        </View>
        
        {/* ========== 数据同步 ========== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>数据同步</Text>
        </View>
        
        {/* 服务器配置 */}
        <View style={styles.syncConfigCard}>
          <View style={styles.syncConfigRow}>
            <Text style={styles.syncConfigLabel}>服务器</Text>
            <TextInput
              style={styles.syncConfigInput}
              value={syncConfig.ip}
              onChangeText={handleIpChange}
              placeholder="IP或域名"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              showSoftInputOnFocus={true}
            />
          </View>
          <View style={styles.syncConfigRow}>
            <Text style={styles.syncConfigLabel}>端口</Text>
            <TextInput
              style={styles.syncConfigInput}
              value={syncConfig.port}
              onChangeText={handlePortChange}
              placeholder="默认: 8080"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              showSoftInputOnFocus={true}
            />
          </View>
          <View style={styles.syncConfigButtons}>
            <TouchableOpacity 
              style={[
                styles.syncButton, 
                styles.syncButtonTest,
                connectionStatus === 'success' && styles.syncButtonSuccess,
                (connectionStatus === 'error' || connectionStatus === 'disconnected') && styles.syncButtonError,
              ]} 
              onPress={handleTestConnection}
              disabled={connectionStatus === 'testing'}
            >
              {connectionStatus === 'testing' ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[
                  styles.syncButtonTestText,
                  connectionStatus === 'success' && styles.syncButtonSuccessText,
                  (connectionStatus === 'error' || connectionStatus === 'disconnected') && styles.syncButtonErrorText,
                ]}>
                  {connectionStatus === 'success' ? '已连接 ✓' : 
                   connectionStatus === 'disconnected' ? '断开连接 ✗' :
                   connectionStatus === 'error' ? '连接失败 ✗' : '测试连接'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          {connectionStatus === 'success' && (
            <Text style={styles.syncStatusHint}>连接成功，配置已自动保存</Text>
          )}
          {connectionStatus === 'disconnected' && (
            <Text style={styles.syncStatusHintError}>网络连接已断开，请检查网络后重新连接</Text>
          )}
          {connectionStatus === 'error' && (
            <Text style={styles.syncStatusHintError}>请检查服务器地址和状态后重试</Text>
          )}
          {connectionStatus === 'idle' && !syncConfig.ip && (
            <Text style={styles.syncStatusHintIdle}>支持局域网IP、公网IP或域名</Text>
          )}
        </View>
        
        {/* 同步按钮 */}
        <View style={{ gap: getSpacing().sm }}>
          {renderMenuCard(
            '同步入库单',
            '入库记录导出到电脑',
            'download-cloud',
            theme.success,
            handleSyncInbound,
            !canSync,
            syncingInbound
          )}
          
          {renderMenuCard(
            '同步出库单',
            '出库物料导出到电脑',
            'upload-cloud',
            theme.primary,
            handleSyncOutbound,
            !canSync,
            syncingOutbound
          )}
          
          {renderMenuCard(
            '同步盘点单',
            '盘点记录导出到电脑',
            'file-text',
            theme.accent,
            handleSyncInventory,
            !canSync,
            syncingInventory
          )}
          
          {renderMenuCard(
            '同步标签数据',
            '拆包标签导出到电脑打印',
            'tag',
            theme.purple,
            handleSyncLabels,
            !canSync,
            syncingLabels
          )}
        </View>
        
        {/* ========== 备份恢复 ========== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>备份恢复</Text>
        </View>
        
        <View style={{ gap: getSpacing().md }}>
          {renderMenuCard(
            '备份配置',
            '导出规则、字段、物料绑定、仓库、同步服务器',
            'save',
            theme.cyan,
            handleBackup,
            false,
            backupLoading
          )}
          
          {renderMenuCard(
            '恢复配置',
            '从备份文件恢复全部配置',
            'rotate-ccw',
            theme.purple,
            handleRestore,
            false,
            restoreLoading
          )}
        </View>
        
        {/* ========== 数据管理 ========== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>数据管理</Text>
        </View>
        
        <View style={{ gap: getSpacing().md }}>
          {renderMenuCard(
            '清空业务数据',
            '清空订单、物料、标签数据',
            'trash-2',
            theme.error,
            () => {
              alert.showConfirm(
                '确认清空',
                '确定要清空所有业务数据吗？\n\n将清空：订单、物料、标签、入库记录、盘点记录\n保留：仓库、物料绑定、解析规则、自定义字段',
                async () => {
                  try {
                    await clearAllBusinessData();
                    alert.showSuccess('业务数据已清空');
                    loadData();
                  } catch (error) {
                    console.error('清空数据失败:', error);
                    alert.showError('操作失败，请重试');
                  }
                },
                true
              );
            }
          )}
        </View>
        
        {/* ========== 关于 ========== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>关于</Text>
        </View>
        
        <View style={styles.aboutCard}>
          {/* App图标和名称 */}
          <View style={styles.aboutAppSection}>
            <View style={styles.aboutLogo}>
              <Feather name="package" size={rs(16)} color={theme.primary} />
            </View>
            <Text style={styles.aboutAppName}>{APP_NAME}</Text>
            <View style={styles.aboutVersionBadge}>
              <Text style={styles.aboutVersionText}>{APP_VERSION}</Text>
            </View>
          </View>
          
          <View style={styles.aboutDivider} />
          
          {/* 公司信息 */}
          <View style={styles.aboutDetailsSection}>
            <View style={styles.aboutDetailRow}>
              <View style={styles.aboutDetailIconWrapper}>
                <Feather name="briefcase" size={rs(14)} color={theme.textSecondary} />
              </View>
              <Text style={styles.aboutDetailLabel}>公司</Text>
              <View style={styles.aboutDetailRight}>
                <Text style={styles.aboutDetailValue}>{COMPANY_NAME}</Text>
                <Feather name="external-link" size={rs(12)} color={theme.textMuted} />
              </View>
            </View>
            
            <View style={styles.aboutDetailRow}>
              <View style={styles.aboutDetailIconWrapper}>
                <Feather name="user" size={rs(14)} color={theme.textSecondary} />
              </View>
              <Text style={styles.aboutDetailLabel}>作者</Text>
              <Text style={styles.aboutDetailValue}>{AUTHOR}</Text>
            </View>
          </View>
          
          <View style={styles.aboutDivider} />
          
          {/* 使用说明和更新日志 */}
          <View style={styles.helpRow}>
            <TouchableOpacity
              style={styles.helpEntry}
              onPress={() => router.push('/help')}
              activeOpacity={0.7}
            >
              <Feather name="book-open" size={rs(14)} color={theme.textMuted} style={styles.helpIconWrapper} />
              <Text style={styles.helpText}>使用说明</Text>
              <Feather name="chevron-right" size={rs(14)} color={theme.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.helpEntry}
              onPress={() => router.push('/changelog')}
              activeOpacity={0.7}
            >
              <Feather name="file-text" size={rs(14)} color={theme.textMuted} style={styles.changelogIconWrapper} />
              <Text style={styles.changelogText}>更新日志</Text>
              <Feather name="chevron-right" size={rs(14)} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 底部留白 */}
        <View style={{ height: Spacing['4xl'] }} />
      </ScrollView>
      
      {/* ==================== 在线更新模态框 ==================== */}
      <Modal
        visible={updateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !downloading && setUpdateModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.updateModalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.updateModalHeader}>
              <Text style={styles.updateModalTitle}>发现新版本</Text>
              {!downloading && (
                <TouchableOpacity onPress={() => {
                  setUpdateModalVisible(false);
                  setUpdateServerEditing(false);
                }}>
                  <Feather name="x" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Body */}
            <ScrollView 
              style={styles.updateModalBody}
              contentContainerStyle={styles.updateModalBodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {updateInfo && (
                <>
                  {/* 版本信息 */}
                  <View style={styles.updateVersionInfo}>
                    <Text style={styles.updateVersionLabel}>新版本</Text>
                    <Text style={styles.updateVersionText}>V{updateInfo.version}</Text>
                  </View>
                  
                  {/* 更新日志 */}
                  <Text style={styles.updateChangelogTitle}>更新内容</Text>
                  <Text style={styles.updateChangelogText}>{updateInfo.changelog}</Text>
                  
                  {/* 下载进度 */}
                  {downloading && (
                    <View style={styles.downloadProgress}>
                      <View style={styles.progressBarContainer}>
                        <View 
                          style={[
                            styles.progressBar, 
                            { width: `${downloadProgress}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>
                        下载中... {downloadProgress}%
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              {/* 更新服务器地址配置 */}
              {updateServerEditing && (
                <View style={styles.updateServerConfig}>
                  <Text style={styles.updateServerLabel}>更新服务器地址</Text>
                  <TextInput
                    style={styles.updateServerInput}
                    value={updateServerDisplayUrl}
                    onChangeText={setUpdateServerDisplayUrl}
                    placeholder="输入服务器地址"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={true}
                  />
                  <View style={styles.updateServerButtons}>
                    <TouchableOpacity 
                      style={styles.updateServerCancelBtn}
                      onPress={() => {
                        setUpdateServerEditing(false);
                      }}
                    >
                      <Text style={styles.updateServerCancelText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.updateServerSaveBtn}
                      onPress={saveUpdateServer}
                    >
                      <Text style={styles.updateServerSaveText}>保存</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
            
            {/* Footer */}
            {!downloading && (
              <View style={styles.updateModalFooter}>
                {!updateServerEditing && (
                  <>
                    <TouchableOpacity 
                      style={styles.updateServerLinkBtn}
                      onPress={() => {
                        setUpdateServerDisplayUrl(extractDisplayUrl(updateServerUrl));
                        setUpdateServerEditing(true);
                      }}
                    >
                      <Text style={styles.updateServerLinkText}>修改服务器地址</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.updateButtons}>
                      <TouchableOpacity 
                        style={styles.updateCancelBtn}
                        onPress={() => {
                          setUpdateModalVisible(false);
                          setUpdateServerEditing(false);
                        }}
                      >
                        <Text style={styles.updateCancelText}>稍后再说</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.updateInstallBtn}
                        onPress={downloadAndInstall}
                      >
                        <Text style={styles.updateInstallText}>下载安装</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      
      {alert.AlertComponent}
    </Screen>
  );
}
