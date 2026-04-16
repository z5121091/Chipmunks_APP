import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '@/constants/version';
import { getISODateTime, formatDateTime } from './time';

// 存储键
const ORDERS_KEY = '@warehouse_orders';
const MATERIALS_KEY = '@warehouse_materials';
const RULES_KEY = '@warehouse_qrcode_rules';
const CUSTOM_FIELDS_KEY = '@warehouse_custom_fields';
const UNPACK_RECORDS_KEY = '@warehouse_unpack_records';
const PRINT_HISTORY_KEY = '@warehouse_print_history';

// V3.0 新增存储键
const WAREHOUSES_KEY = '@warehouse_warehouses';
const INVENTORY_BINDINGS_KEY = '@warehouse_inventory_bindings';
const INBOUND_RECORDS_KEY = '@warehouse_inbound_records';
const INVENTORY_RECORDS_KEY = '@warehouse_inventory_records';

// 数据版本管理
const DATA_VERSION_KEY = '@warehouse_data_version';
const CURRENT_DATA_VERSION = 10; // 更新此版本号触发迁移

// 匹配条件接口（简化版：指定位置字段包含指定关键字）
export interface MatchCondition {
  fieldIndex: number;           // 字段位置（从0开始）
  keyword: string;              // 匹配关键字（字段值包含此关键字即匹配）
}

// 二维码解析规则接口
export interface QRCodeRule {
  id: string;
  name: string;           // 厂家/规则名称，如"极海半导体"
  description: string;    // 规则描述
  separator: string;      // 分隔符，如 "/"、","、"*"等
  fieldOrder: string[];   // 字段顺序，标准字段用原名称（如"model"），自定义字段用"custom:字段ID"格式
  customFieldIds?: string[]; // 关联的自定义字段ID列表（已弃用，保留兼容性）
  isActive: boolean;      // 是否启用
  supplierName?: string;  // 供应商名称（可选）
  matchConditions?: MatchCondition[]; // 识别条件（可选，用于区分相同分隔符和字段数的规则）
  created_at: string;
  updated_at: string;
}

// 字段定义（用于显示）
export const FIELD_LABELS: Record<string, string> = {
  model: '型号',
  batch: '批次', 
  package: '封装',
  version: '版本号',
  quantity: '数量',
  productionDate: '生产日期',
  traceNo: '追踪码',
  sourceNo: '箱号',
};

// 固定字段顺序（极海半导体标准格式：型号/批次/封装/版本/数量/生产日期/追踪码/箱号）
// 这个顺序是固定的，无论用户用什么分隔符，都会按这个顺序提取值
export const STANDARD_FIELD_ORDER = [
  'model',          // 0: 型号
  'batch',          // 1: 批次
  'package',        // 2: 封装
  'version',        // 3: 版本号
  'quantity',       // 4: 数量
  'productionDate', // 5: 生产日期
  'traceNo',        // 6: 追踪码
  'sourceNo',       // 7: 箱号
];

// 可用字段列表
export const AVAILABLE_FIELDS = [
  'model',
  'batch', 
  'package',
  'version',
  'quantity',
  'productionDate',
  'traceNo',
  'sourceNo',
];

// 判断是否为自定义字段
export const isCustomField = (field: string): boolean => {
  return field.startsWith('custom:');
};

// 获取自定义字段ID
export const getCustomFieldId = (field: string): string => {
  return field.replace('custom:', '');
};

// 创建自定义字段标识
export const createCustomFieldKey = (fieldId: string): string => {
  return `custom:${fieldId}`;
};

// 自定义字段定义接口
export interface CustomField {
  id: string;
  name: string;           // 字段名称（显示名称）
  type: 'text' | 'number' | 'date' | 'select';  // 字段类型
  required: boolean;      // 是否必填
  options?: string[];     // 选择类型的选项
  sortOrder: number;      // 排序顺序
  created_at: string;
  updated_at: string;
}

// 物料记录接口（完整版，包含极海半导体所有字段）
export interface MaterialRecord {
  id: string;
  order_no: string;
  customer_name: string;
  rule_id?: string;       // 使用的规则ID
  rule_name?: string;     // 使用的规则名称
  // 核心字段
  model: string;          // 型号
  batch: string;          // 批次
  quantity: string;       // 未拆包时为原始数量，拆包后为累计发货数量
  // 扩展字段
  package: string;        // 封装
  version: string;        // 版本号
  productionDate: string; // 生产日期年周
  traceNo: string;        // 追踪码
  sourceNo: string;       // 箱号
  // 系统字段
  scanned_at: string;
  raw_content: string;
  // 自定义字段
  customFields?: Record<string, string>;  // 自定义字段值，key为字段ID
  // 拆包相关
  isUnpacked?: boolean;      // 是否已拆包
  unpackCount?: number;      // 拆包次数
  original_quantity?: string; // 原始数量（第一次拆包时记录）
  remaining_quantity?: string; // 剩余数量（用于下次扫码拆包）
  // V3.0 新增字段
  warehouse_id?: string;     // 仓库ID
  warehouse_name?: string;   // 仓库名称（冗余存储）
  inventory_code?: string;   // 存货编码
}

// 订单接口
export interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  created_at: string;
  // V3.0 新增字段
  warehouse_id?: string;  // 仓库ID
  warehouse_name?: string; // 仓库名称（冗余存储，方便显示）
}

// ============== V3.0 新增接口 ==============

// 仓库接口
export interface Warehouse {
  id: string;
  name: string;           // 仓库名称
  description?: string;   // 仓库描述
  is_default?: boolean;   // 是否默认仓库
  created_at: string;
  updated_at: string;
}

// 物料管理接口（型号-存货编码绑定）
export interface InventoryBinding {
  id: string;
  scan_model: string;     // 扫描型号
  inventory_code: string; // 存货编码
  supplier?: string;      // 供应商
  description?: string;   // 描述备注
  created_at: string;
  updated_at: string;
}

// 入库记录接口
export interface InboundRecord {
  id: string;
  inbound_no: string;     // 入库单号（RK+日期+序号）
  warehouse_id: string;   // 仓库ID
  warehouse_name: string; // 仓库名称（冗余存储）
  inventory_code: string; // 存货编码
  scan_model: string;     // 扫描型号
  batch: string;          // 批次
  quantity: number;       // 数量（数值类型，便于Excel求和）
  in_date: string;        // 入库日期
  notes?: string;         // 备注
  rawContent?: string;    // 原始二维码内容（新增）
  created_at: string;
  // 扩展字段
  package?: string;       // 封装
  version?: string;       // 版本号
  productionDate?: string; // 生产日期
  traceNo?: string;       // 追踪码
  sourceNo?: string;      // 箱号
}

// 盘点记录接口
export interface InventoryCheckRecord {
  id: string;
  check_no: string;       // 盘点单号（PD+日期+序号）
  warehouse_id: string;   // 仓库ID
  warehouse_name: string; // 仓库名称（冗余存储）
  inventory_code: string; // 存货编码
  scan_model: string;     // 扫描型号
  batch: string;          // 批次
  quantity: number;       // 数量（数值类型）
  check_type: 'whole' | 'partial';  // 整包/拆包
  actual_quantity?: number; // 实际数量（拆包时填写）
  check_date: string;     // 盘点日期
  notes?: string;         // 备注
  created_at: string;
  // 扩展字段
  package?: string;       // 封装
  version?: string;       // 版本号
  productionDate?: string; // 生产日期
  traceNo?: string;       // 追踪码
  sourceNo?: string;      // 箱号
}

// ============== 拆包记录相关接口 ==============

// 拆包记录接口
export interface UnpackRecord {
  id: string;
  // 关联原物料
  original_material_id: string;
  // 物料信息（冗余存储，方便查询）
  order_no: string;
  customer_name: string;
  model: string;
  batch: string;
  package: string;
  version: string;
  // V3.0 新增：仓库信息
  warehouse_id?: string;
  warehouse_name?: string;
  // V3.0 新增：存货编码
  inventory_code?: string;
  // 数量信息
  original_quantity: string;   // 原数量（拆包前的总数）
  new_quantity: string;        // 当前标签数量
  // 溯源信息
  productionDate: string;
  traceNo: string;             // 原追踪码
  new_traceNo: string;         // 新追踪码（拆包生成）
  sourceNo: string;            // 箱号（不变）
  // 标签类型：shipped=发货标签（拆出的部分），remaining=剩余标签（剩余的部分）
  label_type: 'shipped' | 'remaining';
  // 关联ID：发货标签和剩余标签是一对，通过这个字段关联
  pair_id: string;
  // 状态
  status: 'pending' | 'printed';  // pending(待打印) / printed(已打印)
  // 备注
  notes: string;
  // 操作信息
  unpacked_at: string;         // 拆包时间
  printed_at: string | null;   // 打印时间
  created_at: string;
  updated_at: string;
}

// 打印历史接口
export interface PrintHistory {
  id: string;
  // 关联拆包记录
  unpack_record_ids: string[];  // 支持批量
  // 导出信息
  export_format: 'csv' | 'excel' | 'json';
  export_file_path: string | null;
  // 打印信息
  printed_at: string;
  print_count: number;          // 打印份数
  created_at: string;
}

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// 初始化数据库（兼容性函数，AsyncStorage 无需初始化）
export const initDatabase = async (): Promise<void> => {
  try {
    // 检查是否已有数据，没有则初始化空数组
    const keys = [
      ORDERS_KEY, 
      MATERIALS_KEY, 
      UNPACK_RECORDS_KEY, 
      PRINT_HISTORY_KEY,
      // V3.0 新增
      WAREHOUSES_KEY,
      INVENTORY_BINDINGS_KEY,
      INBOUND_RECORDS_KEY,
      INVENTORY_RECORDS_KEY,
    ];
    
    for (const key of keys) {
      const data = await AsyncStorage.getItem(key);
      if (data === null) {
        await AsyncStorage.setItem(key, JSON.stringify([]));
      }
    }
    
    // 执行数据版本迁移
    await runMigrations();
    
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
};

// 数据版本迁移
const runMigrations = async (): Promise<void> => {
  try {
    const storedVersionStr = await AsyncStorage.getItem(DATA_VERSION_KEY);
    const storedVersion = storedVersionStr ? parseInt(storedVersionStr, 10) : 0;
    
    if (storedVersion >= CURRENT_DATA_VERSION) {
      console.log(`数据版本已是最新: v${storedVersion}`);
      return;
    }
    
    console.log(`开始数据迁移: v${storedVersion} -> v${CURRENT_DATA_VERSION}`);
    
    // 执行版本迁移
    for (let version = storedVersion + 1; version <= CURRENT_DATA_VERSION; version++) {
      console.log(`执行迁移 v${version}...`);
      switch (version) {
        case 1:
          // v1: 初始版本，确保所有 key 存在
          break;
        case 2:
          // v2: 添加拆包记录相关字段
          await migrateToV2();
          break;
        case 3:
          // v3: 修复物料记录中的数量字段
          await migrateToV3();
          break;
        case 4:
          // v4: 添加规则和自定义字段
          break;
        case 5:
          // v5: 确保所有物料有正确的拆包状态
          await migrateToV5();
          break;
        case 6:
          // v6: 修复拆包记录的标签类型
          await migrateToV6();
          break;
        case 7:
          // v7: 清理可能的脏数据
          await migrateToV7();
          break;
        case 8:
          // v8: 确保物料记录有正确的字段
          await migrateToV8();
          break;
        case 9:
          // v9: V3.0 数据结构升级
          await migrateToV9();
          break;
        case 10:
          // v10: 为拆包记录添加仓库字段
          await migrateToV10();
          break;
        default:
          break;
      }
    }
    
    // 更新版本号
    await AsyncStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION.toString());
    console.log('数据迁移完成');
  } catch (error) {
    console.error('数据迁移失败:', error);
    // 即使迁移失败也更新版本号，避免每次启动都尝试迁移
    await AsyncStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION.toString());
  }
};

// v2 迁移：添加拆包记录相关字段
const migrateToV2 = async (): Promise<void> => {
  const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
  const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
  
  let updated = false;
  for (const material of materials) {
    if (material.isUnpacked === undefined) {
      material.isUnpacked = false;
      updated = true;
    }
    if (material.remaining_quantity === undefined && material.quantity) {
      material.remaining_quantity = material.quantity;
      updated = true;
    }
  }
  
  if (updated) {
    await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    console.log('v2 迁移完成：添加拆包字段');
  }
};

// v3 迁移：修复物料记录中的数量字段
const migrateToV3 = async (): Promise<void> => {
  const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
  const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
  
  let updated = false;
  for (const material of materials) {
    // 确保原始数量存在
    if (!material.original_quantity && material.quantity) {
      material.original_quantity = material.quantity;
      updated = true;
    }
    // 确保剩余数量存在
    if (!material.remaining_quantity) {
      material.remaining_quantity = material.isUnpacked ? '0' : material.quantity;
      updated = true;
    }
  }
  
  if (updated) {
    await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    console.log('v3 迁移完成：修复数量字段');
  }
};

// v5 迁移：确保所有物料有正确的拆包状态
const migrateToV5 = async (): Promise<void> => {
  const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
  const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
  
  let updated = false;
  for (const material of materials) {
    // 检查是否有拆包记录
    const unpackData = await AsyncStorage.getItem(UNPACK_RECORDS_KEY);
    const unpackRecords: UnpackRecord[] = unpackData ? JSON.parse(unpackData) : [];
    const hasUnpackRecord = unpackRecords.some(r => r.original_material_id === material.id);
    
    if (hasUnpackRecord && !material.isUnpacked) {
      material.isUnpacked = true;
      updated = true;
    }
  }
  
  if (updated) {
    await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    console.log('v5 迁移完成：修复拆包状态');
  }
};

// v6 迁移：修复拆包记录的标签类型
const migrateToV6 = async (): Promise<void> => {
  const unpackData = await AsyncStorage.getItem(UNPACK_RECORDS_KEY);
  const unpackRecords: UnpackRecord[] = unpackData ? JSON.parse(unpackData) : [];
  
  let updated = false;
  for (const record of unpackRecords) {
    if (!record.label_type) {
      record.label_type = 'shipped';
      updated = true;
    }
    if (!record.pair_id) {
      record.pair_id = record.id;
      updated = true;
    }
    if (!record.status) {
      record.status = 'pending';
      updated = true;
    }
  }
  
  if (updated) {
    await AsyncStorage.setItem(UNPACK_RECORDS_KEY, JSON.stringify(unpackRecords));
    console.log('v6 迁移完成：修复拆包记录字段');
  }
};

// v7 迁移：清理可能的脏数据
const migrateToV7 = async (): Promise<void> => {
  // 清理物料中的无效数据
  const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
  const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
  
  const validMaterials = materials.filter(m => m.id && m.order_no);
  
  if (validMaterials.length !== materials.length) {
    await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(validMaterials));
    console.log(`v7 迁移完成：清理了 ${materials.length - validMaterials.length} 条无效物料记录`);
  }
};

// v8 迁移：确保物料记录有正确的字段
const migrateToV8 = async (): Promise<void> => {
  const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
  const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
  
  let updated = false;
  for (const material of materials) {
    // 确保 customFields 存在
    if (!material.customFields) {
      material.customFields = {};
      updated = true;
    }
    // 确保所有必需字段都有默认值
    const defaultFields = {
      model: material.model || '',
      batch: material.batch || '',
      quantity: material.quantity || '',
      package: material.package || '',
      version: material.version || '',
      productionDate: material.productionDate || '',
      traceNo: material.traceNo || '',
      sourceNo: material.sourceNo || '',
    };
    
    for (const [key, value] of Object.entries(defaultFields)) {
      if (material[key as keyof MaterialRecord] === undefined) {
        (material as any)[key] = value;
        updated = true;
      }
    }
  }
  
  if (updated) {
    await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    console.log('v8 迁移完成：确保物料字段完整');
  }
};

// v9 迁移：V3.0 数据结构升级
const migrateToV9 = async (): Promise<void> => {
  console.log('v9 迁移：初始化V3.0数据结构');
  
  // 1. 初始化仓库表（创建一个默认仓库）
  const warehousesData = await AsyncStorage.getItem(WAREHOUSES_KEY);
  if (!warehousesData) {
    const defaultWarehouse: Warehouse = {
      id: generateId(),
      name: '默认仓库',
      description: '系统默认创建的仓库',
      is_default: true,
      created_at: getISODateTime(),
      updated_at: getISODateTime(),
    };
    await AsyncStorage.setItem(WAREHOUSES_KEY, JSON.stringify([defaultWarehouse]));
    console.log('v9 迁移：创建默认仓库');
  }
  
  // 2. 初始化空的物料绑定表
  const bindingsData = await AsyncStorage.getItem(INVENTORY_BINDINGS_KEY);
  if (!bindingsData) {
    await AsyncStorage.setItem(INVENTORY_BINDINGS_KEY, JSON.stringify([]));
    console.log('v9 迁移：初始化物料绑定表');
  }
  
  // 3. 初始化空的入库记录表
  const inboundData = await AsyncStorage.getItem(INBOUND_RECORDS_KEY);
  if (!inboundData) {
    await AsyncStorage.setItem(INBOUND_RECORDS_KEY, JSON.stringify([]));
    console.log('v9 迁移：初始化入库记录表');
  }
  
  // 4. 初始化空的盘点记录表
  const inventoryData = await AsyncStorage.getItem(INVENTORY_RECORDS_KEY);
  if (!inventoryData) {
    await AsyncStorage.setItem(INVENTORY_RECORDS_KEY, JSON.stringify([]));
    console.log('v9 迁移：初始化盘点记录表');
  }
  
  // 5. 为现有物料和订单添加V3.0新字段（保留现有数据，新字段留空）
  const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
  if (materialsData) {
    const materials: MaterialRecord[] = JSON.parse(materialsData);
    let updated = false;
    for (const material of materials) {
      if (material.warehouse_id === undefined) {
        material.warehouse_id = '';
        updated = true;
      }
      if (material.warehouse_name === undefined) {
        material.warehouse_name = '';
        updated = true;
      }
      if (material.inventory_code === undefined) {
        material.inventory_code = '';
        updated = true;
      }
    }
    if (updated) {
      await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
      console.log('v9 迁移：物料表添加V3.0字段');
    }
  }
  
  const ordersData = await AsyncStorage.getItem(ORDERS_KEY);
  if (ordersData) {
    const orders: Order[] = JSON.parse(ordersData);
    let updated = false;
    for (const order of orders) {
      if (order.warehouse_id === undefined) {
        order.warehouse_id = '';
        updated = true;
      }
      if (order.warehouse_name === undefined) {
        order.warehouse_name = '';
        updated = true;
      }
    }
    if (updated) {
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      console.log('v9 迁移：订单表添加V3.0字段');
    }
  }
  
  console.log('v9 迁移完成：V3.0数据结构初始化成功');
};

// v10 迁移：为拆包记录添加仓库字段
const migrateToV10 = async (): Promise<void> => {
  console.log('v10 迁移：为拆包记录添加仓库字段');
  
  const unpackData = await AsyncStorage.getItem(UNPACK_RECORDS_KEY);
  if (unpackData) {
    const unpackRecords: UnpackRecord[] = JSON.parse(unpackData);
    let updated = false;
    for (const record of unpackRecords) {
      if (record.warehouse_id === undefined) {
        record.warehouse_id = '';
        updated = true;
      }
      if (record.warehouse_name === undefined) {
        record.warehouse_name = '';
        updated = true;
      }
      if (record.inventory_code === undefined) {
        record.inventory_code = '';
        updated = true;
      }
    }
    if (updated) {
      await AsyncStorage.setItem(UNPACK_RECORDS_KEY, JSON.stringify(unpackRecords));
      console.log('v10 迁移完成：拆包记录添加仓库字段');
    }
  }
};

// 添加或更新订单
export const upsertOrder = async (
  orderNo: string, 
  customerName?: string,
  warehouse?: { id: string; name: string }
): Promise<void> => {
  try {
    console.log('===== upsertOrder 开始 =====');
    console.log('订单号:', orderNo, '客户名称:', customerName, '仓库:', warehouse?.name);
    
    const ordersData = await AsyncStorage.getItem(ORDERS_KEY);
    const orders: Order[] = ordersData ? JSON.parse(ordersData) : [];
    
    const existingIndex = orders.findIndex(o => o.order_no === orderNo);
    console.log('订单索引:', existingIndex, '是否已存在:', existingIndex >= 0);
    
    if (existingIndex >= 0) {
      // 更新现有订单
      if (customerName) {
        orders[existingIndex].customer_name = customerName;
        console.log('已更新订单客户名称');
        
        // 同步更新仓库信息
        if (warehouse) {
          orders[existingIndex].warehouse_id = warehouse.id;
          orders[existingIndex].warehouse_name = warehouse.name;
        }
        
        // 同步更新该订单下所有物料的客户名称
        const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
        const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
        console.log('物料总数:', materials.length);
        
        let materialsUpdated = 0;
        materials.forEach(m => {
          if (m.order_no === orderNo) {
            console.log('找到物料:', m.model, '当前客户名称:', m.customer_name, '新客户名称:', customerName);
            if (m.customer_name !== customerName) {
              m.customer_name = customerName;
              materialsUpdated++;
            }
            // 同步更新仓库信息
            if (warehouse && m.warehouse_name !== warehouse.name) {
              m.warehouse_id = warehouse.id;
              m.warehouse_name = warehouse.name;
            }
          }
        });
        if (materialsUpdated > 0) {
          await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
          console.log(`已同步更新 ${materialsUpdated} 条物料的客户名称`);
        } else {
          console.log('没有需要更新的物料');
        }
        
        // 同步更新该订单下所有拆包记录（标签）的客户名称
        const unpackData = await AsyncStorage.getItem(UNPACK_RECORDS_KEY);
        const unpackRecords: UnpackRecord[] = unpackData ? JSON.parse(unpackData) : [];
        console.log('拆包记录总数:', unpackRecords.length);
        
        let unpackUpdated = 0;
        unpackRecords.forEach(r => {
          if (r.order_no === orderNo && r.customer_name !== customerName) {
            r.customer_name = customerName;
            unpackUpdated++;
          }
          // 同步更新仓库信息
          if (warehouse && r.warehouse_name !== warehouse.name) {
            r.warehouse_id = warehouse.id;
            r.warehouse_name = warehouse.name;
          }
        });
        if (unpackUpdated > 0) {
          await AsyncStorage.setItem(UNPACK_RECORDS_KEY, JSON.stringify(unpackRecords));
          console.log(`已同步更新 ${unpackUpdated} 条拆包记录的客户名称`);
        }
      }
    } else {
      // 创建新订单
      const newOrder: Order = {
        id: generateId(),
        order_no: orderNo,
        customer_name: customerName || '',
        created_at: getISODateTime(),
        warehouse_id: warehouse?.id || '',
        warehouse_name: warehouse?.name || '',
      };
      orders.unshift(newOrder); // 添加到开头
    }
    
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error('保存订单失败:', error);
    throw error;
  }
};

// 获取订单信息
export const getOrder = async (orderNo: string): Promise<Order | null> => {
  try {
    const ordersData = await AsyncStorage.getItem(ORDERS_KEY);
    const orders: Order[] = ordersData ? JSON.parse(ordersData) : [];
    
    return orders.find(o => o.order_no === orderNo) || null;
  } catch (error) {
    console.error('获取订单失败:', error);
    return null;
  }
};

// 获取所有订单
export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const ordersData = await AsyncStorage.getItem(ORDERS_KEY);
    return ordersData ? JSON.parse(ordersData) : [];
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return [];
  }
};

// 添加物料记录（完整版）
export const addMaterial = async (material: {
  order_no: string;
  customer_name: string;
  model: string;
  batch: string;
  quantity: string;
  package?: string;
  version?: string;
  productionDate?: string;
  traceNo?: string;
  sourceNo?: string;
  scanned_at?: string;
  raw_content: string;
  rule_id?: string;
  rule_name?: string;
  customFields?: Record<string, string>;
  // V3.0 新增字段
  warehouse_id?: string;
  warehouse_name?: string;
  inventory_code?: string;
}): Promise<string> => {
  try {
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    
    const newMaterial: MaterialRecord = {
      id: generateId(),
      order_no: material.order_no,
      customer_name: material.customer_name,
      rule_id: material.rule_id,
      rule_name: material.rule_name,
      model: material.model,
      batch: material.batch,
      quantity: material.quantity,
      package: material.package || '',
      version: material.version || '',
      productionDate: material.productionDate || '',
      traceNo: material.traceNo || '',
      sourceNo: material.sourceNo || '',
      scanned_at: material.scanned_at || getISODateTime(),
      raw_content: material.raw_content,
      customFields: material.customFields,
      // V3.0 新增字段
      warehouse_id: material.warehouse_id,
      warehouse_name: material.warehouse_name,
      inventory_code: material.inventory_code,
    };
    
    materials.unshift(newMaterial); // 添加到开头
    await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    
    return newMaterial.id;
  } catch (error) {
    console.error('添加物料记录失败:', error);
    throw error;
  }
};

// 获取物料记录
export const getMaterial = async (id: string): Promise<MaterialRecord | null> => {
  try {
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    
    return materials.find(m => m.id === id) || null;
  } catch (error) {
    console.error('获取物料记录失败:', error);
    return null;
  }
};

// 获取订单下的所有物料记录
export const getMaterialsByOrder = async (orderNo: string): Promise<MaterialRecord[]> => {
  try {
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    
    return materials.filter(m => m.order_no === orderNo);
  } catch (error) {
    console.error('获取订单物料失败:', error);
    return [];
  }
};

// 检查物料是否已存在（只检测追踪码，箱号可能重复不检测）
// 返回值：{ material: 物料记录, isUnpacked: 是否已拆包, canRescan: 是否可重复扫描 }
export const checkMaterialExists = async (
  orderNo: string, 
  model: string, 
  batch: string,
  sourceNo?: string,
  traceNo?: string,
  quantity?: string
): Promise<{ material: MaterialRecord | null; isUnpacked: boolean; canRescan: boolean }> => {
  try {
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    
    // 只检测追踪码（T/C），箱号可能重复不检测
    if (traceNo && traceNo.trim()) {
      // 1.1 检查同一订单下是否有相同追踪码
      const existingInSameOrder = materials.find(m => 
        m.order_no === orderNo &&
        m.traceNo && m.traceNo.trim() === traceNo.trim()
      );
      if (existingInSameOrder) {
        // 如果物料已拆包，允许重复扫描（用于继续拆包）
        if (existingInSameOrder.isUnpacked) {
          console.log('物料已拆包，允许重复扫描:', traceNo, '订单:', orderNo);
          return { material: existingInSameOrder, isUnpacked: true, canRescan: true };
        }
        console.log('物料重复（同一订单，追踪码相同）:', traceNo, '订单:', orderNo);
        return { material: existingInSameOrder, isUnpacked: false, canRescan: false };
      }
      
      // 1.2 检查不同订单下是否有相同追踪码
      const existingInOtherOrder = materials.find(m => 
        m.order_no !== orderNo &&  // 不同订单
        m.traceNo && m.traceNo.trim() === traceNo.trim()
      );
      if (existingInOtherOrder) {
        const scanQty = quantity || '';
        const remainingQty = existingInOtherOrder.remaining_quantity || existingInOtherOrder.quantity;
        
        // 如果原物料已拆包，且扫描数量等于剩余数量 → 允许（拆包后的剩余标签）
        if (existingInOtherOrder.isUnpacked && scanQty === remainingQty) {
          console.log('拆包后的剩余标签，允许录入:', traceNo, '数量:', scanQty, '原订单:', existingInOtherOrder.order_no);
          // 不返回 material，允许创建新物料
        } else if (scanQty === existingInOtherOrder.quantity) {
          // 如果扫描数量等于原数量（未拆包或数量不匹配）→ 重复
          console.log('物料重复（不同订单，追踪码+数量相同）:', traceNo, '数量:', scanQty);
          return { material: existingInOtherOrder, isUnpacked: false, canRescan: false };
        }
        // 其他情况：已拆包但数量不等于剩余数量 → 允许（可能是不同批次）
      }
    }
    
    // 注意：不再检测箱号，因为箱号可能重复
    // 原箱号检测逻辑已移除
    
    return { material: null, isUnpacked: false, canRescan: false };
  } catch (error) {
    console.error('检查物料重复失败:', error);
    return { material: null, isUnpacked: false, canRescan: false };
  }
};

// 获取物料的拆包历史记录（只返回发货标签）
export const getUnpackHistoryByMaterialId = async (materialId: string): Promise<UnpackRecord[]> => {
  try {
    const records = await getAllUnpackRecords();
    // 只返回发货标签（label_type = 'shipped'），不返回剩余标签
    return records.filter(r => r.original_material_id === materialId && r.label_type === 'shipped');
  } catch (error) {
    console.error('获取拆包历史失败:', error);
    return [];
  }
};

// 获取追踪码的拆包历史记录（按追踪码查询，只返回发货标签）
export const getUnpackHistoryByTraceNo = async (traceNo: string): Promise<UnpackRecord[]> => {
  try {
    const records = await getAllUnpackRecords();
    // 只返回发货标签（label_type = 'shipped'），不返回剩余标签
    return records.filter(r => r.traceNo === traceNo && r.label_type === 'shipped');
  } catch (error) {
    console.error('获取拆包历史失败:', error);
    return [];
  }
};

// 获取下一个拆包序号
export const getNextUnpackIndex = async (traceNo: string): Promise<number> => {
  try {
    const records = await getAllUnpackRecords();
    // 查找该追踪码的所有拆包记录
    const relatedRecords = records.filter(r => r.traceNo === traceNo);
    // 返回最大序号 + 1
    if (relatedRecords.length === 0) return 1;
    return relatedRecords.length + 1;
  } catch (error) {
    console.error('获取拆包序号失败:', error);
    return 1;
  }
};

// 获取所有物料记录
export const getAllMaterials = async (): Promise<MaterialRecord[]> => {
  try {
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    return materialsData ? JSON.parse(materialsData) : [];
  } catch (error) {
    console.error('获取物料列表失败:', error);
    return [];
  }
};

// 搜索物料记录（支持模糊搜索）
export const searchMaterials = async (params: {
  orderNo?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  model?: string;
  batch?: string;
}): Promise<MaterialRecord[]> => {
  try {
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    let materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    
    console.log('搜索参数:', params);
    console.log('总物料数:', materials.length);
    
    // 订单号模糊搜索
    if (params.orderNo) {
      const searchTerm = params.orderNo.toLowerCase();
      materials = materials.filter(m => 
        m.order_no.toLowerCase().includes(searchTerm)
      );
      console.log('按订单号过滤后:', materials.length);
    }
    
    // 客户名称模糊搜索
    if (params.customerName) {
      const searchTerm = params.customerName.toLowerCase();
      materials = materials.filter(m => {
        const customerName = (m.customer_name || '').toLowerCase();
        return customerName.includes(searchTerm);
      });
      console.log('按客户名称过滤后:', materials.length);
    }
    
    // 型号模糊搜索
    if (params.model) {
      const searchTerm = params.model.toLowerCase();
      materials = materials.filter(m => {
        const model = (m.model || '').toLowerCase();
        return model.includes(searchTerm);
      });
      console.log('按型号过滤后:', materials.length);
    }
    
    // 批次模糊搜索
    if (params.batch) {
      const searchTerm = params.batch.toLowerCase();
      materials = materials.filter(m => {
        const batch = (m.batch || '').toLowerCase();
        return batch.includes(searchTerm);
      });
      console.log('按批次过滤后:', materials.length);
    }
    
    // 开始日期
    if (params.startDate) {
      materials = materials.filter(m => m.scanned_at >= params.startDate!);
      console.log('按开始日期过滤后:', materials.length);
    }
    
    // 结束日期
    if (params.endDate) {
      const endDateTime = params.endDate + ' 23:59:59';
      materials = materials.filter(m => m.scanned_at <= endDateTime);
      console.log('按结束日期过滤后:', materials.length);
    }
    
    return materials;
  } catch (error) {
    console.error('搜索物料记录失败:', error);
    return [];
  }
};

// 删除物料记录
export const deleteMaterial = async (id: string): Promise<void> => {
  try {
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    let materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    
    materials = materials.filter(m => m.id !== id);
    await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
  } catch (error) {
    console.error('删除物料记录失败:', error);
    throw error;
  }
};

// 更新物料自定义字段
export const updateMaterialCustomFields = async (
  id: string, 
  customFields: Record<string, string>
): Promise<void> => {
  try {
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    
    const index = materials.findIndex(m => m.id === id);
    if (index >= 0) {
      materials[index].customFields = customFields;
      await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    }
  } catch (error) {
    console.error('更新物料自定义字段失败:', error);
    throw error;
  }
};

// 更新物料数量（拆包后使用）
export const updateMaterialQuantity = async (
  id: string, 
  newQuantity: string
): Promise<void> => {
  try {
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    
    const index = materials.findIndex(m => m.id === id);
    if (index >= 0) {
      materials[index].quantity = newQuantity;
      await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    }
  } catch (error) {
    console.error('更新物料数量失败:', error);
    throw error;
  }
};

// 更新物料信息（编辑物料所有字段）
export const updateMaterial = async (
  id: string,
  updates: Partial<Pick<MaterialRecord, 'model' | 'batch' | 'quantity' | 'package' | 'version' | 'productionDate' | 'traceNo' | 'sourceNo' | 'customer_name'>>
): Promise<void> => {
  try {
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    
    const index = materials.findIndex(m => m.id === id);
    if (index >= 0) {
      // 应用更新
      Object.assign(materials[index], updates);
      await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
    }
  } catch (error) {
    console.error('更新物料信息失败:', error);
    throw error;
  }
};

// 删除订单及其所有物料记录
export const deleteOrder = async (orderNo: string): Promise<void> => {
  try {
    // 删除订单
    const ordersData = await AsyncStorage.getItem(ORDERS_KEY);
    let orders: Order[] = ordersData ? JSON.parse(ordersData) : [];
    orders = orders.filter(o => o.order_no !== orderNo);
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    
    // 删除关联的物料记录
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    let materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    materials = materials.filter(m => m.order_no !== orderNo);
    await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
  } catch (error) {
    console.error('删除订单失败:', error);
    throw error;
  }
};

// 获取本地日期字符串 (YYYY-MM-DD)
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// getLocalDateTimeString 和 formatDateTimeMinute 移至 time.ts

// 获取统计信息
export const getStatistics = async (): Promise<{
  totalOrders: number;
  totalMaterials: number;
  totalQuantity: number;
  todayOrders: number;
  todayMaterials: number;
  todayQuantity: number;
}> => {
  try {
    const ordersData = await AsyncStorage.getItem(ORDERS_KEY);
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    
    const orders: Order[] = ordersData ? JSON.parse(ordersData) : [];
    const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    
    // 使用本地时间计算今天日期，避免时区问题
    const today = getLocalDateString();
    
    // 今日订单数
    const todayOrders = orders.filter(o => o.created_at.startsWith(today)).length;
    
    // 今日物料数和数量
    const todayMaterialsList = materials.filter(m => m.scanned_at.startsWith(today));
    const todayMaterials = todayMaterialsList.length;
    const todayQuantity = todayMaterialsList.reduce((sum, m) => sum + (parseInt(m.quantity, 10) || 0), 0);
    
    // 总数量
    const totalQuantity = materials.reduce((sum, m) => sum + (parseInt(m.quantity, 10) || 0), 0);
    
    return {
      totalOrders: orders.length,
      totalMaterials: materials.length,
      totalQuantity,
      todayOrders,
      todayMaterials,
      todayQuantity,
    };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return {
      totalOrders: 0,
      totalMaterials: 0,
      totalQuantity: 0,
      todayOrders: 0,
      todayMaterials: 0,
      todayQuantity: 0,
    };
  }
};

// ========== 二维码解析规则相关函数 ==========

// 初始化默认规则（极海半导体）
export const initDefaultRules = async (): Promise<void> => {
  try {
    const rulesData = await AsyncStorage.getItem(RULES_KEY);
    if (rulesData === null) {
      const defaultRule: QRCodeRule = {
        id: 'default_jihai',
        name: '极海半导体',
        description: '型号/批次/封装/版本号/数量/生产日期年周/追踪码/箱号',
        separator: '/',
        fieldOrder: ['model', 'batch', 'package', 'version', 'quantity', 'productionDate', 'traceNo', 'sourceNo'],
        isActive: true,
        created_at: getISODateTime(),
        updated_at: getISODateTime(),
      };
      await AsyncStorage.setItem(RULES_KEY, JSON.stringify([defaultRule]));
      console.log('初始化默认规则成功');
    }
  } catch (error) {
    console.error('初始化默认规则失败:', error);
  }
};

// 获取所有规则
export const getAllRules = async (): Promise<QRCodeRule[]> => {
  try {
    await initDefaultRules(); // 确保默认规则存在
    const rulesData = await AsyncStorage.getItem(RULES_KEY);
    return rulesData ? JSON.parse(rulesData) : [];
  } catch (error) {
    console.error('获取规则列表失败:', error);
    return [];
  }
};

// 获取启用的规则
export const getActiveRules = async (): Promise<QRCodeRule[]> => {
  try {
    const rules = await getAllRules();
    return rules.filter(r => r.isActive);
  } catch (error) {
    console.error('获取启用规则失败:', error);
    return [];
  }
};

// 添加规则
export const addRule = async (rule: Omit<QRCodeRule, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  try {
    const rules = await getAllRules();
    const newRule: QRCodeRule = {
      ...rule,
      id: generateId(),
      created_at: getISODateTime(),
      updated_at: getISODateTime(),
    };
    rules.unshift(newRule);
    await AsyncStorage.setItem(RULES_KEY, JSON.stringify(rules));
    return newRule.id;
  } catch (error) {
    console.error('添加规则失败:', error);
    throw error;
  }
};

// 更新规则
export const updateRule = async (id: string, updates: Partial<QRCodeRule>): Promise<void> => {
  try {
    const rules = await getAllRules();
    const index = rules.findIndex(r => r.id === id);
    if (index >= 0) {
      rules[index] = {
        ...rules[index],
        ...updates,
        updated_at: getISODateTime(),
      };
      await AsyncStorage.setItem(RULES_KEY, JSON.stringify(rules));
    }
  } catch (error) {
    console.error('更新规则失败:', error);
    throw error;
  }
};

// 删除规则
export const deleteRule = async (id: string): Promise<void> => {
  try {
    const rules = await getAllRules();
    const filteredRules = rules.filter(r => r.id !== id);
    await AsyncStorage.setItem(RULES_KEY, JSON.stringify(filteredRules));
  } catch (error) {
    console.error('删除规则失败:', error);
    throw error;
  }
};

// 根据ID获取规则
export const getRuleById = async (id: string): Promise<QRCodeRule | null> => {
  try {
    const rules = await getAllRules();
    return rules.find(r => r.id === id) || null;
  } catch (error) {
    console.error('获取规则失败:', error);
    return null;
  }
};

// 检查单个字段是否满足匹配条件（简化版：检查字段是否包含关键字）
const checkMatchCondition = (fieldValue: string, condition: MatchCondition): boolean => {
  return fieldValue.includes(condition.keyword);
};

// 检查规则的所有匹配条件是否满足
const checkAllMatchConditions = (parts: string[], conditions: MatchCondition[]): boolean => {
  if (!conditions || conditions.length === 0) return false;
  
  // 所有条件都必须满足
  return conditions.every(condition => {
    const { fieldIndex, keyword } = condition;
    if (fieldIndex < 0 || fieldIndex >= parts.length) return false;
    return checkMatchCondition(parts[fieldIndex], condition);
  });
};

// 根据二维码内容自动识别规则
export const detectRule = async (content: string): Promise<QRCodeRule | null> => {
  try {
    const rules = await getActiveRules();
    const commonSeparators = ['/', '|', ',', '*', '#', ' ', ';', ':', '\t'];
    
    // 支持的括号分隔符格式
    const BRACKET_PAIRS: Record<string, string> = {
      '{': '}',
      '(': ')',
      '[': ']',
      '<': '>',
    };
    
    // 检测预设括号格式并返回左括号
    const detectBracketFormat = (str: string): string | null => {
      for (const left of Object.keys(BRACKET_PAIRS)) {
        const right = BRACKET_PAIRS[left];
        if (str.startsWith(left) && str.includes(right + left)) {
          return left;
        }
      }
      return null;
    };
    
    // 解析预设括号格式
    const splitByBracket = (str: string, leftBracket: string): string[] => {
      const rightBracket = BRACKET_PAIRS[leftBracket];
      let s = str.trim();
      if (s.startsWith(leftBracket)) s = s.slice(1);
      if (s.endsWith(rightBracket)) s = s.slice(0, -1);
      return s.split(rightBracket + leftBracket).map(p => p.trim()).filter(p => p.length > 0);
    };
    
    // 检测自定义特殊分隔符格式（如 {A}A{B}A 格式，A为左符号，B为右符号）
    const detectSpecialBracketFormat = (str: string): { left: string; right: string } | null => {
      // 获取第一个字符作为可能的左符号
      const firstChar = str[0];
      // 查找第一个右符号（从第二个字符开始，找第一个不同于左符号的字符后紧跟左符号的位置）
      for (let i = 1; i < str.length - 1; i++) {
        // 找到 "右符号 + 左符号" 的模式
        if (str[i] !== firstChar && str[i + 1] === firstChar) {
          // 验证是否以右符号结尾
          if (str.endsWith(str[i])) {
            return { left: firstChar, right: str[i] };
          }
        }
      }
      return null;
    };
    
    // 解析自定义特殊分隔符格式
    const splitBySpecialBracket = (str: string, leftBracket: string, rightBracket: string): string[] => {
      let s = str.trim();
      if (s.startsWith(leftBracket)) s = s.slice(1);
      if (s.endsWith(rightBracket)) s = s.slice(0, -1);
      return s.split(rightBracket + leftBracket).map(p => p.trim()).filter(p => p.length > 0);
    };
    
    // 先计算每种分隔符能拆分出多少字段
    const separatorPartsCount: { separator: string; count: number; parts: string[] }[] = [];
    
    // ========== 优先检测预设括号格式 ==========
    const bracketLeft = detectBracketFormat(content);
    if (bracketLeft) {
      const parts = splitByBracket(content, bracketLeft);
      if (parts.length >= 2) {
        separatorPartsCount.push({ 
          separator: bracketLeft + BRACKET_PAIRS[bracketLeft], 
          count: parts.length, 
          parts 
        });
      }
    }
    
    // ========== 检测自定义特殊分隔符格式 ==========
    if (!bracketLeft) {
      const specialBracket = detectSpecialBracketFormat(content);
      if (specialBracket) {
        const parts = splitBySpecialBracket(content, specialBracket.left, specialBracket.right);
        if (parts.length >= 2) {
          separatorPartsCount.push({ 
            separator: specialBracket.left + specialBracket.right, 
            count: parts.length, 
            parts 
          });
        }
      }
    }
    
    // 检测其他分隔符
    for (const sep of commonSeparators) {
      // 分割后过滤空字符串并去除空白
      const parts = content.split(sep).map(s => s.trim()).filter(s => s.length > 0);
      if (parts.length >= 2) {
        separatorPartsCount.push({ separator: sep, count: parts.length, parts });
      }
    }
    
    // 按字段数量降序排列，优先匹配字段多的
    separatorPartsCount.sort((a, b) => b.count - a.count);
    
    console.log('===== 规则匹配调试 =====');
    console.log('原始内容:', content);
    console.log('分隔符拆分结果:', separatorPartsCount.map(s => ({ separator: s.separator, count: s.count, parts: s.parts })));
    
    // ========== 第一步：优先匹配有识别条件的规则 ==========
    for (const { separator, count, parts } of separatorPartsCount) {
      // 找出使用该分隔符且有识别条件的规则
      const rulesWithConditions = rules.filter(r => 
        r.separator === separator && 
        r.matchConditions && 
        r.matchConditions.length > 0
      );
      
      for (const rule of rulesWithConditions) {
        // 检查字段数量是否匹配
        let ruleFieldCount = rule.fieldOrder?.length || 0;
        const hasCustomFieldsInOrder = rule.fieldOrder?.some(f => isCustomField(f));
        if (!hasCustomFieldsInOrder && rule.customFieldIds) {
          ruleFieldCount += rule.customFieldIds.length;
        }
        
        if (ruleFieldCount !== count) continue;
        
        // 检查所有识别条件是否满足
        if (checkAllMatchConditions(parts, rule.matchConditions!)) {
          console.log(`条件匹配规则: ${rule.name}, 条件: ${JSON.stringify(rule.matchConditions)}`);
          return rule;
        }
      }
    }
    
    // ========== 第二步：走原有逻辑（兼容没有识别条件的规则） ==========
    // 遍历每种分隔符，按字段数量从多到少匹配
    for (const { separator, count } of separatorPartsCount) {
      // 找出使用该分隔符的所有规则
      const matchingRules = rules.filter(r => r.separator === separator);
      
      if (matchingRules.length === 0) continue;
      
      // 优先找字段数量完全匹配的规则
      const exactMatch = matchingRules.find(r => {
        // 计算规则定义的字段总数（兼容新旧格式）
        let ruleFieldCount = r.fieldOrder?.length || 0;
        // 旧格式：还需要加上 customFieldIds
        const hasCustomFieldsInOrder = r.fieldOrder?.some(f => isCustomField(f));
        if (!hasCustomFieldsInOrder && r.customFieldIds) {
          ruleFieldCount += r.customFieldIds.length;
        }
        return ruleFieldCount === count;
      });
      
      if (exactMatch) {
        console.log(`精确匹配规则: ${exactMatch.name}, 字段数: ${count}`);
        return exactMatch;
      }
      
      // 没有精确匹配，找字段数量最接近的（规则字段数 <= 实际字段数）
      const closestRules = matchingRules
        .filter(r => {
          let ruleFieldCount = r.fieldOrder?.length || 0;
          const hasCustomFieldsInOrder = r.fieldOrder?.some(f => isCustomField(f));
          if (!hasCustomFieldsInOrder && r.customFieldIds) {
            ruleFieldCount += r.customFieldIds.length;
          }
          return ruleFieldCount <= count;
        })
        .sort((a, b) => {
          const aCount = (a.fieldOrder?.length || 0) + (a.customFieldIds?.length || 0);
          const bCount = (b.fieldOrder?.length || 0) + (b.customFieldIds?.length || 0);
          return bCount - aCount; // 降序，字段多的优先
        });
      
      if (closestRules.length > 0) {
        const bestMatch = closestRules[0];
        let ruleFieldCount = bestMatch.fieldOrder?.length || 0;
        const hasCustomFieldsInOrder = bestMatch.fieldOrder?.some(f => isCustomField(f));
        if (!hasCustomFieldsInOrder && bestMatch.customFieldIds) {
          ruleFieldCount += bestMatch.customFieldIds.length;
        }
        console.log(`近似匹配规则: ${bestMatch.name}, 规则字段数: ${ruleFieldCount}, 实际字段数: ${count}`);
        return bestMatch;
      }
    }
    
    // 没有匹配的规则，尝试自动识别
    if (separatorPartsCount.length > 0) {
      const best = separatorPartsCount[0];
      console.log(`自动识别分隔符: "${best.separator}", 字段数: ${best.count}`);
      
      // 格式化分隔符显示
      let separatorDisplay = best.separator;
      if (best.separator === ' ') separatorDisplay = '空格';
      // 预设括号格式
      const bracketDisplayMap: Record<string, string> = {
        '{}': '{ * }',
        '()': '( * )',
        '[]': '[ * ]',
        '<>': '< * >',
      };
      if (bracketDisplayMap[best.separator]) {
        separatorDisplay = bracketDisplayMap[best.separator];
      } else if (best.separator.length === 2) {
        // 自定义特殊分隔符，显示为 {A * B} 格式
        separatorDisplay = `${best.separator[0]} * ${best.separator[1]}`;
      }
      
      return {
        id: 'auto_detect',
        name: '自动识别',
        description: `自动识别的分隔符: ${separatorDisplay}`,
        separator: best.separator,
        fieldOrder: AVAILABLE_FIELDS.slice(0, Math.min(best.count, AVAILABLE_FIELDS.length)),
        isActive: true,
        created_at: getISODateTime(),
        updated_at: getISODateTime(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('识别规则失败:', error);
    return null;
  }
};

// 使用规则解析二维码内容（支持标准字段和自定义字段混合顺序）
export const parseWithRule = (
  content: string, 
  rule: QRCodeRule
): { 
  standardFields: Record<string, string>; 
  customFields: Record<string, string>;
} => {
  // 支持的括号分隔符格式
  const BRACKET_PAIRS: Record<string, string> = {
    '{': '}',
    '(': ')',
    '[': ']',
    '<': '>',
  };
  
  // 检查是否为括号分隔符
  const isBracketSeparator = (sep: string): string | null => {
    for (const left of Object.keys(BRACKET_PAIRS)) {
      if (sep === left + BRACKET_PAIRS[left]) {
        return left;
      }
    }
    return null;
  };
  
  // 检测内容是否为括号格式
  const detectBracketFormat = (str: string): string | null => {
    for (const left of Object.keys(BRACKET_PAIRS)) {
      const right = BRACKET_PAIRS[left];
      if (str.startsWith(left) && str.includes(right + left)) {
        return left;
      }
    }
    return null;
  };
  
  // 解析括号格式
  const splitByBracket = (str: string, leftBracket: string): string[] => {
    const rightBracket = BRACKET_PAIRS[leftBracket];
    let s = str.trim();
    if (s.startsWith(leftBracket)) s = s.slice(1);
    if (s.endsWith(rightBracket)) s = s.slice(0, -1);
    return s.split(rightBracket + leftBracket).map(p => p.trim()).filter(p => p.length > 0);
  };
  
  // 分割后过滤空字符串并去除空白
  let parts: string[];
  
  // 优先检测括号格式
  const bracketLeft = detectBracketFormat(content);
  const ruleBracketLeft = isBracketSeparator(rule.separator);
  // 检测是否为自定义特殊分隔符（长度为2，非预设括号）
  const isSpecialSeparator = rule.separator.length === 2 && !ruleBracketLeft;
  
  if (ruleBracketLeft || bracketLeft) {
    // 预设括号格式
    const leftBracket = ruleBracketLeft || bracketLeft;
    parts = splitByBracket(content, leftBracket!);
  } else if (isSpecialSeparator) {
    // 自定义特殊分隔符
    const leftBracket = rule.separator[0];
    const rightBracket = rule.separator[1];
    let s = content.trim();
    if (s.startsWith(leftBracket)) s = s.slice(1);
    if (s.endsWith(rightBracket)) s = s.slice(0, -1);
    parts = s.split(rightBracket + leftBracket).map(p => p.trim()).filter(p => p.length > 0);
  } else {
    parts = content.split(rule.separator).map(s => s.trim()).filter(s => s.length > 0);
  }
  
  // ========== 智能日期合并（处理日期中包含分隔符的情况） ==========
  // 例如：2025/07/21 被拆分成 ["2025", "07", "21"] → 合并为 ["2025/07/21"]
  // 例如：2025-01-15 被拆分成 ["2025", "01", "15"] → 合并为 ["2025-01-15"]
  const smartMergeDateFields = (arr: string[], separator: string): string[] => {
    if (separator === '/' || separator === '-') {
      const result: string[] = [];
      let i = 0;
      while (i < arr.length) {
        const current = arr[i];
        // 检测年份（4位数字）
        if (/^\d{4}$/.test(current)) {
          // 查找后续的月份和日期
          if (i + 2 < arr.length) {
            const next1 = arr[i + 1];
            const next2 = arr[i + 2];
            // 检测月份(01-12)和日期(01-31)
            if (/^(0[1-9]|1[0-2])$/.test(next1) && /^(0[1-9]|[12]\d|3[01])$/.test(next2)) {
              // 合并为完整日期
              result.push(`${current}${separator}${next1}${separator}${next2}`);
              i += 3;
              continue;
            }
          }
          // 也检测年周格式：2025/01 (年份/周数)
          if (i + 1 < arr.length) {
            const next1 = arr[i + 1];
            if (/^(0[1-9]|[1-4]\d|5[0-3])$/.test(next1)) {
              // 合并为年周格式
              result.push(`${current}${separator}${next1}`);
              i += 2;
              continue;
            }
          }
        }
        result.push(current);
        i++;
      }
      return result;
    }
    return arr;
  };
  
  // 应用智能合并（只对 / 和 - 分隔符启用日期合并）
  if (rule.separator === '/' || rule.separator === '-') {
    const mergedParts = smartMergeDateFields(parts, rule.separator);
    if (mergedParts.length !== parts.length) {
      console.log('日期合并后:', mergedParts);
      parts = mergedParts;
    }
  }
  
  const standardFields: Record<string, string> = {};
  const customFields: Record<string, string> = {};
  
  // 检查 fieldOrder 中是否有自定义字段（新格式）
  const hasCustomFieldsInOrder = rule.fieldOrder?.some(f => isCustomField(f));
  
  // 调试日志：显示解析详情
  console.log('===== 二维码解析调试 =====');
  console.log('原始内容:', content);
  console.log('分隔符:', rule.separator);
  console.log('拆分结果:', parts);
  console.log('字段数量:', parts.length);
  console.log('规则字段顺序:', rule.fieldOrder);
  console.log('规则字段数量:', rule.fieldOrder?.length || 0);
  console.log('旧格式自定义字段IDs:', rule.customFieldIds);
  
  // 【核心修改】使用固定字段顺序提取值，不再依赖 rule.fieldOrder
  // 无论用户用什么分隔符，都按固定顺序：型号/批次/封装/版本/数量/生产日期/追踪码/箱号
  STANDARD_FIELD_ORDER.forEach((field, index) => {
    const value = parts[index]?.trim() || '';
    console.log(`字段[${index}] ${FIELD_LABELS[field] || field}: "${value}"`);
    standardFields[field] = value;
  });
  
  // 如果有自定义字段（用户额外定义的字段），继续解析
  // 对于自定义字段，需要知道它们在拆分结果中的位置
  // 这里兼容旧格式：customFieldIds 接在标准字段后面
  if (rule.customFieldIds && rule.customFieldIds.length > 0) {
    const customFieldStartIndex = STANDARD_FIELD_ORDER.length;
    rule.customFieldIds.forEach((fieldId, index) => {
      const partIndex = customFieldStartIndex + index;
      if (partIndex < parts.length) {
        const value = parts[partIndex]?.trim() || '';
        console.log(`自定义字段[${partIndex}] ${fieldId}: "${value}"`);
        customFields[fieldId] = value;
      }
    });
  }
  
  console.log('===== 解析完成 =====');
  console.log('标准字段:', standardFields);
  console.log('自定义字段:', customFields);
  
  return { standardFields, customFields };
};

// ========== 自定义字段相关函数 ==========

// 初始化默认自定义字段
export const initDefaultCustomFields = async (): Promise<void> => {
  try {
    const fieldsData = await AsyncStorage.getItem(CUSTOM_FIELDS_KEY);
    if (fieldsData === null) {
      await AsyncStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify([]));
      console.log('初始化自定义字段成功');
    }
  } catch (error) {
    console.error('初始化自定义字段失败:', error);
  }
};

// 获取所有自定义字段
export const getAllCustomFields = async (): Promise<CustomField[]> => {
  try {
    await initDefaultCustomFields(); // 确保初始化
    const fieldsData = await AsyncStorage.getItem(CUSTOM_FIELDS_KEY);
    const fields: CustomField[] = fieldsData ? JSON.parse(fieldsData) : [];
    // 按排序顺序返回
    return fields.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    console.error('获取自定义字段列表失败:', error);
    return [];
  }
};

// 添加自定义字段
export const addCustomField = async (field: Omit<CustomField, 'id' | 'created_at' | 'updated_at' | 'sortOrder'>): Promise<string> => {
  try {
    const fields = await getAllCustomFields();
    const newSortOrder = fields.length > 0 ? Math.max(...fields.map(f => f.sortOrder)) + 1 : 0;
    
    const newField: CustomField = {
      ...field,
      id: generateId(),
      sortOrder: newSortOrder,
      created_at: getISODateTime(),
      updated_at: getISODateTime(),
    };
    
    fields.push(newField);
    await AsyncStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(fields));
    return newField.id;
  } catch (error) {
    console.error('添加自定义字段失败:', error);
    throw error;
  }
};

// 更新自定义字段
export const updateCustomField = async (id: string, updates: Partial<CustomField>): Promise<void> => {
  try {
    const fieldsData = await AsyncStorage.getItem(CUSTOM_FIELDS_KEY);
    const fields: CustomField[] = fieldsData ? JSON.parse(fieldsData) : [];
    
    const index = fields.findIndex(f => f.id === id);
    if (index >= 0) {
      fields[index] = {
        ...fields[index],
        ...updates,
        updated_at: getISODateTime(),
      };
      await AsyncStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(fields));
    }
  } catch (error) {
    console.error('更新自定义字段失败:', error);
    throw error;
  }
};

// 删除自定义字段
export const deleteCustomField = async (id: string): Promise<void> => {
  try {
    const fieldsData = await AsyncStorage.getItem(CUSTOM_FIELDS_KEY);
    const fields: CustomField[] = fieldsData ? JSON.parse(fieldsData) : [];
    const filteredFields = fields.filter(f => f.id !== id);
    await AsyncStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(filteredFields));
  } catch (error) {
    console.error('删除自定义字段失败:', error);
    throw error;
  }
};

// 更新自定义字段排序
export const reorderCustomFields = async (fieldIds: string[]): Promise<void> => {
  try {
    const fieldsData = await AsyncStorage.getItem(CUSTOM_FIELDS_KEY);
    const fields: CustomField[] = fieldsData ? JSON.parse(fieldsData) : [];
    
    fieldIds.forEach((id, index) => {
      const field = fields.find(f => f.id === id);
      if (field) {
        field.sortOrder = index;
        field.updated_at = getISODateTime();
      }
    });
    
    await AsyncStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(fields));
  } catch (error) {
    console.error('更新自定义字段排序失败:', error);
    throw error;
  }
};

// ============== 数据备份与恢复功能 ==============

// 备份数据接口（备份配置项：规则 + 自定义字段 + 物料绑定 + 仓库 + 同步配置）
export interface BackupData {
  version: string;           // 备份版本号
  backupTime: string;        // 备份时间
  appVersion: string;        // APP版本号
  rules: QRCodeRule[];       // 解析规则
  customFields: CustomField[]; // 自定义字段
  inventoryBindings: InventoryBinding[]; // 物料绑定（型号-存货编码）
  warehouses: Warehouse[];   // 仓库列表
  syncConfig?: {             // 数据同步配置（可选）
    ip: string;
    port: string;
  };
}

// 同步配置存储键（需要与设置页面保持一致）
const SYNC_CONFIG_KEY = '@sync_config';

// 导出配置数据（用于备份）
export const exportBackupData = async (): Promise<BackupData> => {
  try {
    const [rulesData, customFieldsData, inventoryBindingsData, warehousesData, syncData] = await Promise.all([
      AsyncStorage.getItem(RULES_KEY),
      AsyncStorage.getItem(CUSTOM_FIELDS_KEY),
      AsyncStorage.getItem(INVENTORY_BINDINGS_KEY),
      AsyncStorage.getItem(WAREHOUSES_KEY),
      AsyncStorage.getItem(SYNC_CONFIG_KEY),
    ]);

    const backup: BackupData = {
      version: '1.3',
      backupTime: getISODateTime(),
      appVersion: APP_VERSION,
      rules: rulesData ? JSON.parse(rulesData) : [],
      customFields: customFieldsData ? JSON.parse(customFieldsData) : [],
      inventoryBindings: inventoryBindingsData ? JSON.parse(inventoryBindingsData) : [],
      warehouses: warehousesData ? JSON.parse(warehousesData) : [],
      syncConfig: syncData ? JSON.parse(syncData) : undefined,
    };

    return backup;
  } catch (error) {
    console.error('导出备份数据失败:', error);
    throw error;
  }
};

// 导入备份数据（用于恢复）
export const importBackupData = async (backup: BackupData): Promise<{
  success: boolean;
  message: string;
  stats: {
    rules: number;
    customFields: number;
    inventoryBindings: number;
    warehouses: number;
    hasSyncConfig: boolean;
  };
}> => {
  try {
    // 验证备份数据格式
    if (!backup.version || !backup.backupTime) {
      return {
        success: false,
        message: '无效的备份文件格式',
        stats: { rules: 0, customFields: 0, inventoryBindings: 0, warehouses: 0, hasSyncConfig: false },
      };
    }

    // 恢复数据（恢复配置项 + 物料绑定 + 仓库 + 同步配置）
    const promises: Promise<void>[] = [
      AsyncStorage.setItem(RULES_KEY, JSON.stringify(backup.rules || [])),
      AsyncStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(backup.customFields || [])),
      AsyncStorage.setItem(INVENTORY_BINDINGS_KEY, JSON.stringify(backup.inventoryBindings || [])),
      AsyncStorage.setItem(WAREHOUSES_KEY, JSON.stringify(backup.warehouses || [])),
    ];

    // 如果备份中包含同步配置，也恢复它
    if (backup.syncConfig) {
      promises.push(AsyncStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(backup.syncConfig)));
    }

    await Promise.all(promises);

    return {
      success: true,
      message: '配置恢复成功',
      stats: {
        rules: (backup.rules || []).length,
        customFields: (backup.customFields || []).length,
        inventoryBindings: (backup.inventoryBindings || []).length,
        warehouses: (backup.warehouses || []).length,
        hasSyncConfig: !!backup.syncConfig,
      },
    };
  } catch (error) {
    console.error('导入备份数据失败:', error);
    throw error;
  }
};

// 获取配置统计（用于显示备份信息）
export const getConfigStats = async (): Promise<{
  rules: number;
  customFields: number;
  inventoryBindings: number;
}> => {
  try {
    const [rulesData, customFieldsData, inventoryBindingsData] = await Promise.all([
      AsyncStorage.getItem(RULES_KEY),
      AsyncStorage.getItem(CUSTOM_FIELDS_KEY),
      AsyncStorage.getItem(INVENTORY_BINDINGS_KEY),
    ]);

    return {
      rules: rulesData ? JSON.parse(rulesData).length : 0,
      customFields: customFieldsData ? JSON.parse(customFieldsData).length : 0,
      inventoryBindings: inventoryBindingsData ? JSON.parse(inventoryBindingsData).length : 0,
    };
  } catch (error) {
    console.error('获取配置统计失败:', error);
    return { rules: 0, customFields: 0, inventoryBindings: 0 };
  }
};

// 清空所有数据（危险操作）
export const clearAllData = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(ORDERS_KEY),
      AsyncStorage.removeItem(MATERIALS_KEY),
      AsyncStorage.removeItem(RULES_KEY),
      AsyncStorage.removeItem(CUSTOM_FIELDS_KEY),
      AsyncStorage.removeItem(UNPACK_RECORDS_KEY),
      AsyncStorage.removeItem(PRINT_HISTORY_KEY),
    ]);
  } catch (error) {
    console.error('清空数据失败:', error);
    throw error;
  }
};

// ============== 拆包记录相关函数 ==============

// 获取所有拆包记录
export const getAllUnpackRecords = async (): Promise<UnpackRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(UNPACK_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取拆包记录失败:', error);
    return [];
  }
};

// 获取待打印的拆包记录
export const getPendingUnpackRecords = async (): Promise<UnpackRecord[]> => {
  try {
    const records = await getAllUnpackRecords();
    return records.filter(r => r.status === 'pending');
  } catch (error) {
    console.error('获取待打印记录失败:', error);
    return [];
  }
};

// 获取已打印的拆包记录
export const getPrintedUnpackRecords = async (): Promise<UnpackRecord[]> => {
  try {
    const records = await getAllUnpackRecords();
    return records.filter(r => r.status === 'printed');
  } catch (error) {
    console.error('获取已打印记录失败:', error);
    return [];
  }
};

// 添加拆包记录（生成两条标签：发货标签 + 剩余标签）
export const addUnpackRecord = async (record: {
  original_material_id: string;
  order_no: string;
  customer_name: string;
  model: string;
  batch: string;
  package: string;
  version: string;
  original_quantity: string;
  new_quantity: string;
  remaining_quantity: string;  // 剩余数量
  productionDate: string;
  traceNo: string;
  sourceNo: string;
  new_traceNo?: string;
  notes?: string;
  // V3.0 新增
  warehouse_id?: string;
  warehouse_name?: string;
  inventory_code?: string;
}): Promise<{ shippedId: string; remainingId: string }> => {
  try {
    const records = await getAllUnpackRecords();
    const now = getISODateTime();
    
    // 生成关联ID，用于配对发货标签和剩余标签
    const pairId = generateId();
    
    // 1. 发货标签（拆出的部分，用于订单发货）
    const shippedRecord: UnpackRecord = {
      id: generateId(),
      original_material_id: record.original_material_id,
      order_no: record.order_no,
      customer_name: record.customer_name,
      model: record.model,
      batch: record.batch,
      package: record.package,
      version: record.version,
      warehouse_id: record.warehouse_id || '',
      warehouse_name: record.warehouse_name || '',
      inventory_code: record.inventory_code || '',
      original_quantity: record.original_quantity,
      new_quantity: record.new_quantity,  // 拆出的数量
      productionDate: record.productionDate,
      traceNo: record.traceNo,
      new_traceNo: record.new_traceNo || '',  // 新追踪码
      sourceNo: record.sourceNo,
      label_type: 'shipped',
      pair_id: pairId,
      status: 'pending',
      notes: record.notes || '',
      unpacked_at: now,
      printed_at: null,
      created_at: now,
      updated_at: now,
    };
    
    // 2. 剩余标签（剩余的部分，需要重新贴标）
    const remainingRecord: UnpackRecord = {
      id: generateId(),
      original_material_id: record.original_material_id,
      order_no: record.order_no,
      customer_name: record.customer_name,
      model: record.model,
      batch: record.batch,
      package: record.package,
      version: record.version,
      warehouse_id: record.warehouse_id || '',
      warehouse_name: record.warehouse_name || '',
      inventory_code: record.inventory_code || '',
      original_quantity: record.original_quantity,
      new_quantity: record.remaining_quantity,  // 剩余的数量
      productionDate: record.productionDate,
      traceNo: record.traceNo,
      new_traceNo: '',  // 剩余标签使用原追踪码，不需要新追踪码
      sourceNo: record.sourceNo,
      label_type: 'remaining',
      pair_id: pairId,
      status: 'pending',
      notes: record.notes || '',
      unpacked_at: now,
      printed_at: null,
      created_at: now,
      updated_at: now,
    };
    
    // 添加两条记录
    records.unshift(shippedRecord);
    records.unshift(remainingRecord);
    await AsyncStorage.setItem(UNPACK_RECORDS_KEY, JSON.stringify(records));
    
    console.log('生成两条标签:');
    console.log('- 发货标签:', record.new_traceNo, '数量:', record.new_quantity);
    console.log('- 剩余标签:', record.traceNo, '数量:', record.remaining_quantity);
    
    // 更新原物料：累计发货数量，剩余数量用于下次拆包
    const materialsData = await AsyncStorage.getItem(MATERIALS_KEY);
    const materials: MaterialRecord[] = materialsData ? JSON.parse(materialsData) : [];
    const materialIndex = materials.findIndex(m => m.id === record.original_material_id);
    
    if (materialIndex >= 0) {
      const currentMaterial = materials[materialIndex];
      const currentUnpackCount = currentMaterial.unpackCount || 0;
      
      // 计算累计发货数量
      // 如果已经拆过包，quantity 已经是累计发货数量，继续累加
      // 如果是第一次拆包，quantity 是原始数量，需要设置为本次拆出数量
      let newShippedQty: number;
      if (currentMaterial.isUnpacked) {
        // 已拆过包，quantity 是累计发货数量
        const currentShippedQty = parseInt(currentMaterial.quantity || '0', 10);
        newShippedQty = currentShippedQty + parseInt(record.new_quantity, 10);
      } else {
        // 第一次拆包，quantity 是原始数量，设置为本次拆出数量
        newShippedQty = parseInt(record.new_quantity, 10);
      }
      
      materials[materialIndex] = {
        ...currentMaterial,
        isUnpacked: true,
        unpackCount: currentUnpackCount + 1,
        // 订单里显示累计发货数量
        quantity: newShippedQty.toString(),
        // 保留原始数量用于追溯
        original_quantity: currentMaterial.original_quantity || currentMaterial.quantity,
        // 记录剩余数量，用于下次扫码
        remaining_quantity: record.remaining_quantity,
      };
      
      await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
      console.log('更新原物料：累计发货', newShippedQty, '个，剩余', record.remaining_quantity, '个待入库');
    }
    
    return { shippedId: shippedRecord.id, remainingId: remainingRecord.id };
  } catch (error) {
    console.error('添加拆包记录失败:', error);
    throw error;
  }
};

// 更新拆包记录状态为已打印
export const markUnpackRecordsAsPrinted = async (ids: string[]): Promise<void> => {
  try {
    const records = await getAllUnpackRecords();
    const now = getISODateTime();
    
    records.forEach(r => {
      if (ids.includes(r.id)) {
        r.status = 'printed';
        r.printed_at = now;
        r.updated_at = now;
      }
    });
    
    await AsyncStorage.setItem(UNPACK_RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('更新拆包记录状态失败:', error);
    throw error;
  }
};

// 删除拆包记录
export const deleteUnpackRecord = async (id: string): Promise<void> => {
  try {
    const records = await getAllUnpackRecords();
    const filtered = records.filter(r => r.id !== id);
    await AsyncStorage.setItem(UNPACK_RECORDS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('删除拆包记录失败:', error);
    throw error;
  }
};

// 批量删除拆包记录
export const deleteUnpackRecords = async (ids: string[]): Promise<void> => {
  try {
    const records = await getAllUnpackRecords();
    const filtered = records.filter(r => !ids.includes(r.id));
    await AsyncStorage.setItem(UNPACK_RECORDS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('批量删除拆包记录失败:', error);
    throw error;
  }
};

// ============== 打印历史相关函数 ==============

// 获取所有打印历史
export const getAllPrintHistory = async (): Promise<PrintHistory[]> => {
  try {
    const data = await AsyncStorage.getItem(PRINT_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取打印历史失败:', error);
    return [];
  }
};

// 添加打印历史
export const addPrintHistory = async (history: {
  unpack_record_ids: string[];
  export_format: 'csv' | 'excel' | 'json';
  print_count?: number;
}): Promise<string> => {
  try {
    const histories = await getAllPrintHistory();
    const now = getISODateTime();
    
    const newHistory: PrintHistory = {
      id: generateId(),
      unpack_record_ids: history.unpack_record_ids,
      export_format: history.export_format,
      export_file_path: null,
      printed_at: now,
      print_count: history.print_count || 1,
      created_at: now,
    };
    
    histories.unshift(newHistory);
    await AsyncStorage.setItem(PRINT_HISTORY_KEY, JSON.stringify(histories));
    
    return newHistory.id;
  } catch (error) {
    console.error('添加打印历史失败:', error);
    throw error;
  }
};

// ============== V3.0 仓库管理相关函数 ==============

// 获取所有仓库
export const getAllWarehouses = async (): Promise<Warehouse[]> => {
  try {
    const data = await AsyncStorage.getItem(WAREHOUSES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取仓库列表失败:', error);
    return [];
  }
};

// 获取默认仓库
export const getDefaultWarehouse = async (): Promise<Warehouse | null> => {
  try {
    const warehouses = await getAllWarehouses();
    return warehouses.find(w => w.is_default) || warehouses[0] || null;
  } catch (error) {
    console.error('获取默认仓库失败:', error);
    return null;
  }
};

// 添加仓库
export const addWarehouse = async (warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  try {
    const warehouses = await getAllWarehouses();
    const newWarehouse: Warehouse = {
      ...warehouse,
      id: generateId(),
      created_at: getISODateTime(),
      updated_at: getISODateTime(),
    };
    
    // 如果设置为默认，取消其他默认
    if (warehouse.is_default) {
      warehouses.forEach(w => w.is_default = false);
    }
    
    warehouses.push(newWarehouse);
    await AsyncStorage.setItem(WAREHOUSES_KEY, JSON.stringify(warehouses));
    return newWarehouse.id;
  } catch (error) {
    console.error('添加仓库失败:', error);
    throw error;
  }
};

// 更新仓库
export const updateWarehouse = async (id: string, updates: Partial<Warehouse>): Promise<void> => {
  try {
    const warehouses = await getAllWarehouses();
    const index = warehouses.findIndex(w => w.id === id);
    
    if (index >= 0) {
      // 如果设置为默认，取消其他默认
      if (updates.is_default) {
        warehouses.forEach(w => w.is_default = false);
      }
      
      warehouses[index] = {
        ...warehouses[index],
        ...updates,
        updated_at: getISODateTime(),
      };
      await AsyncStorage.setItem(WAREHOUSES_KEY, JSON.stringify(warehouses));
    }
  } catch (error) {
    console.error('更新仓库失败:', error);
    throw error;
  }
};

// 删除仓库
export const deleteWarehouse = async (id: string): Promise<void> => {
  try {
    const warehouses = await getAllWarehouses();
    const filtered = warehouses.filter(w => w.id !== id);
    await AsyncStorage.setItem(WAREHOUSES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('删除仓库失败:', error);
    throw error;
  }
};

// ============== V3.0 物料绑定（型号-存货编码）相关函数 ==============

// 获取所有物料绑定
export const getAllInventoryBindings = async (): Promise<InventoryBinding[]> => {
  try {
    const data = await AsyncStorage.getItem(INVENTORY_BINDINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取物料绑定列表失败:', error);
    return [];
  }
};

// 根据扫描型号查找存货编码
export const getInventoryCodeByModel = async (scanModel: string): Promise<string | null> => {
  try {
    const bindings = await getAllInventoryBindings();
    const binding = bindings.find(b => b.scan_model === scanModel);
    return binding?.inventory_code || null;
  } catch (error) {
    console.error('查找存货编码失败:', error);
    return null;
  }
};

// 根据扫描型号查找供应商
export const getSupplierByModel = async (scanModel: string): Promise<string | null> => {
  try {
    const bindings = await getAllInventoryBindings();
    const binding = bindings.find(b => b.scan_model === scanModel);
    return binding?.supplier || null;
  } catch (error) {
    console.error('查找供应商失败:', error);
    return null;
  }
};

// 添加物料绑定
export const addInventoryBinding = async (binding: Omit<InventoryBinding, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  try {
    const bindings = await getAllInventoryBindings();
    
    // 检查是否已存在相同的扫描型号
    const existing = bindings.find(b => b.scan_model === binding.scan_model);
    if (existing) {
      // 更新已有记录
      existing.inventory_code = binding.inventory_code;
      existing.supplier = binding.supplier || existing.supplier;
      existing.description = binding.description || existing.description;
      existing.updated_at = getISODateTime();
      await AsyncStorage.setItem(INVENTORY_BINDINGS_KEY, JSON.stringify(bindings));
      return existing.id;
    }
    
    const newBinding: InventoryBinding = {
      ...binding,
      id: generateId(),
      created_at: getISODateTime(),
      updated_at: getISODateTime(),
    };
    
    bindings.push(newBinding);
    await AsyncStorage.setItem(INVENTORY_BINDINGS_KEY, JSON.stringify(bindings));
    return newBinding.id;
  } catch (error) {
    console.error('添加物料绑定失败:', error);
    throw error;
  }
};

// 更新物料绑定
export const updateInventoryBinding = async (id: string, updates: Partial<InventoryBinding>): Promise<void> => {
  try {
    const bindings = await getAllInventoryBindings();
    const index = bindings.findIndex(b => b.id === id);
    
    if (index >= 0) {
      bindings[index] = {
        ...bindings[index],
        ...updates,
        updated_at: getISODateTime(),
      };
      await AsyncStorage.setItem(INVENTORY_BINDINGS_KEY, JSON.stringify(bindings));
    }
  } catch (error) {
    console.error('更新物料绑定失败:', error);
    throw error;
  }
};

// 删除物料绑定
export const deleteInventoryBinding = async (id: string): Promise<void> => {
  try {
    const bindings = await getAllInventoryBindings();
    const filtered = bindings.filter(b => b.id !== id);
    await AsyncStorage.setItem(INVENTORY_BINDINGS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('删除物料绑定失败:', error);
    throw error;
  }
};

// 批量导入物料绑定
export const importInventoryBindings = async (bindings: Array<{ scan_model: string; inventory_code: string; supplier?: string; description?: string }>): Promise<number> => {
  try {
    const existingBindings = await getAllInventoryBindings();
    let importCount = 0;
    
    for (const binding of bindings) {
      const existing = existingBindings.find(b => b.scan_model === binding.scan_model);
      if (existing) {
        // 更新已有记录
        existing.inventory_code = binding.inventory_code;
        existing.supplier = binding.supplier || existing.supplier;
        existing.description = binding.description || existing.description;
        existing.updated_at = getISODateTime();
      } else {
        // 添加新记录
        existingBindings.push({
          ...binding,
          id: generateId(),
          supplier: binding.supplier || '',
          description: binding.description || '',
          created_at: getISODateTime(),
          updated_at: getISODateTime(),
        });
        importCount++;
      }
    }
    
    await AsyncStorage.setItem(INVENTORY_BINDINGS_KEY, JSON.stringify(existingBindings));
    return importCount;
  } catch (error) {
    console.error('批量导入物料绑定失败:', error);
    throw error;
  }
};

// ============== V3.0 入库记录相关函数 ==============

// 获取本地日期字符串
const getLocalDateStringV3 = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 生成入库单号（RK+日期+序号）
export const generateInboundNo = async (): Promise<string> => {
  try {
    const today = getLocalDateStringV3();
    const records = await getAllInboundRecords();
    
    // 筛选今天的入库记录
    const todayRecords = records.filter(r => r.inbound_no && r.inbound_no.startsWith(`RK${today.replace(/-/g, '')}`));
    
    // 计算下一个序号
    const maxSeq = todayRecords.reduce((max, r) => {
      const match = r.inbound_no.match(/RK\d{8}(\d{3})$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        return Math.max(max, seq);
      }
      return max;
    }, 0);
    
    const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
    return `RK${today.replace(/-/g, '')}${nextSeq}`;
  } catch (error) {
    console.error('生成入库单号失败:', error);
    return `RK${getLocalDateStringV3().replace(/-/g, '')}001`;
  }
};

// 获取所有入库记录
export const getAllInboundRecords = async (): Promise<InboundRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(INBOUND_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取入库记录列表失败:', error);
    return [];
  }
};

// 添加入库记录
export const addInboundRecord = async (record: Omit<InboundRecord, 'id' | 'created_at'>): Promise<string> => {
  try {
    const records = await getAllInboundRecords();
    const newRecord: InboundRecord = {
      ...record,
      id: generateId(),
      created_at: getISODateTime(),
    };
    
    records.unshift(newRecord);
    await AsyncStorage.setItem(INBOUND_RECORDS_KEY, JSON.stringify(records));
    return newRecord.id;
  } catch (error) {
    console.error('添加入库记录失败:', error);
    throw error;
  }
};

// 删除入库记录
export const deleteInboundRecord = async (id: string): Promise<void> => {
  try {
    const records = await getAllInboundRecords();
    const filtered = records.filter(r => r.id !== id);
    await AsyncStorage.setItem(INBOUND_RECORDS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('删除入库记录失败:', error);
    throw error;
  }
};

// 清空所有入库记录
export const clearAllInboundRecords = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(INBOUND_RECORDS_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('清空入库记录失败:', error);
    throw error;
  }
};

// ============== V3.0 盘点记录相关函数 ==============

// 生成盘点单号（PD+日期+序号）
export const generateCheckNo = async (): Promise<string> => {
  try {
    const today = getLocalDateStringV3();
    const records = await getAllInventoryCheckRecords();
    
    // 筛选今天的盘点记录
    const todayRecords = records.filter(r => r.check_no && r.check_no.startsWith(`PD${today.replace(/-/g, '')}`));
    
    // 计算下一个序号
    const maxSeq = todayRecords.reduce((max, r) => {
      const match = r.check_no.match(/PD\d{8}(\d{3})$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        return Math.max(max, seq);
      }
      return max;
    }, 0);
    
    const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
    return `PD${today.replace(/-/g, '')}${nextSeq}`;
  } catch (error) {
    console.error('生成盘点单号失败:', error);
    return `PD${getLocalDateStringV3().replace(/-/g, '')}001`;
  }
};

// 获取所有盘点记录
export const getAllInventoryCheckRecords = async (): Promise<InventoryCheckRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(INVENTORY_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取盘点记录列表失败:', error);
    return [];
  }
};

// 添加盘点记录
export const addInventoryCheckRecord = async (record: Omit<InventoryCheckRecord, 'id' | 'created_at'>): Promise<string> => {
  try {
    const records = await getAllInventoryCheckRecords();
    const newRecord: InventoryCheckRecord = {
      ...record,
      id: generateId(),
      created_at: getISODateTime(),
    };
    
    records.unshift(newRecord);
    await AsyncStorage.setItem(INVENTORY_RECORDS_KEY, JSON.stringify(records));
    return newRecord.id;
  } catch (error) {
    console.error('添加盘点记录失败:', error);
    throw error;
  }
};

// 删除盘点记录
export const deleteInventoryCheckRecord = async (id: string): Promise<void> => {
  try {
    const records = await getAllInventoryCheckRecords();
    const filtered = records.filter(r => r.id !== id);
    await AsyncStorage.setItem(INVENTORY_RECORDS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('删除盘点记录失败:', error);
    throw error;
  }
};

// 清空所有盘点记录
export const clearAllInventoryCheckRecords = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(INVENTORY_RECORDS_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('清空盘点记录失败:', error);
    throw error;
  }
};

// ============== V3.0 数据清空功能 ==============

// 清空所有业务数据（保留配置：规则、自定义字段、仓库、物料绑定）
export const clearAllBusinessData = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.setItem(ORDERS_KEY, JSON.stringify([])),
      AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify([])),
      AsyncStorage.setItem(UNPACK_RECORDS_KEY, JSON.stringify([])),
      AsyncStorage.setItem(PRINT_HISTORY_KEY, JSON.stringify([])),
      AsyncStorage.setItem(INBOUND_RECORDS_KEY, JSON.stringify([])),
      AsyncStorage.setItem(INVENTORY_RECORDS_KEY, JSON.stringify([])),
    ]);
    console.log('清空业务数据成功');
  } catch (error) {
    console.error('清空业务数据失败:', error);
    throw error;
  }
};

// 清空所有数据（包括配置，危险操作）
export const clearAllDataV3 = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(ORDERS_KEY),
      AsyncStorage.removeItem(MATERIALS_KEY),
      AsyncStorage.removeItem(RULES_KEY),
      AsyncStorage.removeItem(CUSTOM_FIELDS_KEY),
      AsyncStorage.removeItem(UNPACK_RECORDS_KEY),
      AsyncStorage.removeItem(PRINT_HISTORY_KEY),
      AsyncStorage.removeItem(WAREHOUSES_KEY),
      AsyncStorage.removeItem(INVENTORY_BINDINGS_KEY),
      AsyncStorage.removeItem(INBOUND_RECORDS_KEY),
      AsyncStorage.removeItem(INVENTORY_RECORDS_KEY),
      AsyncStorage.removeItem(DATA_VERSION_KEY),
    ]);
    console.log('清空所有数据成功');
  } catch (error) {
    console.error('清空所有数据失败:', error);
    throw error;
  }
};
