import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { parseQRCodeSync, isQRCode } from '@/utils/qrcodeParser';
import {
  initDatabase,
  upsertOrder,
  addMaterial,
  getOrder,
  detectRule,
  parseWithRule,
  checkMaterialExists,
  searchMaterials,
  getInventoryCodeByModel,
  deleteMaterial,
  Warehouse,
  getAllWarehouses,
  getDefaultWarehouse,
} from '@/utils/database';
import { STORAGE_KEYS } from '@/constants/config';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Spacing } from '@/constants/theme';
import { Feather, FontAwesome6 } from '@expo/vector-icons';
import { feedbackSuccess, feedbackError, feedbackWarning, feedbackDuplicate, feedbackNewOrder, feedbackSwitchOrder, initSoundSetting, useFeedbackCleanup } from '@/utils/feedback';
import { useToast } from '@/utils/toast';
import { getISODateTime } from '@/utils/time';

// 订单号格式：IO-年-月-日-序号（序号2-3位）
const ORDER_NO_REGEX = /^IO-\d{4}-\d{2}-\d{2}-\d{2,3}$/;

interface MaterialItem {
  id: string;
  model: string;
  batch: string;
  quantity: string;
  scannedAt: Date;
  version?: string;
  traceNo?: string;
  sourceNo?: string;
  package?: string;
  productionDate?: string;
  customFields?: Record<string, string>;
}

interface AggregatedGroup {
  key: string; // model + version
  model: string;
  version: string;
  totalQuantity: number;
  boxCount: number;
  items: MaterialItem[]; // 所有items，用于聚合总数量和显示
}

export default function PDAScanScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();

  // 初始化声音设置
  useEffect(() => {
    initSoundSetting();
  }, []);

  // 输入
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState('');
  const processingRef = useRef(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 扫码队列 - 暂存处理中的新扫码
  const scanQueueRef = useRef<string[]>([]);

  // 仓库
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);

  // 当前订单
  const [orderNo, setOrderNo] = useState('');
  const [materialCount, setMaterialCount] = useState(0);

  // 物料列表（最近5条）
  const [materials, setMaterials] = useState<MaterialItem[]>([]);

  // 聚合展开状态（记录哪些聚合组是展开的）
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Toast
  const { showToast, ToastContainer } = useToast();

  // 初始化
  useEffect(() => {
    initDatabase().catch(console.error);
    loadWarehouses();
    loadOutboundState();
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, []);

  // 加载扫码出库持久化状态（订单号、仓库、扫码记录）
  const loadOutboundState = async () => {
    try {
      // 1. 加载订单号
      const savedOrderNo = await AsyncStorage.getItem(STORAGE_KEYS.OUTBOUND_ORDER_NO);
      if (savedOrderNo) {
        setOrderNo(savedOrderNo);
        
        // 加载该订单的物料（数据库 + 扫码记录合并）
        const list = await searchMaterials({ orderNo: savedOrderNo });
        const dbMaterials = list.slice().reverse().map(m => ({
          id: m.id,
          model: m.model,
          batch: m.batch,
          quantity: m.quantity,
          scannedAt: new Date(m.scanned_at),
          version: m.version,
          traceNo: m.traceNo,
          sourceNo: m.sourceNo,
          package: m.package,
          productionDate: m.productionDate,
          customFields: m.customFields,
        }));
        
        // 2. 加载扫码记录（内存中的临时记录）
        const savedScanRecords = await AsyncStorage.getItem(STORAGE_KEYS.OUTBOUND_SCAN_RECORDS);
        let scanRecords: MaterialItem[] = [];
        if (savedScanRecords) {
          scanRecords = JSON.parse(savedScanRecords) as MaterialItem[];
          // 将字符串日期转回 Date 对象
          scanRecords = scanRecords.map(r => ({
            ...r,
            scannedAt: new Date(r.scannedAt),
          }));
        }
        
        // 合并数据库记录和扫码记录
        const merged = await mergeMaterialsWithScanRecords(dbMaterials, scanRecords);
        setMaterials(merged);
        setMaterialCount(merged.length);
      } else {
        // 3. 只有扫码记录（没有订单号时也加载）
        const savedScanRecords = await AsyncStorage.getItem(STORAGE_KEYS.OUTBOUND_SCAN_RECORDS);
        if (savedScanRecords) {
          const scanRecords = JSON.parse(savedScanRecords) as MaterialItem[];
          const recordsWithDate = scanRecords.map(r => ({
            ...r,
            scannedAt: new Date(r.scannedAt),
          }));
          setMaterials(recordsWithDate);
          setMaterialCount(recordsWithDate.length);
        }
      }
    } catch (error) {
      console.error('[扫码出库] 加载持久化状态失败:', error);
    }
  };

  // 保存扫码出库状态
  const saveOutboundState = async () => {
    try {
      // 保存订单号
      if (orderNo) {
        await AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_ORDER_NO, orderNo);
      }
      // 保存扫码记录
      await AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_SCAN_RECORDS, JSON.stringify(materials));
    } catch (error) {
      console.error('[扫码出库] 保存状态失败:', error);
    }
  };

  // 自动清理震动和提示音
  useFeedbackCleanup();
  useFocusEffect(
    useCallback(() => {
      setTimeout(() => inputRef.current?.focus(), 100);
    }, [])
  );

  // 加载仓库
  const loadWarehouses = async () => {
    const list = await getAllWarehouses();
    setWarehouses(list);
    
    // 尝试恢复之前选择的仓库
    const savedWarehouse = await AsyncStorage.getItem(STORAGE_KEYS.OUTBOUND_WAREHOUSE);
    if (savedWarehouse) {
      const warehouse = JSON.parse(savedWarehouse) as Warehouse;
      // 确保仓库仍然存在
      if (list.find(w => w.id === warehouse.id)) {
        setCurrentWarehouse(warehouse);
        return;
      }
    }
    
    // 没有保存的选择，使用默认仓库
    const def = await getDefaultWarehouse();
    setCurrentWarehouse(def || list[0] || null);
  };

  // 切换仓库
  const handleWarehouseChange = async (warehouse: Warehouse) => {
    // 先保存当前仓库的状态
    if (orderNo) {
      await AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_ORDER_NO, orderNo);
    }
    
    // 切换仓库
    setCurrentWarehouse(warehouse);
    AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_WAREHOUSE, JSON.stringify(warehouse));
    
    // 清空当前扫码记录（新仓库从零开始）
    setOrderNo('');
    setMaterials([]);
    setMaterialCount(0);
    await AsyncStorage.removeItem(STORAGE_KEYS.OUTBOUND_ORDER_NO);
    
    // 清空展开状态
    setExpandedGroups(new Set());
  };

  // 加载订单物料（从数据库加载已保存的记录）
  const loadOrderMaterials = async (no: string) => {
    const list = await searchMaterials({ orderNo: no });
    setMaterialCount(list.length);
    // 加载全部数据用于聚合，显示时限制10行
    // 注意：使用 slice().reverse() 避免修改原数组
    setMaterials(
      list.slice().reverse().map(m => ({
        id: m.id,
        model: m.model,
        batch: m.batch,
        quantity: m.quantity,
        scannedAt: new Date(m.scanned_at),
        version: m.version,
        traceNo: m.traceNo,
        sourceNo: m.sourceNo,
        package: m.package,
        productionDate: m.productionDate,
        customFields: m.customFields,
      }))
    );
  };

  // 合并加载：数据库记录 + 内存中的临时扫码记录
  const mergeMaterialsWithScanRecords = async (dbMaterials: MaterialItem[], scanRecords: MaterialItem[]): Promise<MaterialItem[]> => {
    // 从扫码记录中过滤出属于当前订单的记录（通过id判断：数据库记录有真实id，临时记录也有id）
    const merged = [...dbMaterials];
    
    // 添加扫码记录中不重复的项（基于 id + traceNo 组合判断）
    scanRecords.forEach(record => {
      const exists = merged.some(m => 
        (m.traceNo && m.traceNo === record.traceNo) || 
        (record.id && m.id === record.id)
      );
      if (!exists) {
        merged.unshift(record);
      }
    });
    
    return merged;
  };

  // 处理扫描（带参数版本）
  const processScan = useCallback(async (code: string) => {
    if (!code || processingRef.current) return;

    // 如果当前没有订单号，扫描内容必须是订单号格式
    if (!orderNo && !ORDER_NO_REGEX.test(code)) {
      showToast('请先扫描订单\n格式: IO-年-月-日-序号', 'error');
      feedbackError();
      return;
    }

    processingRef.current = true;

    try {
      // 判断是否是订单号格式
      if (ORDER_NO_REGEX.test(code)) {
        // 切换/新建订单
        const existing = await getOrder(code);
        setMaterials([]); // 清空当前列表
        setMaterialCount(0);
        setOrderNo(code);
        // 保存订单号到持久化存储
        AsyncStorage.setItem(STORAGE_KEYS.OUTBOUND_ORDER_NO, code);

        if (existing) {
          await loadOrderMaterials(code);
          showToast(`切换订单: ${code}`, 'warning');
          feedbackSwitchOrder();
        } else {
          showToast('新订单', 'success');
          feedbackNewOrder();
        }
        return;
      }

      // 物料扫描
      if (!orderNo) {
        showToast('请先扫描订单', 'warning');
        feedbackWarning();
        return;
      }

      if (!currentWarehouse) {
        showToast('请选择仓库', 'warning');
        feedbackWarning();
        setShowWarehousePicker(true);
        return;
      }

      // 解析
      let parsed: {
        model: string;
        batch: string;
        quantity: string;
        traceNo?: string;
        sourceNo?: string;
        package?: string;
        version?: string;
        productionDate?: string;
        separator?: string;
      } | null = null;

      // 保存扫码时使用的分隔符和规则名称
      let separator = ',';
      let ruleName = '';
      let customFields: Record<string, string> = {};

      try {
        const rule = await detectRule(code);
        if (rule) {
          separator = rule.separator || ',';
          ruleName = rule.name || '';
          const { standardFields, customFields: parsedCustomFields } = parseWithRule(code, rule);
          parsed = {
            model: standardFields.model || '',
            batch: standardFields.batch || '',
            quantity: standardFields.quantity || '',
            traceNo: standardFields.traceNo,
            sourceNo: standardFields.sourceNo,
            package: standardFields.package,
            version: standardFields.version,
            productionDate: standardFields.productionDate,
          };
          customFields = parsedCustomFields || {};
        }
        // 静默失败，走兜底逻辑 parseQRCodeSync
      } catch (e) {}

      if (!parsed) {
        // 兜底：使用 qrcodeParser 的同步解析（不依赖数据库）
        const fallback = parseQRCodeSync(code);
        if (fallback) {
          parsed = {
            model: fallback.model,
            batch: fallback.batch,
            quantity: fallback.quantity,
            traceNo: fallback.traceNo,
            sourceNo: fallback.sourceNo,
            package: fallback.package,
            version: fallback.version,
            productionDate: fallback.productionDate,
          };
        }
      }

      if (!parsed) {
        showToast('无法识别', 'error');
        feedbackError();
        return;
      }

      // 检查重复
      const check = await checkMaterialExists(orderNo, parsed.model, parsed.batch, parsed.sourceNo, parsed.traceNo, parsed.quantity);
      if (check.material) {
        showToast('⚠️ 该物料已扫码，请勿重复', 'warning');
        feedbackDuplicate();
        return;
      }

      // 查找存货编码
      const inventoryCode = await getInventoryCodeByModel(parsed.model || '');

      // 保存并获取真实ID
      const materialId = await addMaterial({
        order_no: orderNo,
        customer_name: '',
        model: parsed.model || '',
        batch: parsed.batch || '',
        quantity: parsed.quantity || '',
        traceNo: parsed.traceNo,
        sourceNo: parsed.sourceNo,
        package: parsed.package,
        version: parsed.version,
        productionDate: parsed.productionDate,
        raw_content: code,
        separator: separator,
        rule_name: ruleName,
        customFields: customFields,
        scanned_at: getISODateTime(),
        warehouse_id: currentWarehouse.id,
        warehouse_name: currentWarehouse.name,
        inventory_code: inventoryCode || '',
      });

      await upsertOrder(orderNo, '', { id: currentWarehouse.id, name: currentWarehouse.name });

      // 更新列表（使用数据库返回的真实ID）
      const newItem: MaterialItem = {
        id: materialId,
        model: parsed.model || '',
        batch: parsed.batch || '',
        quantity: parsed.quantity || '',
        scannedAt: new Date(),
        version: parsed.version,
        traceNo: parsed.traceNo,
        sourceNo: parsed.sourceNo,
        package: parsed.package,
        productionDate: parsed.productionDate,
        customFields: customFields,
      };
      // 新增物料：追加到列表前面，不限制数量（聚合需要基于全部数据）
      setMaterials(prev => [newItem, ...prev]);
      setMaterialCount(prev => prev + 1);
      // 保存扫码记录到持久化存储
      await saveOutboundState();
      showToast(`${parsed.model} +1`, 'success');
      feedbackSuccess();

    } catch (e) {
      console.error('[扫码出库] 处理失败:', e);
      console.error(e);
      showToast('错误', 'error');
      feedbackError();
    } finally {
      processingRef.current = false;
      // 处理完成后，检查队列是否有待处理的扫码
      setTimeout(() => {
        if (scanQueueRef.current.length > 0) {
          const nextCode = scanQueueRef.current.shift();
          if (nextCode) {
            processScan(nextCode);
          }
        } else {
          // 队列空了，重新聚焦输入框
          inputRef.current?.focus();
        }
      }, 0);
    }
  }, [orderNo, currentWarehouse]);

  // 聚合物料（按型号+版本）
  const aggregateMaterials = useMemo(() => {
    const groups: AggregatedGroup[] = [];
    const map = new Map<string, AggregatedGroup>();

    materials.forEach(item => {
      const key = `${item.model}_${item.version || ''}`;
      
      if (!map.has(key)) {
        map.set(key, {
          key,
          model: item.model,
          version: item.version || '',
          totalQuantity: parseInt(item.quantity, 10) || 0,
          boxCount: 1,
          items: [item],
        });
      } else {
        const group = map.get(key)!;
        group.totalQuantity += parseInt(item.quantity, 10) || 0;
        group.boxCount += 1;
        group.items.push(item);
      }
    });

    return Array.from(map.values());
  }, [materials]);

  // 切换展开/折叠
  const toggleExpand = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 删除聚合组（所有箱）
  const handleDeleteGroup = useCallback((group: AggregatedGroup) => {
    Alert.alert(
      '确认删除',
      `确定要删除 ${group.model} 的所有 ${group.boxCount} 箱物料吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              // 删除所有物料
              await Promise.all(group.items.map(item => deleteMaterial(item.id)));
              // 刷新列表
              if (orderNo) {
                await loadOrderMaterials(orderNo);
              }
              showToast(`已删除 ${group.boxCount} 箱物料`, 'success');
            } catch (error) {
              console.error('删除失败:', error);
              showToast('删除失败', 'error');
            }
          },
        },
      ]
    );
  }, [orderNo, loadOrderMaterials]);

  // 删除单个物料
  const handleDeleteItem = useCallback((item: MaterialItem) => {
    Alert.alert(
      '确认删除',
      `确定要删除这条物料吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMaterial(item.id);
              // 刷新列表
              if (orderNo) {
                await loadOrderMaterials(orderNo);
              }
              showToast('已删除物料', 'success');
            } catch (error) {
              console.error('删除失败:', error);
              showToast('删除失败', 'error');
            }
          },
        },
      ]
    );
  }, [orderNo, loadOrderMaterials]);

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
      return;
    }

    
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
          // 订单号格式直接处理，跳过一维码过滤
          if (ORDER_NO_REGEX.test(code)) {
            setInputValue(''); // 清空输入框
            processScan(code);
            return;
          }
          // 一维码过滤：不含分隔符的扫码静默忽略
          if (!isQRCode(code)) {
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

    // 订单号格式直接处理，跳过一维码过滤
    if (ORDER_NO_REGEX.test(code)) {
      setInputValue('');
      processScan(code);
      return;
    }

    // 一维码过滤：不含分隔符的扫码静默忽略
    if (!isQRCode(code)) {
      setInputValue('');
      inputRef.current?.focus();
      return;
    }

    setInputValue('');
    processScan(code);
  }, [inputValue, processScan]);

  // 选择仓库
  const selectWarehouse = async (wh: Warehouse) => {
    // 如果选择的是当前仓库，直接关闭弹窗
    if (wh.id === currentWarehouse?.id) {
      setShowWarehousePicker(false);
      return;
    }

    // B: 清空当前页面数据（订单号与仓库绑定，不同仓库序号位数不同）
    setOrderNo('');
    setMaterialCount(0);
    setMaterials([]);
    setExpandedGroups(new Set());
    
    // 清理持久化存储
    await AsyncStorage.removeItem(STORAGE_KEYS.OUTBOUND_ORDER_NO);
    await AsyncStorage.removeItem(STORAGE_KEYS.OUTBOUND_SCAN_RECORDS);

    // 切换到新仓库
    handleWarehouseChange(wh);
    setShowWarehousePicker(false);
    showToast(`已切换到 ${wh.name}`, 'success');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={28} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>扫码出库</Text>
        </View>

        {/* 顶部：仓库 + 订单 */}
        <View style={[styles.topBar]}>
          <TouchableOpacity style={styles.warehouseBtn} onPress={() => setShowWarehousePicker(true)}>
            <FontAwesome6 name="warehouse" size={14} color={theme.textPrimary} />
            <Text style={styles.warehouseText} numberOfLines={1}>
              {currentWarehouse?.name || '仓库'}
            </Text>
            <FontAwesome6 name="chevron-down" size={10} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={[styles.orderTag, orderNo && styles.orderTagActive]}>
            <Text style={[styles.orderText, orderNo && styles.orderTextActive]}>{orderNo || '待扫描订单'}</Text>
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
            showSoftInputOnFocus={false}
          />
          
          {/* Toast */}
          <ToastContainer />
        </View>

        {/* 物料列表 */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>物料列表</Text>
            <Text style={styles.listCount}>共 {materialCount} 条</Text>
          </View>
          <ScrollView style={styles.list}>
            {aggregateMaterials.map(group => {
              const isExpanded = expandedGroups.has(group.key);
              return (
                <View key={group.key}>
                  {/* 聚合项（两行布局） */}
                  <TouchableOpacity
                    style={styles.itemRow}
                    onPress={() => toggleExpand(group.key)}
                    onLongPress={() => handleDeleteGroup(group)}
                    delayLongPress={500}
                  >
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemModel}>
                        {isExpanded ? '▼' : '▶'} {group.model}
                      </Text>
                      <Text style={styles.itemBatch}>
                        版本: {group.version || '-'}
                      </Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemQty}>
                        {group.totalQuantity.toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 展开的明细 */}
                  {isExpanded && (
                    <View style={styles.detailsContainer}>
                      {group.items.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.detailItem}
                          onLongPress={() => handleDeleteItem(item)}
                          delayLongPress={500}
                        >
                          <Text style={styles.detailText}>
                            批次: {item.batch || '-'}  |  生产日期: {item.productionDate || '-'}  |  数量: {parseInt(item.quantity, 10) || 0} PCS
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            {materials.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>暂无物料</Text>
              </View>
            )}
          </ScrollView>
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
                  {currentWarehouse?.id === wh.id && <FontAwesome6 name="check" size={14} color={theme.primary} />}
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
