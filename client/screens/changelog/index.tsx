import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { Spacing } from '@/constants/theme';

// 更新日志数据
const CHANGELOG_DATA = [
  {
    version: 'V3.3.3',
    date: '2026-04-15',
    changes: [
      // 重构
      { type: 'improve', text: '新增 useToast Hook，统一 Toast 提示组件' },
      { type: 'improve', text: '新增 feedbackDuplicate()，统一重复扫码反馈（震动+提示音）' },
      { type: 'improve', text: '新增 useFeedbackCleanup Hook，自动清理震动和提示音' },
      { type: 'improve', text: '扫码出库/入库/盘点：移除重复的震动/提示音逻辑' },
      { type: 'improve', text: '扫码出库/入库/盘点：页面只调用 API，不实现细节' },
      // 优化
      { type: 'improve', text: '提示音升级：成功提示音改为「滴」（800Hz，短促）' },
      { type: 'improve', text: '提示音升级：错误提示音改为「滴滴滴」（600Hz，三声）' },
    ],
  },
  {
    version: 'V3.3.0',
    date: '2026-04-17',
    changes: [
      // 优化
      { type: 'improve', text: '扫码出库/入库/盘点：Toast 完全覆盖在输入框上面，视觉效果更协调' },
      { type: 'improve', text: '扫码出库/入库/盘点：统一输入框样式，使用 lg 圆角' },
      { type: 'improve', text: '扫码出库/入库/盘点：按钮字体统一为 rf(16)' },
      { type: 'improve', text: '扫码出库/入库/盘点：绿色标签字体统一为 rf(16)' },
      { type: 'improve', text: '扫码出库/入库/盘点：空状态文字统一为 rf(16)' },
      { type: 'improve', text: '扫码出库/入库/盘点：Toast 文字统一为 rf(16)' },
      // 修复
      { type: 'fix', text: '二维码检测：移除空格作为分隔符，避免普通文本被误判为二维码' },
      { type: 'fix', text: 'Toast 布局：去掉输入框下面的黑色区域（移除预留高度容器）' },
    ],
  },
  {
    version: 'V3.2.8',
    date: '2026-04-17',
    changes: [
      // 新增
      { type: 'feat', text: '扫码入库：前端聚合显示（按型号+版本），保存原始记录' },
      { type: 'feat', text: '扫码入库：勾选框确认功能（左侧勾选，点击确认）' },
      { type: 'feat', text: '扫码入库：展开/折叠明细功能（点击展开）' },
      { type: 'feat', text: '扫码入库：长按删除功能（聚合组和明细）' },
      { type: 'feat', text: '盘点管理：勾选框确认功能（左侧勾选，点击确认）' },
      { type: 'feat', text: '盘点管理：展开/折叠明细功能（点击展开）' },
      { type: 'feat', text: '盘点管理：长按删除功能（聚合组和明细）' },
      // 优化
      { type: 'improve', text: 'Android：仅支持 Android 13 及以上版本，移除旧版本支持' },
      { type: 'improve', text: '扫码入库：优化入库逻辑，每条原始记录独立保存' },
      { type: 'improve', text: '入库单同步：移除数据整合表，只保留明细表' },
      { type: 'improve', text: '盘点管理：优化聚合逻辑，按型号+版本号聚合显示' },
      { type: 'improve', text: '盘点管理：添加扩展字段支持（版本号、封装、追溯码等）' },
      { type: 'improve', text: '扫码入库/盘点/出库：统一聚合样式，显示箭头（▶/▼）' },
      { type: 'improve', text: '扫码入库/盘点/出库：优化输入框内边距，防止文字被遮挡' },
      // 修复
      { type: 'fix', text: '扫码入库：修复入库单缺少原始二维码数据的问题' },
      { type: 'fix', text: '扫码入库：修复重复检测逻辑（使用追溯码判断）' },
      { type: 'fix', text: '入库单同步：修复明细表缺少扩展字段（版本号、封装、追溯码等）' },
      { type: 'fix', text: '扫码入库/盘点：修复聚合样式与扫码出库不一致的问题' },
    ],
  },
  {
    version: 'V3.2.7',
    date: '2026-04-17',
    changes: [
      // 新增
      { type: 'feat', text: '扫码入库：前端聚合显示（按型号+版本），保存原始记录' },
      { type: 'feat', text: '扫码入库：勾选框确认功能（左侧勾选，点击确认）' },
      { type: 'feat', text: '扫码入库：展开/折叠明细功能（中间区域点击展开）' },
      { type: 'feat', text: '扫码入库：长按删除功能（聚合组和明细）' },
      { type: 'feat', text: '盘点管理：勾选框确认功能（左侧勾选，点击确认）' },
      { type: 'feat', text: '盘点管理：展开/折叠明细功能（中间区域点击展开）' },
      { type: 'feat', text: '盘点管理：长按删除功能（聚合组和明细）' },
      // 优化
      { type: 'improve', text: 'Android：仅支持 Android 13 及以上版本，移除旧版本支持' },
      { type: 'improve', text: '扫码入库：优化入库逻辑，每条原始记录独立保存' },
      { type: 'improve', text: '入库单同步：移除数据整合表，只保留明细表' },
      { type: 'improve', text: '盘点管理：优化聚合逻辑，按型号+版本号聚合显示' },
      { type: 'improve', text: '盘点管理：添加扩展字段支持（版本号、封装、追溯码等）' },
      // 修复
      { type: 'fix', text: '扫码入库：修复入库单缺少原始二维码数据的问题' },
      { type: 'fix', text: '扫码入库：修复重复检测逻辑（使用追溯码判断）' },
      { type: 'fix', text: '入库单同步：修复明细表缺少扩展字段（版本号、封装、追溯码等）' },
    ],
  },
  {
    version: 'V3.2.6',
    date: '2026-04-17',
    changes: [
      // 新增
      { type: 'feat', text: '扫码入库：前端聚合显示（按型号+版本），保存原始记录' },
      // 优化
      { type: 'improve', text: 'Android：仅支持 Android 13 及以上版本，移除旧版本支持' },
      { type: 'improve', text: '扫码入库：优化入库逻辑，每条原始记录独立保存' },
      { type: 'improve', text: '入库单同步：移除数据整合表，只保留明细表' },
      { type: 'improve', text: '盘点管理：优化聚合逻辑，按型号+版本号聚合显示' },
      { type: 'improve', text: '盘点管理：添加扩展字段支持（版本号、封装、追溯码等）' },
      // 修复
      { type: 'fix', text: '扫码入库：修复入库单缺少原始二维码数据的问题' },
      { type: 'fix', text: '扫码入库：修复重复检测逻辑（使用追溯码判断）' },
      { type: 'fix', text: '入库单同步：修复明细表缺少扩展字段（版本号、封装、追溯码等）' },
    ],
  },
  {
    version: 'V3.2.5',
    date: '2026-04-17',
    changes: [
      // 新增
      { type: 'feat', text: '扫码入库：前端聚合显示（按型号+版本），保存原始记录' },
      // 优化
      { type: 'improve', text: 'Android：仅支持 Android 13 及以上版本，移除旧版本支持' },
      { type: 'improve', text: '扫码入库：优化入库逻辑，每条原始记录独立保存' },
      { type: 'improve', text: '入库单同步：移除数据整合表，只保留明细表' },
      // 修复
      { type: 'fix', text: '扫码入库：修复入库单缺少原始二维码数据的问题' },
      { type: 'fix', text: '扫码入库：修复重复检测逻辑（使用追溯码判断）' },
      { type: 'fix', text: '入库单同步：修复明细表缺少扩展字段（版本号、封装、追溯码等）' },
    ],
  },
  {
    version: 'V3.2.4',
    date: '2026-04-17',
    changes: [
      // 新增
      { type: 'feat', text: '扫码入库：前端聚合显示（按型号+版本），保存原始记录' },
      // 优化
      { type: 'improve', text: 'Android：仅支持 Android 13 及以上版本，移除旧版本支持' },
      { type: 'improve', text: '扫码入库：优化入库逻辑，每条原始记录独立保存' },
      // 修复
      { type: 'fix', text: '扫码入库：修复入库单缺少原始二维码数据的问题' },
      { type: 'fix', text: '扫码入库：修复重复检测逻辑（使用追溯码判断）' },
    ],
  },
  {
    version: 'V3.2.3',
    date: '2026-04-16',
    changes: [
      // 新增
      { type: 'feat', text: '扫码出库：物料聚合显示功能（按型号+版本聚合）' },
      { type: 'feat', text: '扫码出库：长按删除功能（支持聚合项和明细项）' },
      // 优化
      { type: 'improve', text: '更新安装：简化流程，统一使用分享方式让用户选择保存位置' },
      { type: 'improve', text: '更新弹窗：优化内容区域高度计算，适配不同屏幕尺寸' },
      // 修复
      { type: 'fix', text: '扫码出库：修复聚合明细显示批次字段错误（之前显示箱号）' },
      { type: 'fix', text: '扫码出库：修复长按删除功能无法正确删除物料的问题' },
      { type: 'fix', text: '更新弹窗：修复"修改服务器地址"无法输入问题' },
      { type: 'fix', text: '更新弹窗：优化下载进度文字可见性' },
      { type: 'fix', text: '更新弹窗：修复小屏手机按钮显示不全问题' },
      { type: 'fix', text: 'Screen组件：修复深色模式下状态栏背景色不协调' },
      { type: 'fix', text: '服务器地址：隐藏认证信息防隐私泄露' },
    ],
  },
  {
    version: 'V3.2.0',
    date: '2026-04-15',
    changes: [
      // 优化
      { type: 'improve', text: '首页：UI全新改版，6个模块自适应撑满全屏' },
      { type: 'improve', text: '首页：模块采用大图标、6种主题色、点击缩放动画' },
      { type: 'improve', text: '首页：布局优化，上下左右均匀留白，边框区分模块' },
      { type: 'improve', text: '设置页：关于区域布局优化，图标和文字单行显示' },

      // 修复
      { type: 'fix', text: '设置页：关于区域Spacing未导入错误' },
    ],
  },
  {
    version: 'V3.1.2',
    date: '2026-04-09',
    changes: [
      // 优化
      { type: 'improve', text: '扫码入库：重复扫码震动提醒' },
      { type: 'improve', text: '订单管理：编辑物料仅允许修改数量' },
      { type: 'improve', text: '物料管理：列表加载性能优化' },
      { type: 'improve', text: '解析规则：智能识别日期格式' },
      { type: 'improve', text: '输入框：键盘避让优化' },
      { type: 'improve', text: '退出页面：震动自动停止' },
      // 修复
      { type: 'fix', text: '出库清单：命名统一' },
      { type: 'fix', text: '出库清单：编码同步' },
      { type: 'fix', text: '解析规则：日期字段被错误拆分' },
    ],
  },
  {
    version: 'V3.1.1',
    date: '2026-04-08',
    changes: [
      // 新增
      { type: 'feat', text: '在线更新：支持自动检测并下载更新包' },
      { type: 'feat', text: '扫码入库：历史数据查询与筛选' },
      { type: 'feat', text: '扫码入库：同一型号数量自动合并显示' },
      { type: 'feat', text: '扫码入库：点击型号行切换确认状态' },
      { type: 'feat', text: '扫码入库：历史记录滑动删除' },
      // 优化
      { type: 'improve', text: '同步服务：日志自动轮转' },
    ],
  },
  {
    version: 'V3.0.0',
    date: '2026-03-01',
    changes: [
      // 新增
      { type: 'feat', text: '全新应用架构，全新UI设计' },
      { type: 'feat', text: '扫码入库：供应商识别、重复检测、自动生成单号' },
      { type: 'feat', text: '扫码出库：PDA扫码模式，自动识别订单' },
      { type: 'feat', text: '订单管理：订单创建、编辑、删除、导出' },
      { type: 'feat', text: '盘点功能：整包盘点和拆包盘点' },
      { type: 'feat', text: '物料管理：型号-编码绑定，支持导入导出' },
      { type: 'feat', text: '仓库管理：多仓库支持，可设置默认仓库' },
      { type: 'feat', text: '数据同步：一键同步到电脑' },
      { type: 'feat', text: '备份恢复：配置数据备份与恢复' },
    ],
  },
];

export default function ChangelogScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: Spacing['5xl'] + insets.bottom 
          }
        ]}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>更新日志</Text>
        </View>

        {CHANGELOG_DATA.map((log) => (
          <View key={log.version} style={styles.versionBlock}>
            <View style={styles.versionHeader}>
              <Text style={styles.versionText}>{log.version}</Text>
              <Text style={styles.dateText}>{log.date}</Text>
            </View>
            
            {log.changes.map((change, index) => {
              const tagStyle = change.type === 'feat' 
                ? styles.tagFeat 
                : change.type === 'fix' 
                  ? styles.tagFix 
                  : styles.tagImprove;
              const tagTextStyle = change.type === 'feat'
                ? styles.tagTextFeat
                : change.type === 'fix'
                  ? styles.tagTextFix
                  : styles.tagTextImprove;
              const tagLabel = change.type === 'feat' ? '新增' : change.type === 'fix' ? '修复' : '优化';
              
              return (
                <View key={`${log.version}-${index}`} style={styles.changeItem}>
                  <View style={[styles.changeTag, tagStyle]}>
                    <Text style={tagTextStyle}>{tagLabel}</Text>
                  </View>
                  <Text style={styles.changeText}>{change.text}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
