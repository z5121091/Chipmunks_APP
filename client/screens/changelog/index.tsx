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
    version: 'V3.3.5',
    date: '2026-04-15',
    changes: [
      // 修复
      { type: 'fix', text: '扫码成功音效无声' },
      { type: 'fix', text: '音效加载竞态条件' },
      { type: 'fix', text: '时间显示改为北京时间' },
      // 优化
      { type: 'improve', text: '备份功能新增仓库和服务器配置' },
      { type: 'improve', text: '统一版本号管理' },
    ],
  },
  {
    version: 'V3.3.4',
    date: '2026-03-25',
    changes: [
      // 新增
      { type: 'feat', text: '统一 Toast 提示组件（useToast Hook）' },
      { type: 'feat', text: '统一重复扫码反馈（feedbackDuplicate）' },
      // 优化
      { type: 'improve', text: '成功提示音改为「滴」，错误提示音改为「滴滴滴」' },
      { type: 'improve', text: '扫码页面移除重复的震动/提示音逻辑' },
    ],
  },
  {
    version: 'V3.3.0',
    date: '2026-03-21',
    changes: [
      // 优化
      { type: 'improve', text: 'Toast 覆盖在输入框上方' },
      { type: 'improve', text: '统一输入框、按钮、标签、Toast 样式' },
      // 修复
      { type: 'fix', text: '移除空格分隔符，避免误判二维码' },
      { type: 'fix', text: 'Toast 布局黑色区域' },
    ],
  },
  {
    version: 'V3.2.8',
    date: '2026-03-19',
    changes: [
      // 新增
      { type: 'feat', text: '扫码入库：聚合显示、勾选确认、展开折叠、长按删除' },
      { type: 'feat', text: '盘点管理：勾选确认、展开折叠、长按删除' },
      { type: 'feat', text: '盘点管理：扩展字段支持（版本号、封装、追溯码）' },
      // 优化
      { type: 'improve', text: '入库单同步只保留明细表' },
      { type: 'improve', text: '统一聚合样式，显示箭头' },
      { type: 'improve', text: '仅支持 Android 13 及以上' },
      // 修复
      { type: 'fix', text: '入库单缺少原始二维码数据' },
      { type: 'fix', text: '重复检测逻辑和扩展字段缺失' },
    ],
  },
  {
    version: 'V3.2.3',
    date: '2026-03-09',
    changes: [
      // 新增
      { type: 'feat', text: '扫码出库：物料聚合显示和长按删除' },
      { type: 'feat', text: '自动更新功能' },
      // 优化
      { type: 'improve', text: '更新弹窗优化' },
      // 修复
      { type: 'fix', text: '聚合明细显示批次错误' },
      { type: 'fix', text: '服务器地址认证信息泄露' },
    ],
  },
  {
    version: 'V3.2.0',
    date: '2026-03-07',
    changes: [
      // 新增
      { type: 'feat', text: '首页 UI 改版，6 个模块自适应布局' },
      // 优化
      { type: 'improve', text: '首页大图标、主题色、点击动画' },
    ],
  },
  {
    version: 'V3.1.2',
    date: '2026-03-05',
    changes: [
      // 优化
      { type: 'improve', text: '扫码入库震动提醒' },
      { type: 'improve', text: '订单编辑、解析规则优化' },
      { type: 'improve', text: '输入框键盘避让' },
      // 修复
      { type: 'fix', text: '出库清单命名和编码' },
      { type: 'fix', text: '解析规则日期字段拆分错误' },
    ],
  },
  {
    version: 'V3.1.1',
    date: '2026-03-03',
    changes: [
      // 新增
      { type: 'feat', text: '扫码入库：历史查询、合并显示、滑动删除' },
      { type: 'feat', text: '点击型号行切换确认状态' },
      // 优化
      { type: 'improve', text: '同步服务日志自动轮转' },
    ],
  },
  {
    version: 'V3.0.0',
    date: '2026-03-01',
    changes: [
      // 新增
      { type: 'feat', text: '掌上仓库 APP 正式上线' },
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
