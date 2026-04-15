/**
 * 应用版本号配置
 * 
 * ⚠️ 更新版本时只需修改 client/version.json 文件中的 version 字段！
 * 
 * 此文件从 version.json 读取配置，确保所有地方版本号一致
 */
import versionConfig from '../version.json';

// 版本号（带V前缀，如 V3.3.4）
export const APP_VERSION = versionConfig.version;
export const ANDROID_VERSION_CODE = versionConfig.versionCode;
export const IOS_BUILD_NUMBER = versionConfig.buildNumber;

// 应用信息
export const APP_NAME = versionConfig.appName;
export const COMPANY_NAME = versionConfig.companyName;
export const COMPANY_WEBSITE = versionConfig.companyWebsite;
export const AUTHOR = versionConfig.author;

// 类型导出
export type VersionConfig = typeof versionConfig;
