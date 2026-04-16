import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as XLSX from 'xlsx';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { AnimatedCard } from '@/components/AnimatedCard';
import { CustomAlert } from '@/components/CustomAlert';
import { EditMaterialModal } from '@/components/EditMaterialModal';
import { UnpackModal } from '@/components/UnpackModal';
import {
  initDatabase,
  upsertOrder,
  getAllOrders,
  getStatistics,
  deleteOrder,
  getMaterialsByOrder,
  deleteMaterial,
  getAllMaterials,
  addUnpackRecord,
  getNextUnpackIndex,
  getUnpackHistoryByMaterialId,
  getAllUnpackRecords,
  searchMaterials,
  updateMaterial,
  Order,
  MaterialRecord,
  UnpackRecord,
} from '@/utils/database';
import { STORAGE_KEYS, SyncConfig, NETWORK_CONFIG } from '@/constants/config';
import { formatDate, formatDateTime, getToday } from '@/utils/time';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Spacing, BorderRadius, BorderWidth } from '@/constants/theme';
import { rf } from '@/utils/responsive';
import { summarizeMaterials, MaterialSummary } from '@/utils/orders';

// ============ 类型定义 ============
type SearchType = 'order' | 'customer' | 'batch';

interface CustomAlertConfig {
  visible: boolean;
  title: string;
  message: string;
  icon?: 'success' | 'warning' | 'error' | 'info';
  buttons: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[];
}

// ============ 主组件 ============
export default function OrdersScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ orderNo?: string; materialId?: number }>();

  // ============ 状态 ============
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('order');
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalMaterials: 0,
    totalQuantity: 0,
    todayOrders: 0,
    todayMaterials: 0,
    todayQuantity: 0,
  });

  // 展开的订单
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedMaterials, setExpandedMaterials] = useState<MaterialRecord[]>([]);
  const expandedOrderIdRef = useRef<string | null>(null);

  // 跳转到展开订单
  const pendingExpandOrderNo = useRef<string | null>(null);
  const pendingMaterialId = useRef<number | null>(null);

  useEffect(() => {
    expandedOrderIdRef.current = expandedOrderId;
  }, [expandedOrderId]);

  // 自定义弹窗
  const [customAlert, setCustomAlert] = useState<CustomAlertConfig>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showCustomAlert = useCallback((title: string, message: string, buttons: CustomAlertConfig['buttons'], icon?: CustomAlertConfig['icon']) => {
    setCustomAlert({ visible: true, title, message, buttons, icon });
  }, []);

  const closeCustomAlert = useCallback(() => {
    setCustomAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  // 编辑客户名称弹窗
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const customerNameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (editModalVisible && customerNameInputRef.current) {
      setTimeout(() => customerNameInputRef.current?.focus(), 300);
    }
  }, [editModalVisible]);

  // 所有订单弹窗
  const [allOrdersModalVisible, setAllOrdersModalVisible] = useState(false);
  const [showTodayOrdersOnly, setShowTodayOrdersOnly] = useState(false);

  // 物料汇总弹窗
  const [materialsModalVisible, setMaterialsModalVisible] = useState(false);
  const [materialSummaries, setMaterialSummaries] = useState<MaterialSummary[]>([]);
  const [materialTotalQuantity, setMaterialTotalQuantity] = useState(0);
  const [showTodayOnly, setShowTodayOnly] = useState(false);

  // 物料详情弹窗
  const [materialDetailModalVisible, setMaterialDetailModalVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedModelMaterials, setSelectedModelMaterials] = useState<MaterialRecord[]>([]);

  // 拆包弹窗
  const [unpackModalVisible, setUnpackModalVisible] = useState(false);
  const [unpackingMaterial, setUnpackingMaterial] = useState<MaterialRecord | null>(null);
  const [unpackNewQuantity, setUnpackNewQuantity] = useState('');
  const [unpackNewTraceNo, setUnpackNewTraceNo] = useState('');
  const [unpackNotes, setUnpackNotes] = useState('');
  const [unpacking, setUnpacking] = useState(false);
  const [unpackHistory, setUnpackHistory] = useState<UnpackRecord[]>([]);
  const [nextUnpackIndex, setNextUnpackIndex] = useState(1);

  // 编辑物料弹窗
  const [editMaterialModalVisible, setEditMaterialModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialRecord | null>(null);
  const [editMaterialData, setEditMaterialData] = useState({
    model: '',
    batch: '',
    quantity: '',
    package: '',
    version: '',
    productionDate: '',
    traceNo: '',
    sourceNo: '',
  });
  const [savingMaterial, setSavingMaterial] = useState(false);

  // 同步配置
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({ ip: '', port: '8080' });
  const [syncing, setSyncing] = useState(false);

  // ============ 数据加载 ============
  const loadSyncConfig = useCallback(async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_CONFIG);
    if (saved) setSyncConfig(JSON.parse(saved));
  }, []);

  useFocusEffect(useCallback(() => { loadSyncConfig(); }, [loadSyncConfig]));

  const loadData = useCallback(async () => {
    try {
      const [ordersData, statsData] = await Promise.all([getAllOrders(), getStatistics()]);
      const sortedOrders = [...ordersData].sort((a, b) => b.order_no.localeCompare(a.order_no, undefined, { numeric: true }));
      setOrders(sortedOrders);
      setFilteredOrders(sortedOrders);
      setStats(statsData);

      const currentExpandedId = expandedOrderIdRef.current;
      if (currentExpandedId) {
        const expandedOrder = sortedOrders.find((o) => o.id === currentExpandedId);
        if (expandedOrder) {
          const materials = await getMaterialsByOrder(expandedOrder.order_no);
          setExpandedMaterials(materials);
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, []);

  const initDB = useCallback(async () => {
    try { await initDatabase(); } catch (error) { console.error('数据库初始化失败:', error); }
  }, []);

  useFocusEffect(useCallback(() => {
    initDB();
    loadData();
  }, [initDB, loadData]));

  useEffect(() => {
    if (params.orderNo && orders.length > 0) {
      const targetOrder = orders.find((o) => o.order_no === params.orderNo);
      if (targetOrder && targetOrder.id !== expandedOrderId) {
        setExpandedOrderId(targetOrder.id);
        getMaterialsByOrder(targetOrder.order_no).then(setExpandedMaterials);
      }
    }
  }, [params.orderNo, orders]);

  // ============ 搜索过滤 ============
  const handleSearch = useCallback(async (text: string) => {
    setSearchText(text);
    if (!text.trim()) { setFilteredOrders(orders); return; }

    const lowerText = text.toLowerCase();

    if (searchType === 'batch') {
      try {
        const materials = await searchMaterials({ batch: text });
        const orderNos = new Set(materials.map((m) => m.order_no));
        const filtered = orders.filter((order) => orderNos.has(order.order_no));
        setFilteredOrders(filtered.sort((a, b) => b.order_no.localeCompare(a.order_no, undefined, { numeric: true })));
      } catch (error) {
        console.error('批次搜索失败:', error);
        setFilteredOrders([]);
      }
    } else if (searchType === 'customer') {
      const filtered = orders.filter((order) => order.customer_name?.toLowerCase().includes(lowerText));
      setFilteredOrders(filtered.sort((a, b) => b.order_no.localeCompare(a.order_no, undefined, { numeric: true })));
    } else {
      const filtered = orders.filter((order) => order.order_no.toLowerCase().includes(lowerText));
      setFilteredOrders(filtered.sort((a, b) => b.order_no.localeCompare(a.order_no, undefined, { numeric: true })));
    }
  }, [orders, searchType]);

  const handleSearchTypeChange = useCallback((type: SearchType) => {
    setSearchType(type);
    if (searchText.trim()) handleSearch(searchText);
  }, [searchText, handleSearch]);

  // ============ 订单操作 ============
  const handleToggleOrder = async (order: Order) => {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
      setExpandedMaterials([]);
    } else {
      setExpandedOrderId(order.id);
      const materials = await getMaterialsByOrder(order.order_no);
      setExpandedMaterials(materials);
    }
  };

  const handleViewMaterial = (material: MaterialRecord) => {
    router.push('/detail', { id: material.id });
  };

  const handleEditCustomer = (order: Order) => {
    setEditingOrder(order);
    setEditCustomerName(order.customer_name || '');
    setEditModalVisible(true);
  };

  const handleSaveCustomer = async () => {
    if (!editingOrder) return;
    try {
      await upsertOrder(editingOrder.order_no, editCustomerName.trim());
      setEditModalVisible(false);
      setEditingOrder(null);
      setEditCustomerName('');
      await loadData();
    } catch (error) {
      console.error('保存失败:', error);
      showCustomAlert('错误', '保存失败', [{ text: '确定', style: 'destructive' }], 'error');
    }
  };

  const handleDeleteOrder = (order: Order) => {
    showCustomAlert(
      '确认删除',
      `确定要删除订单 ${order.order_no} 及其所有物料记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrder(order.order_no);
              if (expandedOrderId === order.id) {
                setExpandedOrderId(null);
                setExpandedMaterials([]);
              }
              await loadData();
              showCustomAlert('成功', '订单已删除', [{ text: '确定' }], 'success');
            } catch (error) {
              console.error('删除订单失败:', error);
              showCustomAlert('错误', '删除订单失败', [{ text: '确定', style: 'destructive' }], 'error');
            }
          },
        },
      ],
      'warning'
    );
  };

  // ============ 物料操作 ============
  const handleOpenMaterials = async (todayOnly: boolean = false) => {
    try {
      const allMaterials = await getAllMaterials();
      const { summaries, totalQuantity } = summarizeMaterials(allMaterials, todayOnly);
      setMaterialSummaries(summaries);
      setMaterialTotalQuantity(totalQuantity);
      setShowTodayOnly(todayOnly);
      setMaterialsModalVisible(true);
    } catch (error) {
      console.error('获取物料汇总失败:', error);
    }
  };

  const handleOpenMaterialDetail = async (model: string) => {
    try {
      const allMaterials = await getAllMaterials();
      const filtered = allMaterials.filter((m) => {
        const modelMatch = (m.model || '未知型号') === model;
        if (!modelMatch) return false;
        if (showTodayOnly) {
          const today = getToday();
          return m.scanned_at && m.scanned_at.slice(0, 10) === today;
        }
        return true;
      });
      setSelectedModel(model);
      setSelectedModelMaterials(filtered);
      setMaterialsModalVisible(false);
      setMaterialDetailModalVisible(true);
    } catch (error) {
      console.error('获取物料详情失败:', error);
    }
  };

  const handleDeleteMaterial = (material: MaterialRecord) => {
    showCustomAlert(
      '确认删除',
      `确定要删除这条物料记录吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMaterial(material.id!);
              await new Promise((resolve) => setTimeout(resolve, 50));
              const materials = await getMaterialsByOrder(material.order_no);
              setExpandedMaterials(materials);
              await loadData();
            } catch (error) {
              console.error('删除物料失败:', error);
              showCustomAlert('错误', '删除失败', [{ text: '确定', style: 'destructive' }], 'error');
            }
          },
        },
      ],
      'warning'
    );
  };

  // ============ 拆包操作 ============
  const handleOpenUnpack = async (material: MaterialRecord) => {
    setUnpackingMaterial(material);
    setUnpackNewQuantity('');
    setUnpackNotes('');

    try {
      const history = await getUnpackHistoryByMaterialId(material.id!);
      setUnpackHistory(history);
      const nextIndex = await getNextUnpackIndex(material.traceNo);
      setNextUnpackIndex(nextIndex);
      setUnpackNewTraceNo(material.traceNo ? `${material.traceNo}-${nextIndex}` : '');
    } catch (error) {
      console.error('获取拆包信息失败:', error);
      setUnpackHistory([]);
      setNextUnpackIndex(1);
      setUnpackNewTraceNo(material.traceNo ? `${material.traceNo}-1` : '');
    }

    setUnpackModalVisible(true);
  };

  const handleConfirmUnpack = async () => {
    if (!unpackingMaterial) return;

    const newQty = parseInt(unpackNewQuantity, 10);
    if (!unpackNewQuantity.trim() || isNaN(newQty) || newQty <= 0) {
      showCustomAlert('错误', '请输入有效的拆出数量', [{ text: '确定', style: 'destructive' }], 'error');
      return;
    }

    const availableQty = parseInt(unpackingMaterial.remaining_quantity || unpackingMaterial.quantity, 10);
    if (!isNaN(availableQty) && newQty > availableQty) {
      showCustomAlert('错误', `拆出数量不能大于当前数量（${availableQty}个）`, [{ text: '确定', style: 'destructive' }], 'error');
      return;
    }

    const remainingQty = availableQty - newQty;

    setUnpacking(true);
    try {
      await addUnpackRecord({
        original_material_id: unpackingMaterial.id!,
        order_no: unpackingMaterial.order_no,
        customer_name: unpackingMaterial.customer_name || '',
        model: unpackingMaterial.model,
        batch: unpackingMaterial.batch,
        package: unpackingMaterial.package,
        version: unpackingMaterial.version,
        original_quantity: unpackingMaterial.remaining_quantity || unpackingMaterial.quantity,
        new_quantity: unpackNewQuantity,
        remaining_quantity: remainingQty.toString(),
        productionDate: unpackingMaterial.productionDate,
        traceNo: unpackingMaterial.traceNo,
        sourceNo: unpackingMaterial.sourceNo,
        new_traceNo: unpackNewTraceNo,
        notes: unpackNotes,
        warehouse_id: unpackingMaterial.warehouse_id,
        warehouse_name: unpackingMaterial.warehouse_name,
        inventory_code: unpackingMaterial.inventory_code,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      const materials = await getMaterialsByOrder(unpackingMaterial.order_no);
      setExpandedMaterials(materials);
      await loadData();

      setUnpackModalVisible(false);
      showCustomAlert('拆包成功', `已拆包 ${newQty} 个物料`, [{ text: '确定' }], 'success');
    } catch (error) {
      console.error('拆包失败:', error);
      showCustomAlert('错误', '拆包失败，请稍后重试', [{ text: '确定', style: 'destructive' }], 'error');
    } finally {
      setUnpacking(false);
    }
  };

  // ============ 编辑物料操作 ============
  const handleEditMaterial = (material: MaterialRecord) => {
    setEditingMaterial(material);
    setEditMaterialData({
      model: material.model || '',
      batch: material.batch || '',
      quantity: material.quantity || '',
      package: material.package || '',
      version: material.version || '',
      productionDate: material.productionDate || '',
      traceNo: material.traceNo || '',
      sourceNo: material.sourceNo || '',
    });
    setEditMaterialModalVisible(true);
  };

  const handleConfirmEditMaterial = async () => {
    if (!editingMaterial) return;

    setSavingMaterial(true);
    try {
      await updateMaterial(editingMaterial.id!, {
        model: editMaterialData.model,
        batch: editMaterialData.batch,
        quantity: editMaterialData.quantity,
        package: editMaterialData.package,
        version: editMaterialData.version,
        productionDate: editMaterialData.productionDate,
        traceNo: editMaterialData.traceNo,
        sourceNo: editMaterialData.sourceNo,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      const materials = await getMaterialsByOrder(editingMaterial.order_no);
      setExpandedMaterials(materials);
      await loadData();
      setEditMaterialModalVisible(false);
    } catch (error) {
      console.error('保存物料失败:', error);
      showCustomAlert('错误', '保存失败', [{ text: '确定', style: 'destructive' }], 'error');
    } finally {
      setSavingMaterial(false);
    }
  };

  // ============ 同步到电脑 ============
  const handleSyncUnpackToComputer = async (shippedRecord: UnpackRecord, remainingRecord: UnpackRecord) => {
    if (!syncConfig.ip) {
      showCustomAlert('提示', '请先在设置中配置同步服务器', [{ text: '确定' }], 'info');
      return;
    }

    setSyncing(true);
    try {
      const records = [shippedRecord, remainingRecord].map((r) => ({
        订单号: r.order_no,
        客户: r.customer_name,
        型号: r.model,
        批次: r.batch,
        封装: r.package,
        版本: r.version,
        数量: r.new_quantity,
        剩余数量: r.remaining_quantity,
        追溯码: r.new_traceNo || r.traceNo,
        箱号: r.sourceNo,
        生产日期: r.productionDate,
        拆包时间: formatDateTime(r.created_at),
      }));

      const ws = XLSX.utils.json_to_sheet(records);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '拆包记录');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

      const formData = new FormData();
      formData.append('file', { uri: 'data:application/vnd.ms-excel;base64,' + wbout, name: `unpack_${Date.now()}.xlsx`, type: 'application/vnd.ms-excel' } as any);
      formData.append('orderNo', shippedRecord.order_no);

      const response = await fetch(`http://${syncConfig.ip}:${syncConfig.port || NETWORK_CONFIG.DEFAULT_PORT}/unpack`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        showCustomAlert('同步成功', '拆包记录已同步到电脑', [{ text: '确定' }], 'success');
      } else {
        throw new Error('同步失败');
      }
    } catch (error) {
      console.error('同步失败:', error);
      showCustomAlert('同步失败', '请检查网络连接和服务器配置', [{ text: '确定', style: 'destructive' }], 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ============ 渲染 ============
  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>订单管理</Text>
            <Text style={styles.subtitle}>点击订单展开查看物料</Text>
          </View>
        </View>

        {/* 搜索框 */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchType === 'batch' ? '搜索批次号...' : searchType === 'customer' ? '搜索客户名称...' : '搜索订单号...'}
            placeholderTextColor={theme.textMuted}
            value={searchText}
            onChangeText={handleSearch}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.searchClear}>
              <Feather name="x" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 搜索类型选择器 */}
        <View style={styles.searchTypeContainer}>
          {(['order', 'customer', 'batch'] as SearchType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.searchTypeBtn, searchType === type && styles.searchTypeBtnActive]}
              onPress={() => handleSearchTypeChange(type)}
            >
              <Text style={[styles.searchTypeText, searchType === type && styles.searchTypeTextActive]}>
                {type === 'order' ? '订单号' : type === 'customer' ? '客户名称' : '批次号'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 统计信息 */}
        <View style={styles.statsContainer}>
          <View style={styles.statsOverview}>
            <Text style={styles.statsOverviewText}>总订单 <Text style={styles.statsOverviewNum}>{stats.totalOrders}</Text></Text>
            <Text style={styles.statsOverviewDivider}>|</Text>
            <TouchableOpacity onPress={() => handleOpenMaterials(false)}>
              <Text style={styles.statsOverviewText}>总物料 <Text style={styles.statsOverviewNum}>{stats.totalMaterials}</Text></Text>
            </TouchableOpacity>
            <Text style={styles.statsOverviewDivider}>|</Text>
            <Text style={styles.statsOverviewText}>总数量 <Text style={styles.statsOverviewNum}>{stats.totalQuantity.toLocaleString()}</Text></Text>
          </View>
          <View style={styles.statsCards}>
            <TouchableOpacity style={styles.statCard} onPress={() => { setShowTodayOrdersOnly(true); setAllOrdersModalVisible(true); }}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.todayOrders}</Text>
              <Text style={styles.statLabel}>今日订单</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCard, { marginRight: 0 }]} onPress={() => handleOpenMaterials(true)}>
              <Text style={[styles.statNumber, { color: theme.accent }]}>{stats.todayMaterials}</Text>
              <Text style={styles.statLabel}>今日物料</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 订单列表 */}
        <View style={styles.recentOrders}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>订单列表</Text>
            <Text style={styles.sectionTip}>点击展开查看物料，长按删除订单</Text>
          </View>

          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="file-text" size={48} color={theme.textMuted} />
              <Text style={styles.emptyText}>{searchText ? '未找到匹配的订单' : '暂无订单'}</Text>
              <Text style={styles.emptyTip}>{searchText ? '请尝试其他关键词' : '扫码时会自动创建订单'}</Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <View key={order.id}>
                <AnimatedCard onPress={() => handleToggleOrder(order)} onLongPress={() => handleDeleteOrder(order)}>
                  <View style={[styles.orderItem, expandedOrderId === order.id && styles.orderItemExpanded]}>
                    <View style={styles.orderHeader}>
                      <View style={styles.orderHeaderLeft}>
                        <Feather name={expandedOrderId === order.id ? "chevron-down" : "chevron-right"} size={18} color={theme.textSecondary} />
                        <Text style={styles.orderNo} numberOfLines={1}>{order.order_no}</Text>
                      </View>
                      <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                    </View>
                    <View style={styles.orderContent}>
                      <View style={styles.orderInfo}>
                        {order.customer_name ? (
                          <Text style={styles.customerName}>{order.customer_name}</Text>
                        ) : (
                          <Text style={styles.noCustomer}>点击设置客户名称</Text>
                        )}
                      </View>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleEditCustomer(order)}>
                        <Feather name={order.customer_name ? "edit-2" : "plus"} size={16} color={theme.primary} />
                        <Text style={styles.editBtnText}>{order.customer_name ? '编辑' : '设置'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </AnimatedCard>

                {/* 展开的物料列表 */}
                {expandedOrderId === order.id && (
                  <View style={styles.materialsList}>
                    {expandedMaterials.length === 0 ? (
                      <View style={styles.noMaterials}>
                        <Text style={styles.noMaterialsText}>该订单暂无物料记录</Text>
                      </View>
                    ) : (
                      expandedMaterials.map((material) => (
                        <View key={material.id} style={styles.materialItem}>
                          <TouchableOpacity style={styles.materialMainInfo} onPress={() => handleViewMaterial(material)} onLongPress={() => handleDeleteMaterial(material)}>
                            <Text style={styles.materialModel}>{material.model || '未知型号'}</Text>
                            <Text style={styles.materialDetails}>批次: {material.batch || '-'}</Text>
                            <Text style={styles.materialDetails}>
                              {material.isUnpacked ? `已发货: ${material.quantity || '-'}` : `数量: ${material.quantity || '-'}`}
                            </Text>
                            <Text style={styles.materialDate}>{formatDate(material.scanned_at)}</Text>
                          </TouchableOpacity>
                          <View style={styles.materialActions}>
                            <TouchableOpacity style={[styles.materialActionBtn, { backgroundColor: theme.primary + '15' }]} onPress={() => handleOpenUnpack(material)}>
                              <Feather name="package" size={14} color={theme.primary} />
                              <Text style={[styles.materialActionText, { color: theme.primary }]}>拆包</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.materialActionBtn} onPress={() => handleEditMaterial(material)}>
                              <Feather name="edit-2" size={14} color={theme.textSecondary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ============ 弹窗组件 ============ */}

      {/* 编辑客户名称弹窗 */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>编辑客户名称</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>客户名称</Text>
              <TextInput
                ref={customerNameInputRef}
                style={[styles.textInput, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary, borderColor: theme.border }]}
                value={editCustomerName}
                onChangeText={setEditCustomerName}
                placeholder="请输入客户名称"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]} onPress={() => setEditModalVisible(false)}>
                <Text style={[styles.modalButtonText, { color: theme.textPrimary }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={handleSaveCustomer}>
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 物料汇总弹窗 */}
      <Modal visible={materialsModalVisible} transparent animationType="slide" onRequestClose={() => setMaterialsModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, maxHeight: '70%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>物料汇总</Text>
              <TouchableOpacity onPress={() => setMaterialsModalVisible(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.summaryTotal, { backgroundColor: theme.backgroundTertiary }]}>
                <Text style={[styles.summaryTotalText, { color: theme.textSecondary }]}>总数量</Text>
                <Text style={[styles.summaryTotalNum, { color: theme.primary }]}>{materialTotalQuantity.toLocaleString()}</Text>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {materialSummaries.map((summary, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.summaryItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleOpenMaterialDetail(summary.model)}
                  >
                    <View>
                      <Text style={[styles.summaryModel, { color: theme.textPrimary }]}>{summary.model}</Text>
                      <Text style={[styles.summaryCount, { color: theme.textSecondary }]}>记录数: {summary.count}</Text>
                    </View>
                    <View style={styles.summaryRight}>
                      <Text style={[styles.summaryQty, { color: theme.primary }]}>{summary.totalQuantity.toLocaleString()}</Text>
                      <Feather name="chevron-right" size={16} color={theme.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 物料详情弹窗 */}
      <Modal visible={materialDetailModalVisible} transparent animationType="slide" onRequestClose={() => setMaterialDetailModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, maxHeight: '80%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{selectedModel}</Text>
              <TouchableOpacity onPress={() => setMaterialDetailModalVisible(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedModelMaterials.map((material, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.detailItem, { backgroundColor: theme.backgroundTertiary }]}
                  onPress={() => {
                    setMaterialDetailModalVisible(false);
                    router.push('/detail', { id: material.id });
                  }}
                >
                  <View>
                    <Text style={[styles.detailBatch, { color: theme.textPrimary }]}>批次: {material.batch}</Text>
                    <Text style={[styles.detailInfo, { color: theme.textSecondary }]}>数量: {material.quantity} | 追溯码: {material.traceNo || '-'}</Text>
                    <Text style={[styles.detailDate, { color: theme.textMuted }]}>{formatDateTime(material.scanned_at)}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 编辑物料弹窗 */}
      <EditMaterialModal
        visible={editMaterialModalVisible}
        material={editingMaterial}
        formData={editMaterialData}
        saving={savingMaterial}
        onChange={(field, value) => setEditMaterialData((prev) => ({ ...prev, [field]: value }))}
        onSave={handleConfirmEditMaterial}
        onClose={() => setEditMaterialModalVisible(false)}
        theme={theme}
      />

      {/* 拆包弹窗 */}
      <UnpackModal
        visible={unpackModalVisible}
        material={unpackingMaterial}
        newQuantity={unpackNewQuantity}
        newTraceNo={unpackNewTraceNo}
        notes={unpackNotes}
        unpacking={unpacking}
        history={unpackHistory}
        nextIndex={nextUnpackIndex}
        onQuantityChange={setUnpackNewQuantity}
        onTraceNoChange={setUnpackNewTraceNo}
        onNotesChange={setUnpackNotes}
        onConfirm={handleConfirmUnpack}
        onClose={() => setUnpackModalVisible(false)}
        theme={theme}
      />

      {/* 自定义确认弹窗 */}
      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        icon={customAlert.icon}
        buttons={customAlert.buttons}
        onClose={closeCustomAlert}
      />
    </Screen>
  );
}
