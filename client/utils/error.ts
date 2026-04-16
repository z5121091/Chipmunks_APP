/**
 * 统一错误处理工具
 * 
 * 提供标准化的错误处理函数，统一日志输出和错误消息格式化
 */

/** 错误类型 */
export type ErrorType = 'network' | 'database' | 'parse' | 'unknown';

/** 错误上下文信息 */
export interface ErrorContext {
  module?: string;
  operation?: string;
  detail?: string;
}

/** 格式化的错误消息 */
export interface FormattedError {
  message: string;
  type: ErrorType;
  context: ErrorContext;
}

/**
 * 获取错误类型
 */
export function getErrorType(error: unknown): ErrorType {
  if (error instanceof TypeError) return 'parse';
  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) return 'network';
    if (error.message.includes('SQL') || error.message.includes('database') || error.message.includes('storage')) return 'database';
  }
  return 'unknown';
}

/**
 * 获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '未知错误';
}

/**
 * 格式化错误
 */
export function formatError(error: unknown, context: ErrorContext = {}): FormattedError {
  return {
    message: getErrorMessage(error),
    type: getErrorType(error),
    context,
  };
}

/**
 * 记录错误日志
 */
export function logError(error: unknown, context: ErrorContext = {}): void {
  const formatted = formatError(error, context);
  console.error(`[${formatted.type.toUpperCase()}] ${context.module || 'App'}/${context.operation || 'unknown'}:`, formatted.message);
  if (context.detail) {
    console.error(`  Detail:`, context.detail);
  }
}

/**
 * 处理错误并返回用户友好的消息
 */
export function handleError(error: unknown, context: ErrorContext = {}): string {
  const formatted = formatError(error, context);

  switch (formatted.type) {
    case 'network':
      return '网络连接失败，请检查网络设置';
    case 'database':
      return '数据操作失败，请稍后重试';
    case 'parse':
      return '数据解析失败，请检查输入';
    default:
      return formatted.message || '操作失败，请稍后重试';
  }
}

/**
 * 异步操作包装器
 * 自动处理错误并记录日志
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    logError(error, context);
    return null;
  }
}

/**
 * 带默认值的异步操作包装器
 */
export async function withErrorHandlingDefault<T>(
  operation: () => Promise<T>,
  defaultValue: T,
  context: ErrorContext = {}
): Promise<T> {
  const result = await withErrorHandling(operation, context);
  return result ?? defaultValue;
}
