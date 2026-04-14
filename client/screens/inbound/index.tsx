import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { useCustomAlert } from '@/components/CustomAlert';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Warehouse,
  getAllWarehouses,
  getDefaultWarehouse,
  addInboundRecord,
  generateInboundNo,
  detectRule,
  parseWithRule,
  getInventoryCodeByModel,
  getSupplierByModel,
} from '@/utils/database';
import { isQRCode } from '@/utils/qrcodeParser';
import { Spacing } from '@/constants/theme';
import { Feather, FontAwesome6 } from '@expo/vector-icons';
import { feedbackSuccess, feedbackWarning, feedbackError, startErrorVibration, stopErrorVibration } from '@/utils/feedback';
import { Str } from '@/resources/strings';

// 扫描记录类型
interface ScanRecord {
  id: string;
  model: string;
  batch: string;
  quantity: number;
  scanTime: string;
  rawContent: string;
  inventoryCode?: string;
  supplier?: string;
  // 扩展字段
  package?: string;
  version?: string;
  productionDate?: string;
  traceNo?: string;
  sourceNo?: string;
  // 是否已确认
  confirmed?: boolean;
}

export default function InboundScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const alert = useCustomAlert();
  const router = useSafeRouter();

  // 输入
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState('');
  const processingRef = useRef(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 扫码队列 - 暂存处理中的新扫码
  const scanQueueRef = useRef<string[]>([]);
  // 防抖相关
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // 仓库
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);

  // 当前供应商（从物料管理获取）
  const [currentSupplier, setCurrentSupplier] = useState<string | null>(null);

  // 入库单号
  const [inboundNo, setInboundNo] = useState('');

  // AsyncStorage Key
  const INBOUND_SCAN_RECORDS_KEY = 'inbound_scan_records';
  const INBOUND_PENDING_DATA_KEY = 'inbound_pending_data';

  // 扫描记录
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);
  const [saving, setSaving] = useState(false);

  // Toast
  const [toastText, setToastText] = useState('');
  const [toastType, setToastType] = useState<'success' | 'warning' | 'error'>('success');
  const toastAnim = useRef(new Animated.Value(0)).current;

  // 展开状态管理
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 确认状态管理
  const [confirmedGroups, setConfirmedGroups] = useState<Set<string>>(new Set());

  // 加载扫描记录
  const loadScanRecords = async () => {
    try {
      const savedRecords = await AsyncStorage.getItem(INBOUND_SCAN_RECORDS_KEY);
      if (savedRecords) {
        const records = JSON.parse(savedRecords) as ScanRecord[];
        setScanRecords(records);
        
        // 恢复供应商和入库单号
        const pendingData = await AsyncStorage.getItem(INBOUND_PENDING_DATA_KEY);
        if (pendingData) {
          const data = JSON.parse(pendingData);
          setCurrentSupplier(data.supplier || null);
          setInboundNo(data.inboundNo || '');
        }
        
        if (records.length > 0) {
          showToast(`${Str.inboundRestoreRecords} ${records.length} ${Str.inboundRecords}`, 'success');
        }
      }
    } catch (error) {
      console.error('加载扫描记录失败:', error);
    }
  };

  // 保存扫描记录
  const saveScanRecords = async (records: ScanRecord[], supplier?: string | null) => {
    try {
      await AsyncStorage.setItem(INBOUND_SCAN_RECORDS_KEY, JSON.stringify(records));
      
      const pendingData = {
        supplier: supplier || currentSupplier,
        inboundNo: inboundNo,
        warehouseId: currentWarehouse?.id,
        warehouseName: currentWarehouse?.name,
      };
      await AsyncStorage.setItem(INBOUND_PENDING_DATA_KEY, JSON.stringify(pendingData));
    } catch (error) {
      console.error('保存扫描记录失败:', error);
    }
  };

  // 清空扫描记录
  const clearScanRecords = async () => {
    try {
      await AsyncStorage.removeItem(INBOUND_SCAN_RECORDS_KEY);
      await AsyncStorage.removeItem(INBOUND_PENDING_DATA_KEY);
    } catch (error) {
      console.error('清空扫描记录失败:', error);
    }
  };

  // 初始化
  useEffect(() => {
    loadWarehouses();
    generateNo();
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
      stopErrorVibration();
    };
  }, []);

  // 聚焦
  useFocusEffect(
    useCallback(() => {
      setTimeout(() => inputRef.current?.focus(), 100);
      // 加载扫描记录
      loadScanRecords();
    }, [])
  );

  // 加载仓库
  const loadWarehouses = async () => {
    const list = await getAllWarehouses();
    setWarehouses(list);
    const def = await getDefaultWarehouse();
    setCurrentWarehouse(def || list[0] || null);
  };

  // 生成入库单号
  const generateNo = async () => {
    const no = await generateInboundNo();
    setInboundNo(no);
  };

  // Toast
  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastText(text);
    setToastType(type);
    Animated.timing(toastAnim, { toValue: 1, duration: 100, useNativeDriver: false }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 100, useNativeDriver: false }).start(() => setToastText(''));
    }, 500);
  };

  // 处理扫描（带参数版本，供自动触发调用）
  const processScan = useCallback(async (code: string) => {
    if (!code || processingRef.current) return;

    if (!currentWarehouse) {
      showToast('请先选择仓库', 'error');
      feedbackError();
      console.warn('[扫码入库] 未选择仓库');
      return;
    }

    processingRef.current = true;

    try {
      // 解析二维码
      let parsed: {
        model: string;
        batch: string;
        quantity: string;
        package?: string;
        version?: string;
        productionDate?: string;
        traceNo?: string;
        sourceNo?: string;
      } | null = null;

      try {
        const rule = await detectRule(code);
        if (rule) {
          const { standardFields } = parseWithRule(code, rule);
          parsed = {
            model: standardFields.model || '',
            batch: standardFields.batch || '',
            quantity: standardFields.quantity || '1',
            package: standardFields.package || '',
            version: standardFields.version || '',
            productionDate: standardFields.productionDate || '',
            traceNo: standardFields.traceNo || '',
            sourceNo: standardFields.sourceNo || '',
          };
          console.log('[扫码入库] 解析成功:', parsed);
        }
      } catch (e) {
        console.error('[扫码入库] 规则解析失败:', e);
      }

      if (!parsed || !parsed.model) {
        showToast('无法识别物料信息', 'error');
        feedbackError();
        console.error('[扫码入库] 无法识别物料信息:', { code, parsed });
        return;
      }

      const quantity = parseInt(parsed.quantity || '1', 10);

      // 查找存货编码和供应商
      const inventoryCode = await getInventoryCodeByModel(parsed.model);
      const supplier = await getSupplierByModel(parsed.model);

      // 检查供应商一致性
      if (supplier && currentSupplier && supplier !== currentSupplier) {
        showToast(`⚠️ 供应商不一致\n当前: ${currentSupplier}\n此物料: ${supplier}`, 'warning');
        feedbackWarning();
        console.warn('[扫码入库] 供应商不一致:', { currentSupplier, supplier });
        return;
      }

      // 首次扫描时设置供应商
      if (!currentSupplier && supplier) {
        setCurrentSupplier(supplier);
        console.log('[扫码入库] 设置供应商:', supplier);
      }

      // 检查是否重复扫描（只检测追溯码，因为箱号可能重复）
      let isDuplicate = false;

      // 根据追溯码判断（已保存的记录）
      if (parsed.traceNo) {
        const existing = scanRecords.find(r => r.traceNo === parsed.traceNo);
        if (existing) {
          isDuplicate = true;
          console.warn('[扫码入库] 重复检测（已保存追溯码）:', parsed.traceNo);
        }
      }

      if (isDuplicate) {
        showToast('⚠️ 该物料已扫码，请勿重复', 'warning');
        startErrorVibration();
        return;
      }

      // 新增记录（保存原始记录，不合并数量）
      const newRecord: ScanRecord = {
        id: Date.now().toString(),
        model: parsed.model,
        batch: parsed.batch,
        quantity,
        scanTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        rawContent: code,
        inventoryCode: inventoryCode || undefined,
        supplier: supplier || undefined,
        // 扩展字段
        package: parsed.package || undefined,
        version: parsed.version || undefined,
        productionDate: parsed.productionDate || undefined,
        traceNo: parsed.traceNo || undefined,
        sourceNo: parsed.sourceNo || undefined,
      };
      const newRecords = [newRecord, ...scanRecords];
      setScanRecords(newRecords);
      saveScanRecords(newRecords);
      showToast(`${parsed.model}`, 'success');
      feedbackSuccess();
      stopErrorVibration();
      console.log('[扫码入库] 扫码成功:', { model: parsed.model, version: parsed.version, quantity });
    } catch (e) {
      console.error('[扫码入库] 处理失败:', e);
      showToast('处理失败', 'error');
      feedbackError();
    } finally {
      processingRef.current = false;
      // 处理完成后，检查队列是否有待处理的扫码
      // 注意：使用 setTimeout 让 React 有机会更新状态，避免重复检测失败
      setTimeout(() => {
        if (scanQueueRef.current.length > 0) {
          const nextCode = scanQueueRef.current.shift();
          if (nextCode) {
            console.log('[扫码入库] 处理队列中的扫码:', nextCode);
            processScan(nextCode);
          }
        } else {
          // 队列空了，重新聚焦输入框
          inputRef.current?.focus();
        }
      }, 0);
    }
  }, [currentWarehouse, currentSupplier, scanRecords]);

  // 处理扫描（入口函数，清理换行符后调用）
  // 修复：防止 onChangeText 和 onSubmitEditing 重复触发
  const handleScan = useCallback(async () => {
    // 如果正在处理中，直接返回
    if (processingRef.current) return;
    
    // PDA扫码可能带有多余的字符，需要全面清理
    let code = inputValue.trim()
      .replace(/[\r\n\t\s]+/g, '')  // 清理所有空白字符（换行、回车、制表符、空格）
      .replace(/^[^A-Za-z0-9]+/, '')  // 清理开头非字母数字字符
      .replace(/[^A-Za-z0-9]+$/, ''); // 清理结尾非字母数字字符

    // 如果没有有效内容，不处理
    if (!code) {
      console.log('[扫码入库] handleScan: 无有效内容，跳过');
      return;
    }

    console.log('[扫码入库] handleScan 触发:', code);
    
    setInputValue(''); // 清空输入框
    await processScan(code);
    // 注意：processScan 的 finally 块会处理重新聚焦
  }, [inputValue, processScan]);

  // 输入变化时自动检测并触发（扫码器逐字符输入，需要防抖检测完成）
  const handleInputChange = useCallback((text: string) => {
    // 清除之前的定时器（每次输入都重置）
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }

    // 如果正在处理中，先缓存当前输入
    if (processingRef.current) {
      // 暂存到队列
      if (text.trim()) {
        scanQueueRef.current.push(text.trim());
      }
      return;
    }

    // 如果当前有输入内容，启动定时器检测扫码完成
    if (text.length > 0) {
      autoSubmitTimerRef.current = setTimeout(() => {
        const code = text.trim();
        // 检测到输入完成（输入停止超过阈值，认为扫码完成）
        if (code.length >= 1) {
          console.log('[扫码入库] 扫码输入完成:', code);
          // 一维码过滤：不含分隔符的扫码静默忽略
          if (!isQRCode(code)) {
            console.log('[扫码入库] 检测为一维码，静默忽略:', code);
            setInputValue(''); // 清空输入框
            inputRef.current?.focus(); // 重新聚焦
            return;
          }
          setInputValue(''); // 清空输入框
          processScan(code);
        }
      }, 150); // 150ms 防抖，等待扫码器输入完成
      return;
    }

    // 输入框被清空时，更新状态
    setInputValue(text);
  }, [processScan]);

  // 扫码完成确认（焦点录入模式：用户手动按回车）
  const handleSubmitEditing = useCallback(() => {
    if (processingRef.current) return;

    let code = inputValue
      .replace(/[\r\n\t]+$/, '')
      .trim()
      .replace(/[\r\n\t\s]+/g, '')
      .replace(/^[^A-Za-z0-9]+/, '')
      .replace(/[^A-Za-z0-9]+$/, '');

    if (!code) return;

    // 一维码过滤：不含分隔符的扫码静默忽略
    if (!isQRCode(code)) {
      console.log('[扫码入库] 检测为一维码，静默忽略:', code);
      setInputValue('');
      inputRef.current?.focus();
      return;
    }

    console.log('[扫码入库] 手动回车处理:', code);
    setInputValue('');
    processScan(code);
  }, [inputValue, processScan]);

  // 选择仓库
  const selectWarehouse = (wh: Warehouse) => {
    setCurrentWarehouse(wh);
    setShowWarehousePicker(false);
    showToast(wh.name, 'success');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 确认入库
  const handleSaveInbound = async () => {
    if (!currentWarehouse) {
      showToast('请先选择仓库', 'warning');
      feedbackWarning();
      return;
    }
    if (scanRecords.length === 0) {
      showToast('暂无扫描记录', 'warning');
      feedbackWarning();
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      // 保存每条扫描记录
      for (const record of scanRecords) {
        await addInboundRecord({
          inbound_no: inboundNo,
          warehouse_id: currentWarehouse.id,
          warehouse_name: currentWarehouse.name,
          inventory_code: record.inventoryCode || '',
          scan_model: record.model,
          batch: record.batch,
          quantity: record.quantity,
          in_date: today,
          notes: '',
          rawContent: record.rawContent,
          // 扩展字段
          package: record.package,
          version: record.version,
          productionDate: record.productionDate,
          traceNo: record.traceNo,
          sourceNo: record.sourceNo,
        });
      }

      showToast(`入库成功！共 ${scanRecords.length} 条`, 'success');
      feedbackSuccess();
      
      // 重置
      setScanRecords([]);
      setCurrentSupplier(null);
      generateNo();
      // 清空 AsyncStorage
      clearScanRecords();
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败', 'error');
      feedbackError();
    } finally {
      setSaving(false);
    }
  };

  // 清空记录
  const handleClearRecords = () => {
    if (scanRecords.length === 0) return;
    setScanRecords([]);
    setCurrentSupplier(null);
    clearScanRecords();
    showToast(Str.toastClearSuccess, 'warning');
    feedbackWarning();
  };

  // 切换确认状态
  const toggleConfirmed = (id: string) => {
    const newRecords = scanRecords.map(r => 
      r.id === id ? { ...r, confirmed: !r.confirmed } : r
    );
    setScanRecords(newRecords);
    saveScanRecords(newRecords);
  };

  // 切换展开/折叠
  const toggleExpand = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // 切换确认状态
  const toggleConfirm = useCallback((key: string) => {
    setConfirmedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // 删除单条记录
  const handleDeleteRecord = useCallback((recordId: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这条记录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const updated = scanRecords.filter(r => r.id !== recordId);
            setScanRecords(updated);
            saveScanRecords(updated);
            showToast('删除成功', 'success');
          },
        },
      ]
    );
  }, [scanRecords]);

  // 删除聚合组（所有同型号+版本号的记录）
  const handleDeleteGroup = useCallback((item: any) => {
    Alert.alert(
      '确认删除',
      `确定要删除 ${item.model} V${item.version || '-'} 的所有 ${item.count} 箱记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const recordIds = item.records.map((r: ScanRecord) => r.id);
            const updated = scanRecords.filter(r => !recordIds.includes(r.id));
            setScanRecords(updated);
            saveScanRecords(updated);
            showToast(`已删除 ${item.count} 箱记录`, 'success');
          },
        },
      ]
    );
  }, [scanRecords]);

  // 计算总数量
  const totalQuantity = scanRecords.reduce((sum, r) => sum + r.quantity, 0);

  // 计算已确认数量
  const confirmedCount = confirmedGroups.size;

  // 聚合扫描记录（按型号+版本号聚合，用于显示）
  const aggregatedRecords = useMemo(() => {
    const map = new Map<string, { records: ScanRecord[], totalQuantity: number }>();
    
    scanRecords.forEach(record => {
      const key = `${record.model}|${record.version || ''}`;
      if (!map.has(key)) {
        map.set(key, { records: [], totalQuantity: 0 });
      }
      const group = map.get(key)!;
      group.records.push(record);
      group.totalQuantity += record.quantity;
    });
    
    return Array.from(map.entries()).map(([key, group]) => {
      const [model, version] = key.split('|');
      return {
        model,
        version: version || '',
        records: group.records,
        totalQuantity: group.totalQuantity,
        count: group.records.length,
      };
    });
  }, [scanRecords]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>扫码入库</Text>
        </View>

        {/* 顶部：仓库选择 + 供应商 */}
        <View style={[styles.topBar]}>
          <TouchableOpacity style={styles.warehouseBtn} onPress={() => setShowWarehousePicker(true)}>
            <FontAwesome6 name="warehouse" size={14} color={theme.textPrimary} />
            <Text style={styles.warehouseText} numberOfLines={1}>
              {currentWarehouse?.name || Str.labelSelectWarehouse}
            </Text>
            <FontAwesome6 name="chevron-down" size={10} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={[styles.supplierTag, scanRecords.length > 0 && styles.supplierTagActive]}>
            <FontAwesome6 
              name="building" 
              size={12} 
              color={scanRecords.length > 0 ? theme.white : theme.textMuted} 
            />
            <Text style={[styles.supplierText, scanRecords.length > 0 && styles.supplierTextActive]}>
              {currentSupplier || (scanRecords.length > 0 ? `${Str.inboundScanned} ${scanRecords.length} ${Str.inboundRecords}` : Str.labelSupplier)}
            </Text>
          </View>
        </View>

        {/* 扫码输入 + Toast（在同一个容器里） */}
        <View style={styles.scanBox}>
          <TextInput
            ref={inputRef}
            style={styles.scanInput}
            value={inputValue}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSubmitEditing}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={false}
            showSoftInputOnFocus={true}
          />
          
          {/* Toast（相对于 scanBox 定位） */}
          {toastText ? (
            <Animated.View
              style={[
                styles.toast,
                toastType === 'success' && styles.toastSuccess,
                toastType === 'warning' && styles.toastWarning,
                toastType === 'error' && styles.toastError,
                { opacity: toastAnim },
              ]}
            >
              <Text style={styles.toastText}>{toastText}</Text>
            </Animated.View>
          ) : null}
        </View>

        {/* 物料列表 */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>扫描记录</Text>
            <Text style={styles.listCount}>
              {aggregatedRecords.length} 型号 / {totalQuantity} 件
              {confirmedCount > 0 && ` / 已确认 ${confirmedCount}`}
            </Text>
          </View>
          <ScrollView style={styles.list}>
            {aggregatedRecords.map((item) => {
              const key = `${item.model}|${item.version}`;
              const isExpanded = expandedGroups.has(key);
              const isConfirmed = confirmedGroups.has(key);
              
              return (
                <View key={key} style={styles.itemContainer}>
                  {/* 聚合项 */}
                  <TouchableOpacity
                    style={[
                      styles.item,
                      isConfirmed && styles.itemConfirmed
                    ]}
                    onLongPress={() => handleDeleteGroup(item)}
                    delayLongPress={500}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemLeft}>
                      {/* 勾选框 */}
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => toggleConfirm(key)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <FontAwesome6 
                          name={isConfirmed ? "square-check" : "square"} 
                          size={20} 
                          color={isConfirmed ? theme.success : theme.textMuted} 
                        />
                      </TouchableOpacity>

                      {/* 型号和版本（点击展开/折叠） */}
                      <TouchableOpacity
                        style={styles.modelContent}
                        onPress={() => toggleExpand(key)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.itemModel}>
                          {isExpanded ? '▼' : '▶'} {item.model}
                        </Text>
                        <Text style={styles.itemBatch}>
                          版本: {item.version || '-'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemQty}>
                        {item.totalQuantity.toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 展开的明细 */}
                  {isExpanded && (
                    <View style={styles.detailsContainer}>
                      {item.records.map((record) => (
                        <TouchableOpacity
                          key={record.id}
                          style={styles.detailItem}
                          onLongPress={() => handleDeleteGroup(item)}
                          delayLongPress={500}
                        >
                          <Text style={styles.detailText}>
                            批次: {record.batch || '-'}
                            {record.sourceNo ? `  |  箱号: ${record.sourceNo}` : ''}
                            {'  |  数量: '}{record.quantity}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            {scanRecords.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>暂无扫描记录</Text>
              </View>
            )}
          </ScrollView>

          {/* 操作按钮 */}
          {scanRecords.length > 0 && (
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearRecords}>
                <Text style={styles.clearBtnText}>{Str.btnClear}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSaveInbound}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.buttonPrimaryText} />
                ) : (
                  <Text style={styles.submitBtnText}>{Str.inboundConfirm}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 仓库选择器 */}
        {showWarehousePicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerBox}>
              <Text style={styles.pickerTitle}>选择仓库</Text>
              {warehouses.map(wh => (
                <TouchableOpacity
                  key={wh.id}
                  style={[styles.pickerItem, currentWarehouse?.id === wh.id && styles.pickerItemActive]}
                  onPress={() => selectWarehouse(wh)}
                >
                  <Text style={styles.pickerItemText}>{wh.name}</Text>
                  {currentWarehouse?.id === wh.id && (
                    <FontAwesome6 name="check" size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.pickerClose} onPress={() => setShowWarehousePicker(false)}>
                <Text style={styles.pickerCloseText}>关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
