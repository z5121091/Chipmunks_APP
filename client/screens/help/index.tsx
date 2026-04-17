import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { createStyles } from './styles';
import { Spacing } from '@/constants/theme';

// 类型定义
interface HelpItem {
  id: string;
  title: string;
  description: string;
  tip?: string;
}

interface HelpModule {
  id: string;
  title: string;
  icon: 'home' | 'archive' | 'send' | 'clipboard' | 'link' | 'settings' | 'file-text';
  items: HelpItem[];
}

// 使用说明数据
const HELP_DATA: HelpModule[] = [
  {
    id: '1',
    title: '首页',
    icon: 'home',
    items: [
      {
        id: '1.1',
        title: '功能模块',
        description: '首页采用2×3网格布局，展示六大功能入口：扫码入库、扫码出库、订单管理、盘点管理、物料管理、系统设置。图标和字体大小会根据屏幕尺寸自动适应。',
      },
      {
        id: '1.2',
        title: '快捷操作',
        description: '点击对应功能卡片即可快速进入，扫码出库直接进入PDA扫码页面，支持扫描枪快速录入。',
      },
    ],
  },
  {
    id: '2',
    title: '扫码入库',
    icon: 'archive',
    items: [
      {
        id: '2.1',
        title: '选择仓库',
        description: '进入扫码入库页面后，首先选择目标仓库。系统会自动选中默认仓库，也可点击切换其他仓库。切换仓库时会自动保存当前页面积累数据。',
      },
      {
        id: '2.2',
        title: '扫描录入',
        description: '使用PDA扫描枪扫描物料二维码，或手动输入二维码内容后按回车提交。系统自动根据配置的规则解析型号、批次、封装、版本号、数量、生产日期、追踪码、箱号等信息。',
      },
      {
        id: '2.3',
        title: '二维码识别',
        description: '系统自动识别二维码和一维码：二维码包含分隔符（如 ||、/、| 等），会震动提示并处理；一维码无分隔符，会静默忽略。',
        tip: '订单号格式（IO-年-月-日-序号）会直接处理，跳过一维码过滤。',
      },
      {
        id: '2.4',
        title: '型号确认',
        description: '扫描后显示型号列表，点击型号可标记为已核对（绿色背景显示），方便分拣核对。',
        tip: '同一型号多次扫描时数量会自动合并相加。',
      },
      {
        id: '2.5',
        title: '供应商识别',
        description: '扫描时会自动从物料管理中查询供应商信息，同一入库单只能扫描同一供应商的物料。',
        tip: '扫描不同供应商物料时会提示"供应商不一致"，阻止录入。',
      },
      {
        id: '2.6',
        title: '重复检测',
        description: '系统会进行三重查重：已保存的追溯码、已保存的原始内容、队列暂存内容。检测到重复时会震动提示。',
      },
      {
        id: '2.7',
        title: '历史入库数据',
        description: '点击顶部"历史"按钮可查看历史入库记录，支持按入库单号或型号搜索筛选。',
      },
      {
        id: '2.8',
        title: '确认入库',
        description: '扫描完成后点击"确认入库"按钮保存入库记录。入库成功后自动生成入库单号。',
      },
    ],
  },
  {
    id: '3',
    title: '扫码出库',
    icon: 'send',
    items: [
      {
        id: '3.1',
        title: 'PDA扫码',
        description: '首页点击"扫码出库"直接进入PDA扫码页面，支持扫描枪快速录入。切换仓库时会自动保存当前页面积累数据。',
      },
      {
        id: '3.2',
        title: '扫描订单',
        description: '首次进入需扫描订单号二维码，订单号格式：IO-年-月-日-序号。扫描订单后自动切换到该订单。',
      },
      {
        id: '3.3',
        title: '扫描物料',
        description: '订单激活后，扫描物料二维码进行出库。系统根据配置的规则解析物料信息，自动关联到当前订单。',
        tip: '系统自动识别扫描内容是订单号还是物料，无需手动切换模式。',
      },
      {
        id: '3.4',
        title: '二维码识别',
        description: '系统自动识别二维码和一维码：二维码包含分隔符会震动提示并处理；一维码无分隔符会静默忽略。',
      },
      {
        id: '3.5',
        title: '重复检测',
        description: '同一订单下，同一物料不允许重复扫描。系统会震动提示已扫码物料，防止重复。',
      },
      {
        id: '3.6',
        title: '物料列表',
        description: '底部显示最近扫描记录，列表头部显示总物料数。',
      },
    ],
  },
  {
    id: '4',
    title: '订单管理',
    icon: 'file-text',
    items: [
      {
        id: '4.1',
        title: '订单列表',
        description: '展示所有出库订单，支持按状态筛选（全部/待发货/已发货）。',
      },
      {
        id: '4.2',
        title: '创建订单',
        description: '点击右下角"+"按钮创建新订单，输入订单号和客户名称后保存。',
      },
      {
        id: '4.3',
        title: '查看详情',
        description: '点击订单卡片可查看该订单下所有物料信息。点击物料可编辑或删除。',
      },
      {
        id: '4.4',
        title: '订单操作',
        description: '长按订单卡片可删除订单。点击"导出"可将订单数据导出为Excel文件。',
      },
      {
        id: '4.5',
        title: '同步标签',
        description: '点击"同步标签"可将订单关联的标签数据同步到电脑，支持标签类型筛选（发货标签/剩余标签）。',
      },
    ],
  },
  {
    id: '5',
    title: '盘点管理',
    icon: 'clipboard',
    items: [
      {
        id: '5.1',
        title: '盘点模式',
        description: '盘点支持两种模式：整包盘点和拆包盘点。点击顶部Tab切换模式。切换仓库时会自动保存当前页面积累数据。',
      },
      {
        id: '5.2',
        title: '整包盘点',
        description: '整包盘点适用于盘点完整的物料包。扫描后记录盘点数量，不拆分物料。系统根据配置的规则解析物料信息。',
      },
      {
        id: '5.3',
        title: '拆包盘点',
        description: '拆包盘点适用于将物料包拆分成小包。扫描后输入实际数量，系统生成拆包标签。',
        tip: '拆包后会生成发货标签和剩余标签，可用于后续追踪。',
      },
      {
        id: '5.4',
        title: '二维码识别',
        description: '系统自动识别二维码和一维码：二维码包含分隔符会震动提示并处理；一维码无分隔符会静默忽略。',
      },
      {
        id: '5.5',
        title: '保存盘点',
        description: '扫描完成后点击"保存盘点"按钮，盘点记录保存到数据库。',
      },
    ],
  },
  {
    id: '6',
    title: '物料管理',
    icon: 'link',
    items: [
      {
        id: '6.1',
        title: '功能说明',
        description: '物料管理用于维护型号与存货编码、供应商的绑定关系，便于与库存系统对接。',
      },
      {
        id: '6.2',
        title: '新增绑定',
        description: '点击右上角"+"按钮新增绑定，填写扫描型号、存货编码、供应商（可选）、备注（可选）后保存。',
      },
      {
        id: '6.3',
        title: '编辑删除',
        description: '点击绑定记录进入编辑模式。左滑绑定记录可删除。',
      },
      {
        id: '6.4',
        title: '导入导出',
        description: '点击"导出模板"获取Excel模板，填写后点击"导入"批量导入绑定数据。',
        tip: '导入前请确保Excel格式与模板一致，否则可能导致导入失败。',
      },
    ],
  },
  {
    id: '7',
    title: '系统设置',
    icon: 'settings',
    items: [
      {
        id: '7.1',
        title: '设置分组',
        description: '设置页面分为：基础配置、解析配置、数据同步、备份恢复、数据管理五大分组。',
      },
      {
        id: '7.2',
        title: '在线更新',
        description: '点击"检查更新"可从NAS远程检测并下载最新版本APK。下载完成后会自动保存到Downloads文件夹，支持Android 7.0及以上版本。',
        tip: 'Android 7.0需要开启存储权限，Android 13需要开启"安装未知来源应用"权限。',
      },
      {
        id: '7.3',
        title: '仓库管理',
        description: '在"基础配置"中点击"仓库管理"，可新增、编辑、删除仓库，并设置默认仓库。',
      },
      {
        id: '7.4',
        title: '解析规则',
        description: '在"解析配置"中点击"解析规则"，可添加、编辑、删除二维码解析规则。',
        tip: '系统支持多规则匹配，可同时配置多个规则。',
      },
      {
        id: '7.4.1',
        title: '规则组成',
        description: '每个规则包含：规则名称、分隔符、字段顺序三个部分。系统根据这些信息解析扫码内容。',
      },
      {
        id: '7.4.2',
        title: '分隔符设置',
        description: '支持预设分隔符（/、|、,、*、#、;、||、//）和自定义分隔符（括号对如 {}、()、[]、<>，或自定义两字符符号）。',
        tip: '如果扫码内容是 URL（如 http://xxx），会跳过 // 分隔符检测，避免误判。',
      },
      {
        id: '7.4.3',
        title: '字段顺序配置',
        description: '点击字段按钮添加标准字段（型号、批次、封装、版本号、数量、生产日期、追踪码、箱号），可拖动调整顺序。',
        tip: '字段顺序必须与扫码内容的实际顺序一致，否则会导致解析结果错位。',
      },
      {
        id: '7.4.4',
        title: '自定义字段',
        description: '如果标准字段不够用，可先在"自定义字段"页面创建新字段，然后在规则中添加使用。',
      },
      {
        id: '7.4.5',
        title: '匹配条件（可选）',
        description: '可设置匹配条件来精确识别规则。例如：第1个字段包含"BL"则匹配该规则。适用于多个规则的扫码内容格式不同的情况。',
        tip: '匹配条件是"且"的关系，所有条件都满足时才匹配该规则。',
      },
      {
        id: '7.4.6',
        title: '规则匹配优先级',
        description: '系统优先匹配有匹配条件的规则，条件越多优先级越高。如果没有匹配条件完全一致的规则，则按字段数量精确匹配或近似匹配。',
      },
      {
        id: '7.4.7',
        title: '自动识别',
        description: '如果没有匹配到任何规则，系统会自动识别分隔符并按标准字段顺序解析（字段数量≤8时有效）。',
      },
      {
        id: '7.5',
        title: '数据同步',
        description: '在"数据同步"中配置电脑IP和端口，可将入库单、出库单、盘点单、标签数据同步到电脑。',
      },
      {
        id: '7.6',
        title: '备份恢复',
        description: '点击"备份数据"导出配置文件，点击"恢复数据"从备份文件恢复配置。',
      },
      {
        id: '7.7',
        title: '清空数据',
        description: '在"数据管理"中可清空入库记录、出库记录、盘点记录、标签记录，或清空全部数据。',
        tip: '清空数据不可恢复，请谨慎操作。',
      },
    ],
  },
];

export default function HelpScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();

  const renderModule = (module: HelpModule) => {
    return (
      <View key={module.id} style={styles.moduleBlock}>
        <View style={styles.moduleHeader}>
          <View style={styles.moduleIcon}>
            <Feather name={module.icon} size={16} color={theme.primary} />
          </View>
          <Text style={styles.moduleTitle}>{module.id}. {module.title}</Text>
        </View>
        
        {module.items.map((item) => (
          <View key={item.id} style={styles.itemContainer}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>{item.id}</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
                {item.tip && (
                  <View style={styles.tipBox}>
                    <Text style={styles.tipText}>💡 {item.tip}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

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
          <Text style={styles.title}>使用说明</Text>
        </View>

        {HELP_DATA.map(renderModule)}
      </ScrollView>
    </Screen>
  );
}
