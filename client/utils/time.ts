/**
 * 统一时间格式化工具
 * 所有时间格式化都从这里调用，保持格式一致
 */

// ============================================
// 存储格式
// ============================================

/**
 * 获取当前时间（用于存储）
 * 格式：YYYY-MM-DDTHH:mm:ss.SSSZ (ISO 8601)
 */
export const getISODateTime = (): string => {
  return new Date().toISOString();
};

// ============================================
// 显示格式
// ============================================

/**
 * 格式化日期 (YYYY-MM-DD)
 * 用于列表、卡片等只显示日期的场景
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateString;
  }
};

/**
 * 格式化日期时间 (YYYY-MM-DD HH:mm)
 * 用于详情、导出等需要时间的场景
 */
export const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
};

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 * 用于日期比较筛选
 */
export const getToday = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
