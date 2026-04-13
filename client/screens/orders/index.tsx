import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather, FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as XLSX from 'xlsx';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { AnimatedCard } from '@/components/AnimatedCard';
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
  UnpackRecord 
} from '@/utils/database';
import { formatDate } from '@/utils/qrcodeParser';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Spacing, BorderRadius, BorderWidth } from '@/constants/theme';
import { rf } from '@/utils/responsive';

// 电脑同步配置存储键
const SYNC_CONFIG_KEY = '@sync_config';

interface SyncConfig {
  ip: string;
  port: string;
}

// 物料汇总接口
interface MaterialSummary {
  model: string;
  count: number;
  totalQuantity: number;
  todayCount: number;
}

// 搜索类型
type SearchType = 'order' | 'customer' | 'batch';

// 自定义弹窗配置
interface CustomAlertConfig {
  visible: boolean;
  title: string;
  message: string;
  icon?: 'success' | 'warning' | 'error' | 'info';
  buttons: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[];
}

export default function OrdersScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ orderNo?: string; materialId?: number }>();
  
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
  
  // 标记是否需要自动展开订单（从拆包跳转过来）
  const pendingExpandOrderNo = useRef<string | null>(null);
  const pendingMaterialId = useRef<number | null>(null);
  
  // 同步 ref
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
  
  // 显示自定义弹窗
  const showCustomAlert = (
    title: string, 
    message: string, 
    buttons: CustomAlertConfig['buttons'],
    icon?: 'success' | 'warning' | 'error' | 'info'
  ) => {
    setCustomAlert({ visible: true, title, message, buttons, icon });
  };
  
  // 关闭自定义弹窗
  const closeCustomAlert = () => {
    setCustomAlert(prev => ({ ...prev, visible: false }));
  };
  
  // 编辑客户名称弹窗
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const customerNameInputRef = useRef<TextInput>(null);
  
  // 客户名称弹窗打开时聚焦输入框
  useEffect(() => {
    if (editModalVisible && customerNameInputRef.current) {
      setTimeout(() => customerNameInputRef.current?.focus(), 300);
    }
  }, [editModalVisible]);
  
  // 所有订单弹窗
  const [allOrdersModalVisible, setAllOrdersModalVisible] = useState(false);
  const [showTodayOrdersOnly, setShowTodayOrdersOnly] = useState(false); // 是否只显示今日订单
  
  // 物料汇总弹窗
  const [materialsModalVisible, setMaterialsModalVisible] = useState(false);
  const [materialSummaries, setMaterialSummaries] = useState<MaterialSummary[]>([]);
  const [materialTotalQuantity, setMaterialTotalQuantity] = useState(0);
  const [showTodayOnly, setShowTodayOnly] = useState(false); // 是否只显示今日物料
  
  // 物料详情弹窗（按型号筛选）
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
  
  // 拆包数量输入框 ref
  const unpackQuantityRef = useRef<TextInput>(null);
  // 拆包备注输入框 ref
  const unpackNotesRef = useRef<TextInput>(null);
  
  // 拆包弹窗打开后聚焦输入框
  useEffect(() => {
    if (unpackModalVisible && unpackQuantityRef.current) {
      setTimeout(() => unpackQuantityRef.current?.focus(), 300);
    }
  }, [unpackModalVisible]);
  
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
  
  // 加载同步配置
  const loadSyncConfig = useCallback(async () => {
    const savedSyncConfig = await AsyncStorage.getItem(SYNC_CONFIG_KEY);
    if (savedSyncConfig) {
      setSyncConfig(JSON.parse(savedSyncConfig));
    }
  }, []);
  
  // 页面加载时获取同步配置
  useFocusEffect(
    useCallback(() => {
      loadSyncConfig();
    }, [loadSyncConfig])
  );
  
  // 拆包弹窗样式
  const unpackModalStyles = useMemo(() => ({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    modalContent: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      width: '90%' as any,
      maxWidth: 400,
    },
    modalHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderBottomWidth: BorderWidth.normal,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: rf(18),
      fontWeight: '600' as const,
      color: theme.textPrimary,
    },
    modalClose: {
      fontSize: rf(20),
      color: theme.textSecondary,
    },
    modalBody: {
      padding: Spacing.lg,
    },
    modalBodyContent: {
      paddingBottom: Spacing['2xl'],
    },
    inputLabel: {
      fontSize: rf(14),
      fontWeight: '500' as const,
      color: theme.textPrimary,
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
    },
    textInput: {
      fontSize: rf(16),
      color: theme.textPrimary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    infoBox: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    infoRow: {
      flexDirection: 'row' as const,
      marginBottom: Spacing.sm,
    },
    infoLabel: {
      width: 60,
      fontSize: rf(13),
      color: theme.textSecondary,
    },
    infoValue: {
      flex: 1,
      fontSize: rf(14),
      color: theme.textPrimary,
      fontWeight: '500' as const,
    },
    modalFooter: {
      flexDirection: 'row' as const,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderTopWidth: BorderWidth.normal,
      borderTopColor: theme.border,
      gap: Spacing.md,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center' as const,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      borderWidth: BorderWidth.normal,
      borderColor: theme.border,
    },
    cancelButtonText: {
      fontSize: rf(16),
      fontWeight: '600' as const,
      color: theme.textPrimary,
    },
    saveButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center' as const,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primary,
    },
    saveButtonText: {
      fontSize: rf(16),
      fontWeight: '600' as const,
      color: theme.buttonPrimaryText,
    },
  }), [theme]);
  
  // 加载数据
  const loadData = useCallback(async () => {
    try {
      const [ordersData, statsData] = await Promise.all([
        getAllOrders(),
        getStatistics(),
      ]);
      
      // 按订单号从大到小排序（最近的日期在最上面）
      const sortedOrders = [...ordersData].sort((a, b) => 
        b.order_no.localeCompare(a.order_no, undefined, { numeric: true })
      );
      
      setOrders(sortedOrders);
      setFilteredOrders(sortedOrders);
      setStats(statsData);
      
      // 如果有展开的订单，刷新其物料列表（使用 ref 避免依赖问题）
      const currentExpandedId = expandedOrderIdRef.current;
      if (currentExpandedId) {
        const expandedOrder = sortedOrders.find(o => o.id === currentExpandedId);
        if (expandedOrder) {
          const materials = await getMaterialsByOrder(expandedOrder.order_no);
          setExpandedMaterials(materials);
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, []);
  
  // 搜索过滤
  const handleSearch = useCallback(async (text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setFilteredOrders(orders);
      return;
    }
    
    const lowerText = text.toLowerCase();
    
    if (searchType === 'batch') {
      // 按批次搜索物料，然后找到相关订单
      try {
        const materials = await searchMaterials({ batch: text });
        const orderNos = new Set(materials.map(m => m.order_no));
        const filtered = orders.filter(order => orderNos.has(order.order_no));
        // 保持排序（从大到小）
        setFilteredOrders(filtered.sort((a, b) => 
          b.order_no.localeCompare(a.order_no, undefined, { numeric: true })
        ));
      } catch (error) {
        console.error('批次搜索失败:', error);
        setFilteredOrders([]);
      }
    } else if (searchType === 'customer') {
      // 按客户名称搜索
      const filtered = orders.filter(order => 
        order.customer_name && order.customer_name.toLowerCase().includes(lowerText)
      );
      // 保持排序（从大到小）
      setFilteredOrders(filtered.sort((a, b) => 
        b.order_no.localeCompare(a.order_no, undefined, { numeric: true })
      ));
    } else {
      // 按订单号搜索
      const filtered = orders.filter(order => 
        order.order_no.toLowerCase().includes(lowerText)
      );
      // 保持排序（从大到小）
      setFilteredOrders(filtered.sort((a, b) => 
        b.order_no.localeCompare(a.order_no, undefined, { numeric: true })
      ));
    }
  }, [orders, searchType]);
  
  // 搜索类型变更时重新搜索
  const handleSearchTypeChange = useCallback((type: SearchType) => {
    setSearchType(type);
    if (searchText.trim()) {
      handleSearch(searchText);
    }
  }, [searchText, handleSearch]);
  
  // 初始化数据库
  const initDB = useCallback(async () => {
    try {
      await initDatabase();
    } catch (error) {
      console.error('数据库初始化失败:', error);
    }
  }, []);
  
  // 页面聚焦时刷新数据
  useFocusEffect(
    useCallback(() => {
      initDB();
      loadData();
    }, [initDB, loadData])
  );
  
  // 处理从扫描页面跳转过来的参数（自动展开订单）
  useEffect(() => {
    if (params.orderNo && orders.length > 0) {
      // 找到对应的订单
      const targetOrder = orders.find(o => o.order_no === params.orderNo);
      if (targetOrder && targetOrder.id !== expandedOrderId) {
        // 展开该订单
        setExpandedOrderId(targetOrder.id);
        getMaterialsByOrder(targetOrder.order_no).then(materials => {
          setExpandedMaterials(materials);
        });
      }
    }
  }, [params.orderNo, orders]);
  
  // 点击订单 - 展开/收起显示物料列表
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
  
  // 查看物料详情
  const handleViewMaterial = (material: MaterialRecord) => {
    router.push('/detail', { id: material.id });
  };
  
  // 打开编辑客户名称弹窗
  const handleEditCustomer = (order: Order) => {
    setEditingOrder(order);
    setEditCustomerName(order.customer_name || '');
    setEditModalVisible(true);
  };
  
  // 保存客户名称
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
  
  // 删除订单
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
  
  // 打开物料汇总弹窗
  const handleOpenMaterials = async (todayOnly: boolean = false) => {
    try {
      const allMaterials = await getAllMaterials();
      const today = new Date().toISOString().slice(0, 10);
      
      // 根据参数筛选物料
      const materials = todayOnly 
        ? allMaterials.filter(m => m.scanned_at && m.scanned_at.slice(0, 10) === today)
        : allMaterials;
      
      const summaryMap = new Map<string, MaterialSummary>();
      let totalQty = 0;
      
      materials.forEach(m => {
        const model = m.model || '未知型号';
        const qty = parseInt(m.quantity, 10) || 0;
        const isToday = m.scanned_at && m.scanned_at.slice(0, 10) === today;
        
        totalQty += qty;
        
        if (!summaryMap.has(model)) {
          summaryMap.set(model, {
            model,
            count: 0,
            totalQuantity: 0,
            todayCount: 0,
          });
        }
        
        const summary = summaryMap.get(model)!;
        summary.count++;
        summary.totalQuantity += qty;
        if (isToday) summary.todayCount++;
      });
      
      const summaries = Array.from(summaryMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
      setMaterialSummaries(summaries);
      setMaterialTotalQuantity(totalQty);
      setShowTodayOnly(todayOnly);
      setMaterialsModalVisible(true);
    } catch (error) {
      console.error('获取物料汇总失败:', error);
    }
  };
  
  // 打开物料详情弹窗（按型号筛选）
  const handleOpenMaterialDetail = async (model: string) => {
    try {
      const allMaterials = await getAllMaterials();
      const today = new Date().toISOString().slice(0, 10);
      
      // 根据 showTodayOnly 筛选物料
      const filtered = allMaterials.filter(m => {
        const modelMatch = (m.model || '未知型号') === model;
        if (!modelMatch) return false;
        if (showTodayOnly) {
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
  
  // 删除物料
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
              // 短暂延迟确保 AsyncStorage 写入完成
              await new Promise(resolve => setTimeout(resolve, 50));
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
  
  // 打开拆包弹窗
  const handleOpenUnpack = async (material: MaterialRecord) => {
    setUnpackingMaterial(material);
    setUnpackNewQuantity('');
    setUnpackNotes('');
    
    // 获取拆包历史和下一个序号
    try {
      const history = await getUnpackHistoryByMaterialId(material.id!);
      setUnpackHistory(history);
      
      const nextIndex = await getNextUnpackIndex(material.traceNo);
      setNextUnpackIndex(nextIndex);
      
      // 自动生成新追踪码
      const newTraceNo = material.traceNo ? `${material.traceNo}-${nextIndex}` : '';
      setUnpackNewTraceNo(newTraceNo);
    } catch (error) {
      console.error('获取拆包信息失败:', error);
      setUnpackHistory([]);
      setNextUnpackIndex(1);
      setUnpackNewTraceNo(material.traceNo ? `${material.traceNo}-1` : '');
    }
    
    setUnpackModalVisible(true);
  };
  
  // 确认拆包
  const handleConfirmUnpack = async () => {
    if (!unpackingMaterial) return;
    
    const newQty = parseInt(unpackNewQuantity, 10);
    if (!unpackNewQuantity.trim() || isNaN(newQty) || newQty <= 0) {
      showCustomAlert('错误', '请输入有效的拆出数量', [{ text: '确定', style: 'destructive' }], 'error');
      return;
    }
    
    // 使用剩余数量作为当前可用数量（已拆包物料使用 remaining_quantity，新物料使用 quantity）
    const availableQty = parseInt(unpackingMaterial.remaining_quantity || unpackingMaterial.quantity, 10);
    if (!isNaN(availableQty) && newQty > availableQty) {
      showCustomAlert('错误', `拆出数量不能大于当前数量（${availableQty}个）`, [{ text: '确定', style: 'destructive' }], 'error');
      return;
    }
    
    const remainingQty = availableQty - newQty;
    
    setUnpacking(true);
    try {
      // 1. 添加拆包记录（同时更新原物料的拆包状态和剩余数量）
      await addUnpackRecord({
        original_material_id: unpackingMaterial.id!,
        order_no: unpackingMaterial.order_no,
        customer_name: unpackingMaterial.customer_name || '',
        model: unpackingMaterial.model,
        batch: unpackingMaterial.batch,
        package: unpackingMaterial.package,
        version: unpackingMaterial.version,
        // 原始数量使用剩余数量或当前数量
        original_quantity: unpackingMaterial.remaining_quantity || unpackingMaterial.quantity,
        new_quantity: unpackNewQuantity,
        remaining_quantity: remainingQty.toString(),
        productionDate: unpackingMaterial.productionDate,
        traceNo: unpackingMaterial.traceNo,
        sourceNo: unpackingMaterial.sourceNo,
        new_traceNo: unpackNewTraceNo,
        notes: unpackNotes,
        // V3.0 新增：仓库和存货编码
        warehouse_id: unpackingMaterial.warehouse_id,
        warehouse_name: unpackingMaterial.warehouse_name,
        inventory_code: unpackingMaterial.inventory_code,
      });
      
      // 2. 刷新物料列表（短暂延迟确保 AsyncStorage 写入完成）
      await new Promise(resolve => setTimeout(resolve, 50));
      const materials = await getMaterialsByOrder(unpackingMaterial.order_no);
      setExpandedMaterials(materials);
      await loadData();
      
      setUnpackModalVisible(false);
      
      showCustomAlert(
        '拆包成功',
        `已生成 2 条标签：\n• 发货标签：${unpackNewTraceNo}（${newQty}个）\n• 剩余标签：${unpackingMaterial.traceNo}（${remainingQty}个）`,
        [
          { text: '完成', style: 'cancel' },
          {
            text: '同步到电脑',
            onPress: async () => {
              // 获取刚生成的两条标签
              const records = await getAllUnpackRecords();
              const shippedRecord = records.find(r => r.new_traceNo === unpackNewTraceNo && r.label_type === 'shipped');
              const remainingRecord = records.find(r => r.traceNo === unpackingMaterial.traceNo && r.label_type === 'remaining' && r.pair_id === shippedRecord?.pair_id);
              
              if (shippedRecord && remainingRecord) {
                handleSyncUnpackToComputer(shippedRecord, remainingRecord);
              }
            },
          },
        ],
        'success'
      );
    } catch (error) {
      console.error('拆包失败:', error);
      showCustomAlert('错误', '拆包失败，请稍后重试', [{ text: '确定', style: 'destructive' }], 'error');
    } finally {
      setUnpacking(false);
    }
  };
  
  // 同步单次拆包数据到电脑
  const handleSyncUnpackToComputer = async (shippedRecord: UnpackRecord, remainingRecord: UnpackRecord) => {
    if (!syncConfig.ip) {
      showCustomAlert('提示', '请先在设置页面配置电脑IP地址', [{ text: '确定' }], 'warning');
      return;
    }
    
    setSyncing(true);
    try {
      // 定义表头（与设置页同步标签数据格式保持一致，确保BarTender能正确识别）
      const headers = [
        '仓库名称', '标签类型', '订单号', '客户', '型号', '存货编码', '批次', '封装', '版本',
        '原数量', '标签数量', '生产日期', '追踪码', '箱号', '拆包时间', '备注'
      ];
      
      // 格式化时间
      const formatTime = (timeStr: string) => {
        const date = new Date(timeStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      };
      
      // 构建数据行（发货标签和剩余标签）
      const rows = [
        [
          shippedRecord.warehouse_name || '',
          '发货标签',
          shippedRecord.order_no || '',
          shippedRecord.customer_name || '',
          shippedRecord.model || '',
          shippedRecord.inventory_code || '',
          shippedRecord.batch || '',
          shippedRecord.package || '',
          shippedRecord.version || '',
          parseInt(shippedRecord.original_quantity, 10) || 0,
          parseInt(shippedRecord.new_quantity, 10) || 0,
          shippedRecord.productionDate || '',
          shippedRecord.new_traceNo || shippedRecord.traceNo || '',
          shippedRecord.sourceNo || '',
          formatTime(shippedRecord.unpacked_at),
          shippedRecord.notes || '',
        ],
        [
          remainingRecord.warehouse_name || '',
          '剩余标签',
          remainingRecord.order_no || '',
          remainingRecord.customer_name || '',
          remainingRecord.model || '',
          remainingRecord.inventory_code || '',
          remainingRecord.batch || '',
          remainingRecord.package || '',
          remainingRecord.version || '',
          parseInt(remainingRecord.original_quantity, 10) || 0,
          parseInt(remainingRecord.new_quantity, 10) || 0,
          remainingRecord.productionDate || '',
          remainingRecord.traceNo || '',
          remainingRecord.sourceNo || '',
          formatTime(remainingRecord.unpacked_at),
          remainingRecord.notes || '',
        ],
      ];
      
      // 创建Excel
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      // 计算列宽
      const colWidths = headers.map((header, colIdx) => {
        let maxWidth = header.length;
        rows.forEach(row => {
          const cellValue = String(row[colIdx] || '');
          const width = cellValue.split('').reduce((acc, char) => {
            return acc + (char.charCodeAt(0) > 127 ? 2 : 1);
          }, 0);
          if (width > maxWidth) maxWidth = width;
        });
        return { wch: Math.min(maxWidth + 2, 50) };
      });
      ws['!cols'] = colWidths;
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '标签数据');
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      // 转换为二进制
      const binaryString = atob(wbout);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // 发送到电脑（添加订单号作为name_suffix，与设置页同步格式保持一致）
      const baseUrl = `http://${syncConfig.ip}:${syncConfig.port || '8080'}/labels`;
      const nameSuffix = shippedRecord.order_no || '拆包标签';
      const url = `${baseUrl}?name_suffix=${encodeURIComponent(nameSuffix)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        body: bytes,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        console.error('服务器响应错误:', response.status, errorText);
        throw new Error(`服务器错误 (${response.status})`);
      }
      
      // 尝试解析JSON响应
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        const responseText = await response.text();
        console.error('JSON解析失败，响应内容:', responseText.substring(0, 200));
        throw new Error('服务器返回格式错误，请检查同步服务是否正常运行');
      }
      
      if (result.success) {
        showCustomAlert('同步成功', `已同步 2 条标签到电脑\n${result.path || ''}`, [{ text: '确定' }], 'success');
      } else {
        showCustomAlert('同步失败', result.message || '未知错误', [{ text: '确定', style: 'destructive' }], 'error');
      }
    } catch (error: any) {
      console.error('同步失败:', error);
      const errorMsg = error.name === 'AbortError' 
        ? '连接超时，请检查网络' 
        : error.message?.includes('服务器')
          ? error.message
          : `同步失败: ${error.message || '请检查网络和同步服务'}`;
      showCustomAlert('同步失败', errorMsg, [{ text: '确定', style: 'destructive' }], 'error');
    } finally {
      setSyncing(false);
    }
  };
  
  // 打开编辑物料弹窗
  const handleOpenEditMaterial = (material: MaterialRecord) => {
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
  
  // 确认编辑物料
  const handleConfirmEditMaterial = async () => {
    if (!editingMaterial) return;
    
    // 验证数量
    const newQty = parseInt(editMaterialData.quantity, 10);
    const originalQty = parseInt(editingMaterial.original_quantity || editingMaterial.quantity, 10);
    
    if (isNaN(newQty) || newQty <= 0) {
      showCustomAlert('错误', '请输入有效的数量', [{ text: '确定', style: 'destructive' }], 'error');
      return;
    }
    
    if (!isNaN(originalQty) && newQty > originalQty) {
      showCustomAlert('错误', `数量不能大于原始扫描数量（${originalQty}个）`, [{ text: '确定', style: 'destructive' }], 'error');
      return;
    }
    
    setSavingMaterial(true);
    try {
      // 只更新数量字段，其他字段不可修改
      await updateMaterial(editingMaterial.id!, {
        quantity: editMaterialData.quantity,
      });
      
      // 刷新物料列表（短暂延迟确保 AsyncStorage 写入完成）
      await new Promise(resolve => setTimeout(resolve, 50));
      const materials = await getMaterialsByOrder(editingMaterial.order_no);
      setExpandedMaterials(materials);
      await loadData();
      
      setEditMaterialModalVisible(false);
      showCustomAlert('成功', '物料数量已更新', [{ text: '确定' }], 'success');
    } catch (error) {
      console.error('更新物料失败:', error);
      showCustomAlert('错误', '更新失败，请稍后重试', [{ text: '确定', style: 'destructive' }], 'error');
    } finally {
      setSavingMaterial(false);
    }
  };
  
  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
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
            placeholder={
              searchType === 'batch' ? '搜索批次号...' :
              searchType === 'customer' ? '搜索客户名称...' :
              '搜索订单号...'
            }
            placeholderTextColor={theme.textMuted}
            value={searchText}
            onChangeText={handleSearch}
            showSoftInputOnFocus={true}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.searchClear}>
              <Feather name="x" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* 搜索类型选择器 */}
        <View style={styles.searchTypeContainer}>
          <TouchableOpacity 
            style={[styles.searchTypeBtn, searchType === 'order' && styles.searchTypeBtnActive]}
            onPress={() => handleSearchTypeChange('order')}
          >
            <Text style={[styles.searchTypeText, searchType === 'order' && styles.searchTypeTextActive]}>
              订单号
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.searchTypeBtn, searchType === 'customer' && styles.searchTypeBtnActive]}
            onPress={() => handleSearchTypeChange('customer')}
          >
            <Text style={[styles.searchTypeText, searchType === 'customer' && styles.searchTypeTextActive]}>
              客户名称
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.searchTypeBtn, searchType === 'batch' && styles.searchTypeBtnActive]}
            onPress={() => handleSearchTypeChange('batch')}
          >
            <Text style={[styles.searchTypeText, searchType === 'batch' && styles.searchTypeTextActive]}>
              批次号
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* 统计信息 */}
        <View style={styles.statsContainer}>
          {/* 总数概览 */}
          <View style={styles.statsOverview}>
            <Text style={styles.statsOverviewText}>总订单 <Text style={styles.statsOverviewNum}>{stats.totalOrders}</Text></Text>
            <Text style={styles.statsOverviewDivider}>|</Text>
            <TouchableOpacity onPress={() => handleOpenMaterials(false)}>
              <Text style={styles.statsOverviewText}>总物料 <Text style={styles.statsOverviewNum}>{stats.totalMaterials}</Text></Text>
            </TouchableOpacity>
            <Text style={styles.statsOverviewDivider}>|</Text>
            <Text style={styles.statsOverviewText}>总数量 <Text style={styles.statsOverviewNum}>{stats.totalQuantity.toLocaleString()}</Text></Text>
          </View>
          {/* 今日统计卡片 */}
          <View style={styles.statsCards}>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => {
                setShowTodayOrdersOnly(true);
                setAllOrdersModalVisible(true);
              }}
            >
              <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.todayOrders}</Text>
              <Text style={styles.statLabel}>今日订单</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statCard, { marginRight: 0 }]}
              onPress={() => handleOpenMaterials(true)}
            >
              <Text style={[styles.statNumber, { color: theme.accent }]}>{stats.todayMaterials}</Text>
              <Text style={styles.statLabel}>今日物料</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 订单列表 */}
        <View style={styles.recentOrders}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>订单列表</Text>
              <Text style={styles.sectionTip}>点击展开查看物料，长按删除订单</Text>
            </View>
          </View>
          
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="file-text" size={48} color={theme.textMuted} />
              <Text style={styles.emptyText}>
                {searchText ? '未找到匹配的订单' : '暂无订单'}
              </Text>
              <Text style={styles.emptyTip}>
                {searchText ? '请尝试其他关键词' : '扫码时会自动创建订单'}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <View key={order.id}>
                {/* 订单卡片 */}
                <AnimatedCard
                  onPress={() => handleToggleOrder(order)}
                  onLongPress={() => handleDeleteOrder(order)}
                >
                  <View style={[
                    styles.orderItem,
                    expandedOrderId === order.id && styles.orderItemExpanded
                  ]}>
                    <View style={styles.orderHeader}>
                      <View style={styles.orderHeaderLeft}>
                        <Feather 
                          name={expandedOrderId === order.id ? "chevron-down" : "chevron-right"} 
                          size={18} 
                          color={theme.textSecondary} 
                        />
                        <Text style={styles.orderNo} numberOfLines={1} ellipsizeMode="tail">{order.order_no}</Text>
                      </View>
                      <Text style={styles.orderDate}>
                        {formatDate(new Date(order.created_at))}
                      </Text>
                    </View>
                    
                    <View style={styles.orderContent}>
                      <View style={styles.orderInfo}>
                        {order.customer_name ? (
                          <Text style={styles.customerName}>
                            <Feather name="user" size={14} color={theme.textMuted} /> {order.customer_name}
                          </Text>
                        ) : (
                          <Text style={styles.noCustomer}>点击设置客户名称</Text>
                        )}
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.editBtn}
                        onPress={() => handleEditCustomer(order)}
                      >
                        <Feather 
                          name={order.customer_name ? "edit-2" : "plus"} 
                          size={16} 
                          color={theme.primary} 
                        />
                        <Text style={styles.editBtnText}>
                          {order.customer_name ? '编辑' : '设置'}
                        </Text>
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
                          <TouchableOpacity 
                            style={styles.materialMainInfo}
                            onPress={() => handleViewMaterial(material)}
                            onLongPress={() => handleDeleteMaterial(material)}
                          >
                            <Text style={styles.materialModel}>{material.model || '未知型号'}</Text>
                            <Text style={styles.materialDetails}>批次: {material.batch || '-'}</Text>
                            <Text style={styles.materialDetails}>
                              {material.isUnpacked 
                                ? `已发货: ${material.quantity || '-'}`
                                : `数量: ${material.quantity || '-'}`
                              }
                            </Text>
                            <Text style={styles.materialDate}>
                              {formatDate(new Date(material.scanned_at))}
                            </Text>
                          </TouchableOpacity>
                          
                          {/* 操作按钮 */}
                          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                            {/* 编辑按钮 */}
                            <TouchableOpacity 
                              style={[styles.unpackBtn, { backgroundColor: theme.backgroundTertiary }]}
                              onPress={() => handleOpenEditMaterial(material)}
                            >
                              <Feather name="edit-2" size={14} color={theme.textPrimary} />
                              <Text style={[styles.unpackBtnText, { color: theme.textPrimary }]}>编辑</Text>
                            </TouchableOpacity>
                            
                            {/* 拆包按钮 */}
                            <TouchableOpacity 
                              style={styles.unpackBtn}
                              onPress={() => handleOpenUnpack(material)}
                            >
                              <Feather name="scissors" size={14} color={theme.primary} />
                              <Text style={styles.unpackBtnText}>拆包</Text>
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
      
      {/* 编辑客户名称弹窗 */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
        hardwareAccelerated
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>设置客户名称</Text>
              <Text style={styles.modalSubtitle}>订单号: {editingOrder?.order_no}</Text>
              <TextInput
                ref={customerNameInputRef}
                style={styles.modalInput}
                placeholder="输入客户名称"
                placeholderTextColor={theme.textMuted}
                value={editCustomerName}
                onChangeText={setEditCustomerName}
                showSoftInputOnFocus={true}
                autoFocus
              />
              <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingOrder(null);
                  setEditCustomerName('');
                }}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveCustomer}
              >
                <Text style={styles.modalSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* 所有订单弹窗 */}
      <Modal
        visible={allOrdersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAllOrdersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.orderListContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
              <Text style={styles.modalTitle}>
                {showTodayOrdersOnly ? '今日订单' : '所有订单'} ({showTodayOrdersOnly ? orders.filter(o => o.created_at.startsWith(new Date().toISOString().slice(0, 10))).length : orders.length})
              </Text>
              <TouchableOpacity onPress={() => {
                setAllOrdersModalVisible(false);
                setShowTodayOrdersOnly(false);
              }}>
                <Feather name="x" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {(() => {
                const today = new Date().toISOString().slice(0, 10);
                const displayOrders = showTodayOrdersOnly 
                  ? orders.filter(o => o.created_at.startsWith(today))
                  : orders;
                
                if (displayOrders.length === 0) {
                  return (
                    <Text style={{ textAlign: 'center', color: theme.textMuted, paddingVertical: Spacing.xl }}>
                      {showTodayOrdersOnly ? '今日暂无订单' : '暂无订单'}
                    </Text>
                  );
                }
                
                return displayOrders.map((order, index) => (
                  <TouchableOpacity
                    key={order.id}
                    style={[styles.orderListItem, index === displayOrders.length - 1 && styles.orderListItemLast]}
                    onPress={() => {
                      // 关闭弹窗
                      setAllOrdersModalVisible(false);
                      setShowTodayOrdersOnly(false);
                      // 清空搜索条件
                      setSearchText('');
                      // 重置过滤列表为完整订单列表
                      setFilteredOrders(orders);
                      // 展开该订单
                      handleToggleOrder(order);
                    }}
                  >
                    <View>
                      <Text style={styles.orderListItemNo}>{order.order_no}</Text>
                      <Text style={styles.orderListItemInfo}>
                        {order.customer_name || '未设置客户'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: rf(12), color: theme.textMuted }}>
                      {formatDate(new Date(order.created_at))}
                    </Text>
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setAllOrdersModalVisible(false);
                setShowTodayOrdersOnly(false);
              }}
            >
              <Text style={styles.modalCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 物料汇总弹窗 */}
      <Modal
        visible={materialsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMaterialsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.orderListContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
              <View>
                <Text style={styles.modalTitle}>{showTodayOnly ? '今日物料' : '物料汇总'}</Text>
                <Text style={{ fontSize: rf(13), color: theme.textSecondary, marginTop: 2 }}>
                  {materialSummaries.length} 种型号 · 总数量 {materialTotalQuantity.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMaterialsModalVisible(false)}>
                <Feather name="x" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 450 }}>
              {materialSummaries.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.textMuted, paddingVertical: Spacing.xl }}>
                  暂无物料数据
                </Text>
              ) : (
                materialSummaries.map((summary, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      backgroundColor: theme.backgroundTertiary,
                      borderRadius: BorderRadius.lg,
                      padding: Spacing.md,
                      marginBottom: Spacing.sm,
                    }}
                    onPress={() => handleOpenMaterialDetail(summary.model)}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: Spacing.xs,
                    }}>
                      <Text style={{ fontSize: rf(16), fontWeight: '700', color: theme.textPrimary, flex: 1 }} numberOfLines={1}>
                        {summary.model}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="chevron-right" size={16} color={theme.textMuted} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
                      <View>
                        <Text style={{ fontSize: rf(11), color: theme.textMuted }}>扫码次数</Text>
                        <Text style={{ fontSize: rf(14), fontWeight: '600', color: theme.textPrimary }}>{summary.count} 次</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: rf(11), color: theme.textMuted }}>总数量</Text>
                        <Text style={{ fontSize: rf(14), fontWeight: '600', color: theme.primary }}>{summary.totalQuantity.toLocaleString()}</Text>
                      </View>
                      {summary.todayCount > 0 && (
                        <View>
                          <Text style={{ fontSize: rf(11), color: theme.textMuted }}>今日</Text>
                          <Text style={{ fontSize: rf(14), fontWeight: '600', color: theme.accent }}>{summary.todayCount}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setMaterialsModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 物料详情弹窗（按型号筛选） */}
      <Modal
        visible={materialDetailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMaterialDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.orderListContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
              <View>
                <Text style={styles.modalTitle}>{selectedModel}</Text>
                <Text style={{ fontSize: rf(13), color: theme.textSecondary, marginTop: 2 }}>
                  共 {selectedModelMaterials.length} 条记录
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMaterialDetailModalVisible(false)}>
                <Feather name="x" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 450 }}>
              {selectedModelMaterials.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.textMuted, paddingVertical: Spacing.xl }}>
                  暂无数据
                </Text>
              ) : (
                selectedModelMaterials.map((material, index) => (
                  <TouchableOpacity
                    key={material.id || index}
                    style={{
                      backgroundColor: theme.backgroundTertiary,
                      borderRadius: BorderRadius.lg,
                      padding: Spacing.md,
                      marginBottom: Spacing.sm,
                    }}
                    onPress={() => {
                      setMaterialDetailModalVisible(false);
                      router.push('/detail', { id: material.id });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
                      <Text style={{ fontSize: rf(14), fontWeight: '600', color: theme.textPrimary }}>
                        {material.traceNo || '无追踪码'}
                      </Text>
                      <Text style={{ fontSize: rf(12), color: theme.textMuted }}>
                        {formatDate(new Date(material.scanned_at))}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
                      <View>
                        <Text style={{ fontSize: rf(11), color: theme.textMuted }}>数量</Text>
                        <Text style={{ fontSize: rf(14), fontWeight: '600', color: theme.textPrimary }}>{material.quantity}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: rf(11), color: theme.textMuted }}>批次</Text>
                        <Text style={{ fontSize: rf(13), color: theme.textSecondary }}>{material.batch || '-'}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: rf(11), color: theme.textMuted }}>订单</Text>
                        <Text style={{ fontSize: rf(13), color: theme.textSecondary }}>{material.order_no}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setMaterialDetailModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* 拆包弹窗 */}
      <Modal
        visible={unpackModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnpackModalVisible(false)}
      >
        <View style={unpackModalStyles.modalOverlay}>
          <View style={[unpackModalStyles.modalContent, { maxHeight: '85%' }]}>
            <View style={unpackModalStyles.modalHeader}>
              <Text style={unpackModalStyles.modalTitle}>拆包打印</Text>
              <TouchableOpacity onPress={() => setUnpackModalVisible(false)}>
                <Text style={unpackModalStyles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={unpackModalStyles.modalBody}
              contentContainerStyle={unpackModalStyles.modalBodyContent}
              showsVerticalScrollIndicator={true}
            >
              {/* 物料信息 */}
              <View style={unpackModalStyles.infoBox}>
                <View style={unpackModalStyles.infoRow}>
                  <Text style={unpackModalStyles.infoLabel}>追踪码</Text>
                  <Text style={unpackModalStyles.infoValue}>{unpackingMaterial?.traceNo || '-'}</Text>
                </View>
                <View style={unpackModalStyles.infoRow}>
                  <Text style={unpackModalStyles.infoLabel}>型号</Text>
                  <Text style={unpackModalStyles.infoValue}>{unpackingMaterial?.model}</Text>
                </View>
                <View style={unpackModalStyles.infoRow}>
                  <Text style={unpackModalStyles.infoLabel}>批次</Text>
                  <Text style={unpackModalStyles.infoValue}>{unpackingMaterial?.batch || '-'}</Text>
                </View>
                <View style={unpackModalStyles.infoRow}>
                  <Text style={unpackModalStyles.infoLabel}>原始数量</Text>
                  <Text style={[unpackModalStyles.infoValue, { color: theme.textMuted }]}>
                    {unpackingMaterial?.original_quantity || unpackingMaterial?.quantity}
                  </Text>
                </View>
                <View style={unpackModalStyles.infoRow}>
                  <Text style={unpackModalStyles.infoLabel}>剩余数量</Text>
                  <Text style={[unpackModalStyles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
                    {unpackingMaterial?.remaining_quantity || unpackingMaterial?.quantity}
                  </Text>
                </View>
                {unpackingMaterial?.sourceNo && (
                  <View style={unpackModalStyles.infoRow}>
                    <Text style={unpackModalStyles.infoLabel}>箱号</Text>
                    <Text style={unpackModalStyles.infoValue}>{unpackingMaterial.sourceNo}</Text>
                  </View>
                )}
              </View>
              
              {/* 拆包历史 */}
              {unpackHistory.length > 0 && (
                <View style={{ marginBottom: Spacing.md }}>
                  <Text style={[unpackModalStyles.inputLabel, { marginBottom: Spacing.sm }]}>
                    拆包历史（共{unpackHistory.length}次）
                  </Text>
                  {unpackHistory.map((record, index) => (
                    <View 
                      key={record.id} 
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: theme.backgroundTertiary,
                        paddingHorizontal: Spacing.md,
                        paddingVertical: Spacing.sm,
                        borderRadius: BorderRadius.sm,
                        marginBottom: Spacing.xs,
                      }}
                    >
                      <Text style={{ fontSize: rf(13), color: theme.textSecondary }}>
                        {record.new_traceNo}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: rf(13), color: theme.textPrimary, fontWeight: '600' }}>
                          {record.new_quantity}个
                        </Text>
                        <Text style={{ fontSize: rf(11), color: theme.textMuted }}>
                          {formatDate(new Date(record.unpacked_at))}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
              {/* 新追踪码（自动生成） */}
              <Text style={unpackModalStyles.inputLabel}>新追踪码（自动生成）</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center' }]}>
                <Text style={{ fontSize: rf(16), fontWeight: '600', color: theme.primary }}>
                  {unpackNewTraceNo || '-'}
                </Text>
              </View>
              
              {/* 拆出数量 */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg }}>
                <Text style={unpackModalStyles.inputLabel}>拆出数量 *</Text>
                <Text style={{ fontSize: rf(13), color: theme.textMuted }}>
                  可拆: {unpackingMaterial?.remaining_quantity || unpackingMaterial?.quantity || 0} 个
                </Text>
              </View>
              <TextInput
                ref={unpackQuantityRef}
                style={unpackModalStyles.textInput}
                placeholder="输入要拆出的数量"
                placeholderTextColor={theme.textMuted}
                value={unpackNewQuantity}
                onChangeText={setUnpackNewQuantity}
                keyboardType="number-pad"
                showSoftInputOnFocus={true}
              />
              
              {/* 剩余数量预览 */}
              {unpackNewQuantity && !isNaN(parseInt(unpackNewQuantity, 10)) && (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.md,
                  marginTop: Spacing.sm,
                }}>
                  <Text style={{ fontSize: rf(14), color: theme.textSecondary }}>剩余标签数量</Text>
                  <Text style={{ fontSize: rf(16), fontWeight: '600', color: theme.textPrimary }}>
                    {Math.max(0, parseInt(unpackingMaterial?.remaining_quantity || unpackingMaterial?.quantity || '0', 10) - parseInt(unpackNewQuantity, 10))} 个
                  </Text>
                </View>
              )}
              
              {/* 备注 */}
              <Text style={unpackModalStyles.inputLabel}>备注（可选）</Text>
              <TextInput
                ref={unpackNotesRef}
                style={[unpackModalStyles.textInput, { minHeight: Spacing["2xl"], textAlignVertical: 'top' }]}
                placeholder="添加备注信息"
                placeholderTextColor={theme.textMuted}
                value={unpackNotes}
                onChangeText={setUnpackNotes}
                multiline
                showSoftInputOnFocus={true}
              />
            </ScrollView>
            
            <View style={unpackModalStyles.modalFooter}>
              <TouchableOpacity
                style={unpackModalStyles.cancelButton}
                onPress={() => setUnpackModalVisible(false)}
              >
                <Text style={unpackModalStyles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={unpackModalStyles.saveButton}
                onPress={handleConfirmUnpack}
                disabled={unpacking}
              >
                <Text style={unpackModalStyles.saveButtonText}>
                  {unpacking ? '处理中...' : '确认拆包'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 编辑物料弹窗 */}
      <Modal
        visible={editMaterialModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditMaterialModalVisible(false)}
      >
        <View style={unpackModalStyles.modalOverlay}>
          <View style={[unpackModalStyles.modalContent, { maxHeight: '90%' }]}>
            <View style={unpackModalStyles.modalHeader}>
              <Text style={unpackModalStyles.modalTitle}>编辑物料</Text>
              <TouchableOpacity onPress={() => setEditMaterialModalVisible(false)}>
                <Text style={unpackModalStyles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={unpackModalStyles.modalBody}>
              {/* 追踪码（只读） */}
              <Text style={unpackModalStyles.inputLabel}>追踪码（不可修改）</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editingMaterial?.traceNo || '-'}
                </Text>
              </View>
              
              {/* 原始数量（只读） */}
              <Text style={unpackModalStyles.inputLabel}>原始扫描数量</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editingMaterial?.original_quantity || editingMaterial?.quantity || '-'}
                </Text>
              </View>
              
              {/* 型号（只读） */}
              <Text style={unpackModalStyles.inputLabel}>型号（不可修改）</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editMaterialData.model || '-'}
                </Text>
              </View>
              
              {/* 批次（只读） */}
              <Text style={unpackModalStyles.inputLabel}>批次（不可修改）</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editMaterialData.batch || '-'}
                </Text>
              </View>
              
              {/* 数量 */}
              <Text style={unpackModalStyles.inputLabel}>数量 *</Text>
              <TextInput
                style={unpackModalStyles.textInput}
                placeholder={`最多 ${editingMaterial?.original_quantity || editingMaterial?.quantity || 0} 个`}
                placeholderTextColor={theme.textMuted}
                value={editMaterialData.quantity}
                onChangeText={(text) => setEditMaterialData(prev => ({ ...prev, quantity: text }))}
                keyboardType="number-pad"
                showSoftInputOnFocus={true}
              />
              
              {/* 封装（只读） */}
              <Text style={unpackModalStyles.inputLabel}>封装（不可修改）</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editMaterialData.package || '-'}
                </Text>
              </View>
              
              {/* 版本号（只读） */}
              <Text style={unpackModalStyles.inputLabel}>版本号（不可修改）</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editMaterialData.version || '-'}
                </Text>
              </View>
              
              {/* 生产日期（只读） */}
              <Text style={unpackModalStyles.inputLabel}>生产日期（不可修改）</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editMaterialData.productionDate || '-'}
                </Text>
              </View>
              
              {/* 箱号（只读） */}
              <Text style={unpackModalStyles.inputLabel}>箱号（不可修改）</Text>
              <View style={[unpackModalStyles.textInput, { justifyContent: 'center', backgroundColor: theme.backgroundTertiary, opacity: 0.7 }]}>
                <Text style={{ fontSize: rf(16), color: theme.textSecondary }}>
                  {editMaterialData.sourceNo || '-'}
                </Text>
              </View>
            </ScrollView>
            
            <View style={unpackModalStyles.modalFooter}>
              <TouchableOpacity
                style={unpackModalStyles.cancelButton}
                onPress={() => setEditMaterialModalVisible(false)}
              >
                <Text style={unpackModalStyles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={unpackModalStyles.saveButton}
                onPress={handleConfirmEditMaterial}
                disabled={savingMaterial}
              >
                <Text style={unpackModalStyles.saveButtonText}>
                  {savingMaterial ? '保存中...' : '保存'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 自定义弹窗 */}
      <Modal
        visible={customAlert.visible}
        transparent
        animationType="fade"
        onRequestClose={closeCustomAlert}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Spacing["2xl"],
        }}>
          <View style={{
            width: '100%',
            maxWidth: 320,
            borderRadius: BorderRadius.xl,
            padding: Spacing.xl,
            alignItems: 'center',
            backgroundColor: theme.backgroundDefault,
          }}>
            {/* 图标 */}
            {customAlert.icon && (
              <View style={{
                width: 72,
                height: 72,
                borderRadius: BorderRadius["4xl"],
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Spacing.lg,
                backgroundColor: customAlert.icon === 'success' ? 'rgba(16, 185, 129, 0.12)' 
                  : customAlert.icon === 'warning' ? 'rgba(245, 158, 11, 0.12)'
                  : customAlert.icon === 'error' ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(59, 130, 246, 0.12)',
                shadowColor: customAlert.icon === 'success' ? theme.success 
                  : customAlert.icon === 'warning' ? theme.warning
                  : customAlert.icon === 'error' ? theme.error
                  : theme.info,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 14,
                elevation: 4,
              }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: BorderRadius["2xl"],
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: customAlert.icon === 'success' ? theme.success 
                    : customAlert.icon === 'warning' ? theme.warning
                    : customAlert.icon === 'error' ? theme.error
                    : theme.info,
                }}>
                  <FontAwesome6 
                    name={
                      customAlert.icon === 'success' ? 'check' 
                      : customAlert.icon === 'warning' ? 'triangle-exclamation'
                      : customAlert.icon === 'error' ? 'xmark'
                      : 'info'
                    }
                    size={24} 
                    color={theme.white}
                  />
                </View>
              </View>
            )}
            
            {/* 标题 */}
            <Text style={{
              fontSize: rf(18),
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: Spacing.sm,
              color: theme.textPrimary,
            }}>
              {customAlert.title}
            </Text>
            
            {/* 消息内容 */}
            <Text style={{
              fontSize: rf(14),
              lineHeight: Spacing.xl,
              textAlign: 'center',
              marginBottom: Spacing.xl,
              color: theme.textSecondary,
            }}>
              {customAlert.message}
            </Text>
            
            {/* 按钮组 */}
            <View style={{
              flexDirection: 'row',
              gap: Spacing.md,
              width: '100%',
            }}>
              {customAlert.buttons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';
                const bgColor = isDestructive ? theme.error 
                  : isCancel ? theme.backgroundTertiary 
                  : theme.primary;
                const textColor = isDestructive ? theme.white 
                  : isCancel ? theme.textPrimary 
                  : theme.buttonPrimaryText;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={{
                      flex: customAlert.buttons.length === 1 ? 0 : 1,
                      width: customAlert.buttons.length === 1 ? '100%' : undefined,
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.lg,
                      borderRadius: BorderRadius.lg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: Spacing["2xl"],
                      backgroundColor: bgColor,
                      borderWidth: isCancel ? 1.5 : 0,
                      borderColor: isCancel ? theme.border : 'transparent',
                    }}
                    onPress={() => {
                      closeCustomAlert();
                      button.onPress?.();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontSize: rf(16),
                      fontWeight: '600',
                      color: textColor,
                    }}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
