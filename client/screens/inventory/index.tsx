import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Modal,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather, FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  Warehouse,
  getAllWarehouses,
  getDefaultWarehouse,
  detectRule,
  parseWithRule,
  getInventoryCodeByModel,
  addInventoryCheckRecord,
  generateCheckNo,
  getAllInventoryCheckRecords,
  InventoryCheckRecord,
} from '@/utils/database';
import { Spacing } from '@/constants/theme';
import { feedbackSuccess, feedbackWarning, feedbackError } from '@/utils/feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 盘点类型
type CheckType = 'whole' | 'partial';

// 扫描记录（每条独立）
interface ScanRecord {
  id: string;
  traceCode: string; // 追溯码（二维码原始内容）
  model: string;
  batch: string;
  quantity: number;
  actualQuantity?: number;
  inventoryCode?: string;
  scanTime: string;
  // 扩展字段
  package?: string;
  version?: string;
  productionDate?: string;
  traceNo?: string;
  sourceNo?: string;
}

export default function InventoryScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();

  // 盘点类型
  const [checkType, setCheckType] = useState<CheckType>('whole');

  // 输入
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState('');
  const processingRef = useRef(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInputRef = useRef('');

  // 仓库
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);

  // 扫描记录
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);

  // AsyncStorage Key
  const INVENTORY_CHECK_RECORDS_KEY = 'inventory_check_records';
  const INVENTORY_CHECK_TYPE_KEY = 'inventory_check_type';
  const INVENTORY_CHECK_WAREHOUSE_KEY = 'inventory_check_warehouse';

  // 加载扫描记录
  const loadCheckRecords = async () => {
    try {
      const savedRecords = await AsyncStorage.getItem(INVENTORY_CHECK_RECORDS_KEY);
      if (savedRecords) {
        const records = JSON.parse(savedRecords) as ScanRecord[];
        setScanRecords(records);
        
        // 恢复盘点类型和仓库
        const savedType = await AsyncStorage.getItem(INVENTORY_CHECK_TYPE_KEY);
        if (savedType) {
          setCheckType(savedType as CheckType);
        }
        
        const savedWarehouse = await AsyncStorage.getItem(INVENTORY_CHECK_WAREHOUSE_KEY);
        if (savedWarehouse) {
          const warehouse = JSON.parse(savedWarehouse);
          setCurrentWarehouse(warehouse);
        }
        
        if (records.length > 0) {
          showToast(`已恢复 ${records.length} 条盘点记录`, 'success');
        }
      }
    } catch (error) {
      console.error('[盘点] 加载记录失败:', error);
    }
  };

  // 保存扫描记录
  const saveCheckRecords = async (records: ScanRecord[], type: CheckType, warehouse?: Warehouse | null) => {
    try {
      await AsyncStorage.setItem(INVENTORY_CHECK_RECORDS_KEY, JSON.stringify(records));
      await AsyncStorage.setItem(INVENTORY_CHECK_TYPE_KEY, type);
      if (warehouse) {
        await AsyncStorage.setItem(INVENTORY_CHECK_WAREHOUSE_KEY, JSON.stringify(warehouse));
      }
    } catch (error) {
      console.error('[盘点] 保存记录失败:', error);
    }
  };

  // 清空扫描记录
  const clearCheckRecords = async () => {
    try {
      await AsyncStorage.removeItem(INVENTORY_CHECK_RECORDS_KEY);
      await AsyncStorage.removeItem(INVENTORY_CHECK_TYPE_KEY);
      await AsyncStorage.removeItem(INVENTORY_CHECK_WAREHOUSE_KEY);
    } catch (error) {
      console.error('[盘点] 清空记录失败:', error);
    }
  };

  // 拆包数量修改
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ScanRecord | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const quantityInputRef = useRef<TextInput>(null);
  
  // 数量弹窗打开时聚焦输入框
  useEffect(() => {
    if (quantityModalVisible && quantityInputRef.current) {
      setTimeout(() => quantityInputRef.current?.focus(), 300);
    }
  }, [quantityModalVisible]);

  // 已保存盘点记录
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [savedRecords, setSavedRecords] = useState<InventoryCheckRecord[]>([]);

  // Toast
  const [toastText, setToastText] = useState('');
  const [toastType, setToastType] = useState<'success' | 'warning' | 'error'>('success');
  const toastAnim = useRef(new Animated.Value(0)).current;

  // 展开状态管理
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  // 页面加载时恢复数据
  useEffect(() => {
    loadCheckRecords();
  }, []);

  // 数据变化时自动保存
  useEffect(() => {
    if (scanRecords.length > 0) {
      saveCheckRecords(scanRecords, checkType, currentWarehouse);
    } else {
      // 没有数据时清空存储
      clearCheckRecords();
    }
  }, [scanRecords, checkType, currentWarehouse]);

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
      `确定要删除 ${item.model} V${item.version || '-'} 的所有 ${item.count} 条记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const recordIds = item.records.map((r: ScanRecord) => r.id);
            const updated = scanRecords.filter(r => !recordIds.includes(r.id));
            setScanRecords(updated);
            showToast(`已删除 ${item.count} 条记录`, 'success');
          },
        },
      ]
    );
  }, [scanRecords]);

  // 初始化
  useEffect(() => {
    loadWarehouses();
    loadSavedRecords();
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, []);

  // 聚焦输入框
  useFocusEffect(
    useCallback(() => {
      setTimeout(() => inputRef.current?.focus(), 100);
    }, [])
  );

  // 加载仓库
  const loadWarehouses = async () => {
    const list = await getAllWarehouses();
    setWarehouses(list);
    const def = await getDefaultWarehouse();
    setCurrentWarehouse(def || list[0] || null);
  };

  // 加载已保存盘点记录
  const loadSavedRecords = async () => {
    const records = await getAllInventoryCheckRecords();
    setSavedRecords(records);
  };

  // Toast
  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastText(text);
    setToastType(type);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToastText(''));
    }, 1500);
  };

  // 处理扫描（带参数版本）
  const processScan = useCallback(async (code: string) => {
    if (!code || processingRef.current) return;

    if (!currentWarehouse) {
      showToast('请先选择仓库', 'error');
      feedbackError();
      console.warn('[盘点] 未选择仓库');
      return;
    }

    processingRef.current = true;

    try {
      // 解析二维码
      const rule = await detectRule(code);
      if (!rule) {
        showToast('无法识别二维码格式', 'error');
        feedbackError();
        console.error('[盘点] 无法识别二维码格式:', code);
        return;
      }

      const { standardFields } = parseWithRule(code, rule);
      const model = standardFields.model || '';
      const batch = standardFields.batch || '';
      const quantity = parseInt(standardFields.quantity || '1', 10);
      const version = standardFields.version || '';

      console.log('[盘点] 解析成功:', { model, batch, quantity, version });

      if (!model) {
        showToast('无法识别型号信息', 'error');
        feedbackError();
        console.error('[盘点] 无法识别型号信息');
        return;
      }

      // 查找存货编码
      const inventoryCode = await getInventoryCodeByModel(model);

      // 以追溯码为准检查重复（双重检测：traceCode + 清理后的原始内容）
      let isDuplicate = false;

      // 1. 根据追溯码（原始内容）判断
      const existingByCode = scanRecords.find(r => {
        const cleanedExisting = r.traceCode.trim().replace(/[\r\n\t\s]+/g, '');
        const cleanedCurrent = code.trim().replace(/[\r\n\t\s]+/g, '');
        return cleanedExisting === cleanedCurrent;
      });

      if (existingByCode) {
        isDuplicate = true;
        console.warn('[盘点] 重复检测（原始内容）');
      }

      // 2. 根据解析后的追溯码字段判断
      if (!isDuplicate && standardFields.traceNo) {
        const existingByTraceNo = scanRecords.find(r => r.traceNo === standardFields.traceNo);
        if (existingByTraceNo) {
          isDuplicate = true;
          console.warn('[盘点] 重复检测（追溯码字段）:', standardFields.traceNo);
        }
      }

      if (isDuplicate) {
        showToast('该追溯码已扫描', 'warning');
        feedbackWarning();
        return;
      }

      // 新增记录
      const newRecord: ScanRecord = {
        id: Date.now().toString(),
        traceCode: code, // 追溯码
        model,
        batch,
        quantity,
        actualQuantity: checkType === 'partial' ? quantity : undefined,
        inventoryCode: inventoryCode || undefined,
        scanTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        // 扩展字段
        package: standardFields.package || undefined,
        version: version || undefined,
        productionDate: standardFields.productionDate || undefined,
        traceNo: standardFields.traceNo || undefined,
        sourceNo: standardFields.sourceNo || undefined,
      };

      // 计算该型号+版本的累计数量（包含新记录）
      const sameModelVersionRecords = scanRecords.filter(
        r => r.model === model && r.version === version
      );
      const totalCount = sameModelVersionRecords.length + 1;
      const totalQty = sameModelVersionRecords.reduce((sum, r) => sum + r.quantity, 0) + quantity;

      setScanRecords(prev => [newRecord, ...prev]);

      showToast(`${model}`, 'success');
      feedbackSuccess();
      console.log('[盘点] 扫码成功:', { model, version, quantity, totalCount, totalQty });
    } catch (e) {
      console.error('[盘点] 处理失败:', e);
      console.error(e);
      showToast('处理失败', 'error');
      feedbackError();
    } finally {
      processingRef.current = false;
    }
  }, [currentWarehouse, scanRecords, checkType]);

  // 处理扫描（入口函数，清理换行符后调用）
  const handleScan = useCallback(async () => {
    // PDA扫码可能带有多余的字符，需要全面清理
    let code = inputValue.trim()
      .replace(/[\r\n\t\s]+/g, '')  // 清理所有空白字符（换行、回车、制表符、空格）
      .replace(/^[^A-Za-z0-9]+/, '')  // 清理开头非字母数字字符
      .replace(/[^A-Za-z0-9]+$/, ''); // 清理结尾非字母数字字符

    console.log('[盘点] 原始内容:', inputValue);
    console.log('[盘点] 清理后:', code);

    setInputValue(''); // 清空输入框
    await processScan(code);
    setTimeout(() => inputRef.current?.focus(), 100); // 增加重新聚焦延迟到 100ms
  }, [inputValue, processScan]);

  // 输入变化时自动检测并触发
  const handleInputChange = useCallback((text: string) => {
    setInputValue(text);

    // 清除之前的定时器
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
    }

    // 如果输入包含换行符，立即触发
    if (text.includes('\n') || text.includes('\r')) {
      let code = text.trim()
        .replace(/[\r\n\t\s]+/g, '')
        .replace(/^[^A-Za-z0-9]+/, '')
        .replace(/[^A-Za-z0-9]+$/, '');

      if (code) {
        setInputValue(''); // 清空输入框
        processScan(code).then(() => {
          setTimeout(() => inputRef.current?.focus(), 100);
        });
      }
      return;
    }

    // 如果PDA扫码后直接追加换行符，检测到输入停止时自动触发
    if (text.length > 0 && text.length > lastInputRef.current.length) {
      // 有新输入，设置定时器检测输入完成（延迟从 300ms 增加到 500ms）
      autoSubmitTimerRef.current = setTimeout(() => {
        let code = text.trim()
          .replace(/[\r\n\t\s]+/g, '')
          .replace(/^[^A-Za-z0-9]+/, '')
          .replace(/[^A-Za-z0-9]+$/, '');

        if (code) {
          setInputValue(''); // 清空输入框
          processScan(code).then(() => {
            setTimeout(() => inputRef.current?.focus(), 100);
          });
        }
      }, 500); // 500ms 后自动触发
    }

    lastInputRef.current = text;
  }, [processScan]);

  // 选择仓库
  const selectWarehouse = (wh: Warehouse) => {
    setCurrentWarehouse(wh);
    setShowWarehousePicker(false);
    showToast(wh.name, 'success');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 打开数量修改弹窗
  const openQuantityModal = (record: ScanRecord) => {
    setEditingRecord(record);
    setQuantityInput(record.actualQuantity?.toString() || record.quantity.toString());
    setQuantityModalVisible(true);
  };

  // 确认修改数量（支持回车和按钮）
  const handleConfirmQuantity = () => {
    if (!editingRecord) return;

    const qty = parseInt(quantityInput, 10);
    if (isNaN(qty) || qty < 0) {
      showToast('请输入有效数量', 'warning');
      return;
    }

    setScanRecords(prev =>
      prev.map(r => r.id === editingRecord.id ? { ...r, actualQuantity: qty } : r)
    );
    setQuantityModalVisible(false);
    setEditingRecord(null);
    showToast(`已修改为 ${qty}`, 'success');
    feedbackSuccess();
  };

  // 确认盘点
  const handleSaveInventory = async () => {
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

    try {
      const checkNo = await generateCheckNo();
      const today = new Date().toISOString().slice(0, 10);

      for (const record of scanRecords) {
        await addInventoryCheckRecord({
          check_no: checkNo,
          warehouse_id: currentWarehouse.id,
          warehouse_name: currentWarehouse.name,
          inventory_code: record.inventoryCode || '',
          scan_model: record.model,
          batch: record.batch,
          quantity: checkType === 'partial' ? (record.actualQuantity || record.quantity) : record.quantity,
          check_type: checkType,
          actual_quantity: checkType === 'partial' ? record.actualQuantity : undefined,
          check_date: today,
          notes: record.traceCode, // 保存追溯码到备注
          // 扩展字段
          package: record.package,
          version: record.version,
          productionDate: record.productionDate,
          traceNo: record.traceNo,
          sourceNo: record.sourceNo,
        });
      }

      showToast(`盘点成功！共 ${scanRecords.length} 条`, 'success');
      feedbackSuccess();
      setScanRecords([]);
      loadSavedRecords(); // 刷新已保存记录
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败', 'error');
      feedbackError();
    }
  };

  // 清空记录
  const handleClearRecords = () => {
    if (scanRecords.length === 0) return;
    setScanRecords([]);
    showToast('已清空', 'warning');
    feedbackWarning();
  };

  // 按型号+版本号分组显示（用于列表渲染）
  const groupedRecords = useMemo(() => {
    const groups: { [key: string]: ScanRecord[] } = {};
    scanRecords.forEach(r => {
      const key = `${r.model}|${r.version || ''}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(r);
    });
    return groups;
  }, [scanRecords]);

  // 计算每个型号+版本的累计数量
  const modelVersionTotals = useMemo(() => {
    const totals: { [key: string]: { qty: number; actualQty: number; count: number } } = {};
    scanRecords.forEach(r => {
      const key = `${r.model}|${r.version || ''}`;
      if (!totals[key]) {
        totals[key] = { qty: 0, actualQty: 0, count: 0 };
      }
      totals[key].qty += r.quantity;
      totals[key].actualQty += r.actualQuantity !== undefined ? r.actualQuantity : r.quantity;
      totals[key].count += 1;
    });
    return totals;
  }, [scanRecords]);

  // 计算总数量
  const totalQuantity = useMemo(() => {
    return Object.values(modelVersionTotals).reduce((sum, t) => {
      return sum + (checkType === 'partial' ? t.actualQty : t.qty);
    }, 0);
  }, [modelVersionTotals, checkType]);

  // 聚合显示数据（按型号+版本号聚合）
  const aggregatedRecords = useMemo(() => {
    const map = new Map<string, { records: ScanRecord[], totalQuantity: number, actualTotalQuantity: number }>();
    
    scanRecords.forEach(record => {
      const key = `${record.model}|${record.version || ''}`;
      if (!map.has(key)) {
        map.set(key, { records: [], totalQuantity: 0, actualTotalQuantity: 0 });
      }
      const group = map.get(key)!;
      group.records.push(record);
      group.totalQuantity += record.quantity;
      group.actualTotalQuantity += record.actualQuantity !== undefined ? record.actualQuantity : record.quantity;
    });
    
    return Array.from(map.entries()).map(([key, group]) => {
      const [model, version] = key.split('|');
      return {
        model,
        version: version || '',
        records: group.records,
        totalQuantity: group.totalQuantity,
        actualTotalQuantity: group.actualTotalQuantity,
        count: group.records.length,
      };
    });
  }, [scanRecords]);

  // 按型号分组的统计（用于已保存记录Modal）
  const savedGroupByModel = useMemo(() => {
    const groups: { [model: string]: { totalQty: number; lastDate: string; count: number } } = {};
    savedRecords.forEach(r => {
      if (!groups[r.scan_model]) {
        groups[r.scan_model] = { totalQty: 0, lastDate: r.check_date, count: 0 };
      }
      groups[r.scan_model].totalQty += r.quantity;
      groups[r.scan_model].count += 1;
      // 更新最新日期
      if (r.check_date > groups[r.scan_model].lastDate) {
        groups[r.scan_model].lastDate = r.check_date;
      }
    });
    return groups;
  }, [savedRecords]);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>库存盘点</Text>
        </View>

        {/* 顶栏：盘点类型 + 仓库 */}
        <View style={styles.topBar}>
          {/* 盘点类型选择 */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeBtn, checkType === 'whole' && styles.typeBtnActive]}
              onPress={() => {
                setCheckType('whole');
                setScanRecords([]);
              }}
            >
              <FontAwesome6 name="box" size={12} color={checkType === 'whole' ? theme.white : theme.textSecondary} />
              <Text style={[styles.typeBtnText, checkType === 'whole' && styles.typeBtnTextActive]}>整包</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, checkType === 'partial' && styles.typeBtnActive]}
              onPress={() => {
                setCheckType('partial');
                setScanRecords([]);
              }}
            >
              <FontAwesome6 name="layer-group" size={12} color={checkType === 'partial' ? theme.white : theme.textSecondary} />
              <Text style={[styles.typeBtnText, checkType === 'partial' && styles.typeBtnTextActive]}>拆包</Text>
            </TouchableOpacity>
          </View>

          {/* 已保存按钮 */}
          <TouchableOpacity style={styles.savedBtn} onPress={() => setSavedModalVisible(true)}>
            <Feather name="check-circle" size={14} color={theme.textPrimary} />
            <Text style={styles.savedBtnText}>{Object.keys(savedGroupByModel).length}</Text>
          </TouchableOpacity>

          {/* 仓库选择 */}
          <TouchableOpacity style={styles.warehouseBtn} onPress={() => setShowWarehousePicker(true)}>
            <FontAwesome6 name="warehouse" size={12} color={theme.textPrimary} />
            <Text style={styles.warehouseText} numberOfLines={1}>
              {currentWarehouse?.name || '仓库'}
            </Text>
            <FontAwesome6 name="chevron-down" size={10} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 扫码输入 */}
        <View style={styles.scanBox}>
          <TextInput
            ref={inputRef}
            style={styles.scanInput}
            value={inputValue}
            onChangeText={handleInputChange}
            onSubmitEditing={handleScan}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={false}
            showSoftInputOnFocus={true}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>

        {/* Toast */}
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

        {/* 物料列表 */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>扫描记录</Text>
            <Text style={styles.listCount}>
              {scanRecords.length} 条 / {totalQuantity} PCS
            </Text>
          </View>
          <ScrollView style={styles.list}>
            {aggregatedRecords.map((item) => {
              const key = `${item.model}|${item.version}`;
              const isExpanded = expandedGroups.has(key);

              return (
                <View key={key} style={styles.itemContainer}>
                  {/* 聚合项 */}
                  <TouchableOpacity
                    style={styles.item}
                    onLongPress={() => handleDeleteGroup(item)}
                    delayLongPress={500}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemLeft}>
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
                      {checkType === 'partial' ? (
                        <>
                          <View style={styles.quantityRow}>
                            <Text style={styles.itemQtyLabel}>标签:</Text>
                            <Text style={styles.itemQty}>{item.totalQuantity.toLocaleString()}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.actualRow}
                            onPress={() => openQuantityModal(item.records[0])}
                          >
                            <Text style={styles.actualLabel}>实际:</Text>
                            <Text style={styles.actualQty}>{item.actualTotalQuantity.toLocaleString()}</Text>
                            <Feather name="edit-3" size={12} color={theme.accent} style={{ marginLeft: Spacing.xs }} />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Text style={styles.itemQty}>
                          {item.totalQuantity.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* 展开的明细 */}
                  {isExpanded && (
                    <View style={styles.detailsContainer}>
                      {item.records.map((record) => (
                        <TouchableOpacity
                          key={record.id}
                          style={styles.detailItem}
                          onLongPress={() => handleDeleteRecord(record.id)}
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
                <Text style={styles.clearBtnText}>清空</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveInventory}>
                <Text style={styles.submitBtnText}>确认盘点</Text>
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

        {/* 拆包数量修改弹窗 */}
        <Modal
          visible={quantityModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setQuantityModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setQuantityModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>修改实际数量</Text>
              {editingRecord && (
                <>
                  <Text style={styles.modalInfo}>
                    型号: {editingRecord.model}
                  </Text>
                  <Text style={styles.modalInfo}>
                    标签数量: {editingRecord.quantity}
                  </Text>
                  <TextInput
                    ref={quantityInputRef}
                    style={styles.modalInput}
                    value={quantityInput}
                    onChangeText={setQuantityInput}
                    onSubmitEditing={handleConfirmQuantity}
                    placeholder="实际数量"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    autoFocus={false}
                    showSoftInputOnFocus={true}
                    returnKeyType="done"
                    blurOnSubmit={false}
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => setQuantityModalVisible(false)}
                    >
                      <Text style={styles.modalCancelText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmQuantity}>
                      <Text style={styles.modalConfirmText}>确认</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* 已保存盘点记录弹窗 */}
        <Modal
          visible={savedModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSavedModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSavedModalVisible(false)}
          >
            <View style={styles.savedModalContent}>
              <View style={styles.savedModalHeader}>
                <Text style={styles.savedModalTitle}>已保存盘点</Text>
                <TouchableOpacity onPress={() => setSavedModalVisible(false)}>
                  <Feather name="x" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              
              {Object.keys(savedGroupByModel).length === 0 ? (
                <View style={styles.savedEmpty}>
                  <Text style={styles.savedEmptyText}>暂无盘点记录</Text>
                </View>
              ) : (
                <ScrollView style={styles.savedList}>
                  {Object.entries(savedGroupByModel).map(([model, data]) => (
                    <View key={model} style={styles.savedItem}>
                      <View style={styles.savedItemLeft}>
                        <Text style={styles.savedModel}>{model}</Text>
                        <Text style={styles.savedDate}>{data.lastDate}</Text>
                      </View>
                      <View style={styles.savedItemRight}>
                        <Text style={styles.savedQty}>{data.totalQty} PCS</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Screen>
  );
}
