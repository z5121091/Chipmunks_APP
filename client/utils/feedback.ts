/**
 * 扫码反馈工具
 * 提供震动反馈和成功提示音
 */

import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useEffect } from 'react';

// 持续震动的定时器ID
let errorVibrationInterval: ReturnType<typeof setInterval> | null = null;

// 音效实例缓存
let successSoundInstance: Audio.Sound | null = null;
let errorSoundInstance: Audio.Sound | null = null;
let successSoundLoading = false;
let errorSoundLoading = false;
let errorSoundInterval: ReturnType<typeof setInterval> | null = null;

// 成功提示音：滴（高音，短促）
const SUCCESS_SOUND = require('@/assets/sounds/滴.wav');

// 错误提示音：滴滴滴（三声）
const ERROR_SOUND = require('@/assets/sounds/滴滴滴.wav');

/**
 * 加载成功提示音
 */
async function loadSuccessSound(): Promise<Audio.Sound | null> {
  if (successSoundInstance) {
    return successSoundInstance;
  }
  
  if (successSoundLoading) {
    // 等待加载完成
    while (successSoundLoading) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return successSoundInstance;
  }
  
  successSoundLoading = true;
  try {
    const { sound } = await Audio.Sound.createAsync(
      SUCCESS_SOUND,
      { shouldPlay: false, isLooping: false, volume: 0.8 },
      null,
      true
    );
    successSoundInstance = sound;
    return sound;
  } catch (error) {
    console.error('加载成功提示音失败:', error);
    return null;
  } finally {
    successSoundLoading = false;
  }
}

/**
 * 播放成功提示音
 */
async function playSuccessSound() {
  try {
    const sound = await loadSuccessSound();
    if (sound) {
      // 重置位置到开头
      await sound.setPositionAsync(0);
      await sound.playAsync();
    }
  } catch (error) {
    console.error('播放成功提示音失败:', error);
  }
}

/**
 * 加载错误提示音
 */
async function loadErrorSound(): Promise<Audio.Sound | null> {
  if (errorSoundInstance) {
    return errorSoundInstance;
  }
  
  if (errorSoundLoading) {
    // 等待加载完成
    while (errorSoundLoading) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return errorSoundInstance;
  }
  
  errorSoundLoading = true;
  try {
    // 错误提示音：滴滴滴
    const { sound } = await Audio.Sound.createAsync(
      ERROR_SOUND,
      { shouldPlay: false, isLooping: false, volume: 0.8 },
      null,
      true
    );
    errorSoundInstance = sound;
    return sound;
  } catch (error) {
    console.error('加载错误提示音失败:', error);
    return null;
  } finally {
    errorSoundLoading = false;
  }
}

/**
 * 播放错误提示音（单次）
 */
async function playErrorSound() {
  try {
    const sound = await loadErrorSound();
    if (sound) {
      // 重置位置到开头
      await sound.setPositionAsync(0);
      await sound.playAsync();
    }
  } catch (error) {
    console.error('播放错误提示音失败:', error);
  }
}

/**
 * 扫码成功反馈
 * - 震动 + 提示音
 * - 清脆提示感
 * - 停止所有错误持续提醒
 */
export async function feedbackSuccess() {
  stopErrorVibrationInternal();
  stopErrorSoundInternal();
  await Promise.all([
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    playSuccessSound(),
  ]);
}

/**
 * 扫码重复/失败反馈
 * - 长震动 + 长提示音（持续）
 * - 用于扫码重复、错误等需要用户注意的情况
 */
export function feedbackDuplicate() {
  startErrorVibrationInternal();
  startErrorSoundInternal();
}

/**
 * 错误反馈（单次震动）
 */
export async function feedbackError() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * 警告反馈（单次震动）
 */
export async function feedbackWarning() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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

// ============================================================================
// 内部函数 - 持续震动和提示音
// ============================================================================

/**
 * 开始错误持续提示音（内部函数）
 */
function startErrorSoundInternal() {
  stopErrorSoundInternal();
  playErrorSound();
  errorSoundInterval = setInterval(() => {
    playErrorSound();
  }, 500);
}

/**
 * 停止错误持续提示音（内部函数）
 */
function stopErrorSoundInternal() {
  if (errorSoundInterval) {
    clearInterval(errorSoundInterval);
    errorSoundInterval = null;
  }
}

/**
 * 开始错误持续震动（内部函数）
 */
function startErrorVibrationInternal() {
  stopErrorVibrationInternal();
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  errorVibrationInterval = setInterval(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, 500);
}

/**
 * 停止错误持续震动（内部函数）
 */
function stopErrorVibrationInternal() {
  if (errorVibrationInterval) {
    clearInterval(errorVibrationInterval);
    errorVibrationInterval = null;
  }
}

/**
 * 清理音效资源（应用退出时调用）
 */
export async function cleanupSounds() {
  stopErrorVibrationInternal();
  stopErrorSoundInternal();
  
  if (successSoundInstance) {
    await successSoundInstance.unloadAsync();
    successSoundInstance = null;
  }
  if (errorSoundInstance) {
    await errorSoundInstance.unloadAsync();
    errorSoundInstance = null;
  }
}

// ============================================================================
// React Hook - 自动清理
// ============================================================================

/**
 * 自动清理反馈资源的 Hook
 * 在组件卸载时自动停止所有震动和提示音
 * 
 * @example
 * function MyComponent() {
 *   useFeedbackCleanup(); // 只需一行，自动处理卸载清理
 *   // ... 其他逻辑
 * }
 */
export function useFeedbackCleanup() {
  useEffect(() => {
    return () => {
      stopErrorVibrationInternal();
      stopErrorSoundInternal();
    };
  }, []);
}
