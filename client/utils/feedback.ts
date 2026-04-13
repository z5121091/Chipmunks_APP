/**
 * 扫码反馈工具
 * 提供震动反馈（音效可后续扩展）
 */

import * as Haptics from 'expo-haptics';

// 持续震动的定时器ID
let errorVibrationInterval: ReturnType<typeof setInterval> | null = null;

/**
 * 扫码成功反馈
 * - 轻快震动
 * - 清脆提示感
 */
export async function feedbackSuccess() {
  // 成功时停止错误震动
  stopErrorVibration();
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * 扫描重复/警告反馈
 * - 中等震动
 * - 警告提示感
 */
export async function feedbackWarning() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/**
 * 扫描失败/错误反馈（单次）
 * - 重震动
 * - 错误提示感
 */
export async function feedbackError() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * 开始错误持续震动
 * - 持续的震动提醒，直到调用 stopErrorVibration 或 feedbackSuccess
 * - 用于扫描错误、重复等需要用户注意的情况
 */
export function startErrorVibration() {
  // 如果已经在震动，先停止
  stopErrorVibration();
  
  // 立即震动一次
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  
  // 每500ms震动一次，持续提醒
  errorVibrationInterval = setInterval(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, 500);
}

/**
 * 停止错误持续震动
 * - 当用户执行正确操作后调用
 */
export function stopErrorVibration() {
  if (errorVibrationInterval) {
    clearInterval(errorVibrationInterval);
    errorVibrationInterval = null;
  }
}

/**
 * 通用轻触反馈
 */
export async function feedbackLight() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * 中等触感反馈
 */
export async function feedbackMedium() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * 重触感反馈
 */
export async function feedbackHeavy() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/**
 * 选中反馈
 */
export async function feedbackSelection() {
  await Haptics.selectionAsync();
}
