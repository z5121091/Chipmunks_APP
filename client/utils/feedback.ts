/**
 * 扫码反馈工具
 * 提供震动反馈和成功提示音
 */

import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 声音开关存储键
const SOUND_ENABLED_KEY = '@sound_enabled';

// 声音开关状态缓存（同步访问）
let soundEnabled: boolean = true;

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
 * 初始化声音开关状态
 */
export async function initSoundSetting() {
  try {
    const value = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
    soundEnabled = value === null || value === 'true';
    console.log('[Feedback] 声音开关状态:', soundEnabled);
  } catch {
    soundEnabled = true;
  }
}

/**
 * 设置声音开关状态（设置页面调用）
 */
export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  AsyncStorage.setItem(SOUND_ENABLED_KEY, String(enabled)).catch(console.error);
  console.log('[Feedback] 设置声音开关:', enabled);
}

/**
 * 获取声音开关状态
 */
export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * 加载成功提示音
 */
async function loadSuccessSound(): Promise<Audio.Sound | null> {
  if (successSoundInstance) {
    return successSoundInstance;
  }
  
  if (successSoundLoading) {
    while (successSoundLoading) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return successSoundInstance;
  }
  
  successSoundLoading = true;
  try {
    const { sound } = await Audio.Sound.createAsync(
      SUCCESS_SOUND,
      { shouldPlay: false, isLooping: false, volume: 1.0 },
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
  if (!soundEnabled) {
    console.log('[Feedback] 声音已关闭，跳过音效');
    return;
  }
  
  try {
    const sound = await loadSuccessSound();
    if (sound) {
      await sound.stopAsync();
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
    while (errorSoundLoading) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return errorSoundInstance;
  }
  
  errorSoundLoading = true;
  try {
    const { sound } = await Audio.Sound.createAsync(
      ERROR_SOUND,
      { shouldPlay: false, isLooping: false, volume: 1.0 },
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
 * 播放错误提示音
 */
async function playErrorSound() {
  if (!soundEnabled) {
    console.log('[Feedback] 声音已关闭，跳过音效');
    return;
  }
  
  try {
    const sound = await loadErrorSound();
    if (sound) {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      await sound.playAsync();
    }
  } catch (error) {
    console.error('播放错误提示音失败:', error);
  }
}

/**
 * 扫码成功反馈
 */
export async function feedbackSuccess() {
  console.log('[Feedback] feedbackSuccess 触发');
  
  // 停止持续震动
  stopErrorVibrationInternal();
  stopErrorSoundInternal();
  
  // 震动
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('[Feedback] 震动成功');
  } catch (e) {
    console.error('[Feedback] 震动失败:', e);
  }
  
  // 声音
  await playSuccessSound();
}

/**
 * 扫码重复反馈
 */
export function feedbackDuplicate() {
  console.log('[Feedback] feedbackDuplicate 触发');
  
  stopErrorVibrationInternal();
  stopErrorSoundInternal();
  
  startErrorVibrationInternal();
  startErrorSoundInternal();
}

/**
 * 错误反馈（单次）
 */
export async function feedbackError() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * 警告反馈（单次）
 */
export async function feedbackWarning() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

// ============================================================================
// 内部函数 - 持续震动和提示音
// ============================================================================

function startErrorSoundInternal() {
  stopErrorSoundInternal();
  playErrorSound();
  errorSoundInterval = setInterval(() => {
    playErrorSound();
  }, 500);
}

function stopErrorSoundInternal() {
  if (errorSoundInterval) {
    clearInterval(errorSoundInterval);
    errorSoundInterval = null;
  }
  if (errorSoundInstance) {
    errorSoundInstance.stopAsync().catch(() => {});
  }
}

function startErrorVibrationInternal() {
  stopErrorVibrationInternal();
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  errorVibrationInterval = setInterval(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, 500);
}

function stopErrorVibrationInternal() {
  if (errorVibrationInterval) {
    clearInterval(errorVibrationInterval);
    errorVibrationInterval = null;
  }
}

/**
 * 清理音效资源
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
