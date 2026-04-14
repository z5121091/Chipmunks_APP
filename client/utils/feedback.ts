/**
 * 扫码反馈工具
 * 提供震动反馈和成功提示音
 */

import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

// 持续震动的定时器ID
let errorVibrationInterval: ReturnType<typeof setInterval> | null = null;

// 音效实例缓存
let successSoundInstance: Audio.Sound | null = null;
let soundLoading = false;

// 成功提示音资源（静态导入）
const SUCCESS_SOUND = require('@/assets/sounds/success.wav');

/**
 * 加载成功提示音
 */
async function loadSuccessSound(): Promise<Audio.Sound | null> {
  if (successSoundInstance) {
    return successSoundInstance;
  }
  
  if (soundLoading) {
    // 等待加载完成
    while (soundLoading) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return successSoundInstance;
  }
  
  soundLoading = true;
  try {
    const { sound } = await Audio.Sound.createAsync(
      SUCCESS_SOUND,
      { shouldPlay: false, isLooping: false, volume: 0.8 },
      null,
      true // 预加载到内存
    );
    successSoundInstance = sound;
    return sound;
  } catch (error) {
    console.error('加载成功提示音失败:', error);
    return null;
  } finally {
    soundLoading = false;
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
 * 扫码成功反馈
 * - 震动 + 提示音
 * - 清脆提示感
 */
export async function feedbackSuccess() {
  // 成功时停止错误震动
  stopErrorVibration();
  
  // 同时触发震动和提示音
  await Promise.all([
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    playSuccessSound(),
  ]);
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

/**
 * 清理音效资源（应用退出时调用）
 */
export async function cleanupSounds() {
  if (successSoundInstance) {
    await successSoundInstance.unloadAsync();
    successSoundInstance = null;
  }
}
