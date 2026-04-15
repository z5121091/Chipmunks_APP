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
    version: 'V3.2.0',
    date: '2026-04-15',
    changes: [
      // 新增
      { type: 'feat', text: '首页：UI 改版' },
      { type: 'feat', text: '扫码入库：聚合显示' },
      { type: 'feat', text: '扫码入库：勾选确认' },
      { type: 'feat', text: '扫码入库：展开折叠' },
      { type: 'feat', text: '扫码入库：长按删除' },
      { type: 'feat', text: '扫码出库：聚合显示' },
      { type: 'feat', text: '扫码出库：长按删除' },
      { type: 'feat', text: '盘点：勾选确认' },
      { type: 'feat', text: '盘点：展开折叠' },
      { type: 'feat', text: '盘点：长按删除' },
      { type: 'feat', text: '盘点：扩展字段支持' },
      { type: 'feat', text: '全局：统一 Toast 组件' },
      { type: 'feat', text: '扫码：统一重复反馈' },
      { type: 'feat', text: '自动更新功能' },
      // 优化
      { type: 'improve', text: '首页：大图标、主题色、点击动画' },
      { type: 'improve', text: '扫码：Toast 覆盖在输入框上方' },
      { type: 'improve', text: '扫码：统一输入框、按钮、标签样式' },
      { type: 'improve', text: '入库同步：只保留明细表' },
      { type: 'improve', text: '扫码/盘点：统一聚合样式' },
      { type: 'improve', text: '更新弹窗优化' },
      { type: 'improve', text: '备份：新增仓库和服务器配置' },
      { type: 'improve', text: '全局：统一版本号管理' },
      { type: 'improve', text: '扫码反馈：成功播报「成功」，重复播报「重复」' },
      { type: 'improve', text: '扫码反馈：震动改为单次' },
      { type: 'improve', text: '提示音：移除音效文件，纯中文语音反馈' },
      { type: 'improve', text: '声音开关：支持实时控制语音播报' },
      // 修复
      { type: 'fix', text: '扫码：移除空格分隔符' },
      { type: 'fix', text: '扫码：Toast 布局黑色区域' },
      { type: 'fix', text: '入库：缺少原始二维码' },
      { type: 'fix', text: '入库：重复检测逻辑' },
      { type: 'fix', text: '出库：聚合明细批次显示错误' },
      { type: 'fix', text: '出库：长按删除失效' },
      { type: 'fix', text: '更新弹窗：服务器地址无法输入' },
      { type: 'fix', text: '设置：状态栏背景色不协调' },
      { type: 'fix', text: '设置：服务器地址认证信息泄露' },
      { type: 'fix', text: '扫码：音效无声' },
      { type: 'fix', text: '扫码：音效加载竞态' },
      { type: 'fix', text: '全局：时间显示为北京时间' },
    ],
  },
  {
    version: 'V3.1.2',
    date: '2026-03-05',
    changes: [
      // 优化
      { type: 'improve', text: '入库：重复扫码震动' },
      { type: 'improve', text: '订单：编辑优化' },
      { type: 'improve', text: '解析规则：智能识别日期' },
      { type: 'improve', text: '输入框：键盘避让' },
      // 修复
      { type: 'fix', text: '出库：清单命名和编码' },
      { type: 'fix', text: '解析规则：日期字段拆分' },
    ],
  },
  {
    version: 'V3.1.1',
    date: '2026-03-03',
    changes: [
      // 新增
      { type: 'feat', text: '入库：历史查询与筛选' },
      { type: 'feat', text: '入库：同型号数量合并' },
      { type: 'feat', text: '入库：点击型号切换确认' },
      { type: 'feat', text: '入库：滑动删除' },
      // 优化
      { type: 'improve', text: '同步服务：日志自动轮转' },
    ],
  },
  {
    version: 'V3.0.0',
    date: '2026-03-01',
    changes: [
      { type: 'feat', text: '掌上仓库 APP 正式上线' },
      { type: 'feat', text: '扫码入库：供应商识别、重复检测' },
      { type: 'feat', text: '扫码出库：PDA扫码模式' },
      { type: 'feat', text: '订单管理：创建、编辑、删除、导出' },
      { type: 'feat', text: '盘点功能：整包/拆包盘点' },
      { type: 'feat', text: '物料管理：型号编码绑定' },
      { type: 'feat', text: '仓库管理：多仓库支持' },
      { type: 'feat', text: '数据同步：一键同步到电脑' },
      { type: 'feat', text: '备份恢复：配置备份' },
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
