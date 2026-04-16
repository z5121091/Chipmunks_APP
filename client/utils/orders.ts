/**
 * 订单相关工具函数
 */
import { MaterialRecord } from '@/utils/database';
import { getToday } from '@/utils/time';

/** 物料汇总接口 */
export interface MaterialSummary {
  model: string;
  count: number;
  totalQuantity: number;
  todayCount: number;
}

/**
 * 按型号汇总物料
 */
export function summarizeMaterials(
  materials: MaterialRecord[],
  todayOnly: boolean = false
): { summaries: MaterialSummary[]; totalQuantity: number } {
  const today = getToday();
  const summaryMap = new Map<string, MaterialSummary>();
  let totalQty = 0;

  materials.forEach((m) => {
    // 根据 todayOnly 筛选
    if (todayOnly && m.scanned_at) {
      const materialDate = m.scanned_at.slice(0, 10);
      if (materialDate !== today) return;
    }

    const model = m.model || '未知型号';
    const qty = parseInt(m.quantity, 10) || 0;
    const isToday = m.scanned_at && m.scanned_at.slice(0, 10) === today;

    totalQty += qty;

    if (!summaryMap.has(model)) {
      summaryMap.set(model, { model, count: 0, totalQuantity: 0, todayCount: 0 });
    }

    const summary = summaryMap.get(model)!;
    summary.count++;
    summary.totalQuantity += qty;
    if (isToday) summary.todayCount++;
  });

  const summaries = Array.from(summaryMap.values()).sort(
    (a, b) => b.totalQuantity - a.totalQuantity
  );

  return { summaries, totalQuantity: totalQty };
}

/**
 * 过滤今日物料
 */
export function filterTodayMaterials(materials: MaterialRecord[]): MaterialRecord[] {
  const today = getToday();
  return materials.filter(
    (m) => m.scanned_at && m.scanned_at.slice(0, 10) === today
  );
}

/**
 * 计算统计数据
 */
export interface OrderStats {
  totalOrders: number;
  totalMaterials: number;
  totalQuantity: number;
  todayOrders: number;
  todayMaterials: number;
  todayQuantity: number;
}
