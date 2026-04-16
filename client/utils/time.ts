/**
 * 统一时间格式化工具
 * 所有时间格式化都从这里调用，保持格式一致
 */

// ============================================
// 存储格式
// ============================================

/**
 * 获取当前时间（用于存储）
 * 格式：YYYY-MM-DDTHH:mm:ss.SSS+08:00 (本地时间，ISO 8601 带时区)
 */
export const getISODateTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  
  // 获取本地时区偏移 (分钟)，转为 "+0800" 格式
  const tzOffset = -now.getTimezoneOffset(); // 北京时间是 -480 分钟
  const tzSign = tzOffset >= 0 ? '+' : '-';
  const tzHours = String(Math.abs(Math.floor(tzOffset / 60))).padStart(2, '0');
  const tzMinutes = String(Math.abs(tzOffset % 60)).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${tzSign}${tzHours}:${tzMinutes}`;
};

// ============================================
// 显示格式
// ============================================

/**
 * 格式化日期 (YYYY-MM-DD)
 * 用于列表、卡片等只显示日期的场景
 */
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    // 检查是否为有效日期
    if (isNaN(date.getTime())) {
      return '-';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '-';
  }
};

/**
 * 格式化日期时间 (YYYY-MM-DD HH:mm)
 * 用于详情、导出等需要时间的场景
 */
export const formatDateTime = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    // 检查是否为有效日期
    if (isNaN(date.getTime())) {
      return '-';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return '-';
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

/**
 * 格式化时间 (YYYY-MM-DD HH:mm)
 * 与 formatDateTime 功能相同，提供别名兼容旧代码
 */
export const formatTime = (dateString: string | undefined | null): string => {
  return formatDateTime(dateString);
};
