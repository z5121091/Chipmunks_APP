# 掌上仓库 APP

> 专为制造业/半导体行业设计的移动端仓库管理工具，支持扫码入库出库、库存盘点、物料追溯

基于 Expo 54 + React Native + Express.js 的仓储管理系统。

---

## 项目概览

**掌上仓库**是一款面向工厂仓库的移动端应用，主要功能包括：
- 📥 **扫码入库**：扫描物料二维码，自动解析并记录入库信息
- 📤 **扫码出库**：扫描出库，支持订单匹配和批次管理
- 🔍 **库存盘点**：定期盘点，支持扫码快速核对
- 📋 **订单管理**：采购入库、销售出库订单管理
- 🏭 **仓库管理**：多仓库切换，数据隔离
- 📊 **数据导出**：一键导出 Excel，与 PC 端无缝衔接

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Expo 54 + React Native | 跨平台移动应用 |
| 语言 | TypeScript | 类型安全 |
| 后端 | Express.js | API 服务 |
| 存储 | AsyncStorage | 本地持久化 |
| 架构 | pnpm Monorepo | 统一管理前后端 |

---

## 目录结构详解

```
Chipmunks_APP/
│
├── .coze                      # ⚙️ Coze 平台配置文件（勿修改）
│
├── .cozeproj/                 # 🔧 脚手架脚本
│   └── scripts/
│       ├── dev_build.sh       #   开发环境构建脚本
│       ├── dev_run.sh          #   开发环境启动脚本
│       ├── prod_build.sh       #   生产环境构建脚本
│       └── prod_run.sh        #   生产环境启动脚本
│
├── client/                    # 📱 React Native 前端应用
│   │
│   ├── app/                   # 🧭 Expo Router 路由配置
│   │   ├── _layout.tsx        #   根布局（全局配置）
│   │   ├── index.tsx          #   首页入口（重定向到 home）
│   │   ├── home.tsx           #   首页路由
│   │   ├── inbound.tsx        #   入库页面路由
│   │   ├── outbound.tsx       #   出库页面路由
│   │   ├── inventory.tsx      #   盘点页面路由
│   │   ├── orders.tsx         #   订单管理路由
│   │   ├── warehouse-management.tsx  # 仓库管理路由
│   │   ├── settings.tsx       #   系统设置路由
│   │   ├── rules.tsx          #   解析规则路由
│   │   ├── changelog.tsx       #   更新日志路由
│   │   ├── custom-fields.tsx   #   自定义字段路由
│   │   ├── help.tsx           #   帮助中心路由
│   │   └── detail.tsx         #   详情页路由
│   │
│   ├── screens/               # 📄 页面实现（与 app/ 目录对应）
│   │   ├── home/              #   首页：功能入口展示
│   │   ├── inbound/           #   入库：扫码入库、记录管理
│   │   ├── outbound/         #   出库：扫码出库、订单匹配
│   │   ├── inventory/         #   盘点：库存盘点、差异记录
│   │   ├── orders/           #   订单：订单列表、统计、筛选
│   │   ├── warehouse-management/  # 仓库管理：仓库增删改查
│   │   ├── settings/         #   设置：声音、震动、版本信息
│   │   ├── rules/            #   规则：扫码解析规则配置
│   │   ├── changelog/         #   日志：版本更新历史
│   │   ├── custom-fields/     #   字段：自定义字段配置
│   │   ├── detail/           #   详情：扫码记录、物料详情
│   │   ├── inventory-binding/ #   绑定：库存绑定配置
│   │   ├── labels/           #   标签：标签打印
│   │   ├── help/             #   帮助：使用说明
│   │   └── demo/             #   示例：Demo 演示页
│   │
│   ├── components/           # 🧩 通用组件库
│   │   ├── Screen.tsx         #   页面容器（安全区、键盘避让）
│   │   ├── AnimatedButton.tsx #  动画按钮
│   │   ├── AnimatedCard.tsx   #  动画卡片
│   │   ├── CustomAlert.tsx    #  自定义弹窗
│   │   ├── SmartDateInput.tsx #  智能日期输入
│   │   ├── ThemedText.tsx     #  主题文本
│   │   ├── ThemedView.tsx     #  主题容器
│   │   └── WheelDatePicker.tsx # 滚轮日期选择器
│   │
│   ├── constants/            # 📐 常量定义
│   │   ├── theme.ts          #   主题配置（颜色、字体）
│   │   ├── config.ts         #   应用配置
│   │   └── version.ts        #   版本号配置（由 version.json 生成）
│   │
│   ├── contexts/             # 🎭 React Context
│   │   └── AuthContext.tsx    #  认证上下文
│   │
│   ├── hooks/                # ⚓ 自定义 Hooks
│   │   ├── useTheme.ts       #   主题 Hook
│   │   ├── useColorScheme.tsx #  颜色方案 Hook
│   │   ├── usePDAScanner.ts   #  PDA 扫码 Hook
│   │   └── useSafeRouter.ts   #  安全路由 Hook
│   │
│   ├── utils/                # 🛠️ 工具函数
│   │   ├── database.ts       #   本地数据库操作
│   │   ├── time.ts           #   时间格式化工具
│   │   ├── qrcodeParser.ts   #   二维码解析器
│   │   ├── feedback.ts       #   震动/语音反馈
│   │   ├── toast.tsx         #   Toast 提示组件
│   │   ├── update.ts         #   在线更新功能
│   │   ├── excel.ts          #   Excel 导出功能
│   │   ├── heartbeat.ts      #   心跳检测
│   │   ├── logger.ts         #   日志记录
│   │   ├── colors.ts         #   颜色工具
│   │   ├── responsive.ts     #   响应式布局
│   │   └── index.ts          #   统一导出
│   │
│   ├── assets/               # 🖼️ 静态资源
│   │   ├── images/           #   图片资源
│   │   │   ├── icon.png      #     应用图标
│   │   │   └── splash.png    #     启动页图片
│   │   └── sounds/           #   音频资源
│   │       └── *.wav         #     提示音文件
│   │
│   ├── resources/            # 📚 资源配置
│   │   ├── colors.ts        #   颜色常量
│   │   ├── dimens.ts        #   尺寸常量
│   │   ├── strings.ts       #   字符串常量
│   │   └── index.ts         #   统一导出
│   │
│   ├── plugins/              # 🔌 Expo 插件
│   │   └── BootReceiverPlugin.js  # 开机广播插件
│   │
│   ├── android/              # 🤖 Android 原生代码
│   │   ├── app/
│   │   │   └── src/main/
│   │   │       ├── java/com/chipmunks/traceability/  # Java/Kotlin 源码
│   │   │       │   ├── MainActivity.kt   # 主 Activity
│   │   │       │   └── MainApplication.kt # 应用入口
│   │   │       └── res/                   # Android 资源
│   │   │           ├── drawable-*         #   不同分辨率图片
│   │   │           ├── mipmap-*           #   应用图标
│   │   │           └── values/            #   字符串/颜色/样式
│   │   └── gradle/               # Gradle 构建配置
│   │
│   ├── version.json           # 📌 版本配置（自动更新）
│   ├── app.config.ts          #   Expo 应用配置
│   ├── babel.config.js        #   Babel 编译配置
│   ├── metro.config.js        #   Metro 打包配置
│   ├── tsconfig.json          #   TypeScript 配置
│   └── package.json           #   依赖配置
│
├── server/                    # ⚙️ Express.js 后端服务
│   ├── src/
│   │   ├── index.ts          #   服务入口（API 路由定义）
│   │   └── routes/           #   路由模块（按功能划分）
│   ├── android/              #   Android 原生代码（服务端相关）
│   ├── dist/                 #   编译输出目录
│   ├── build.js              #   构建脚本
│   ├── tsconfig.json         #   TypeScript 配置
│   └── package.json          #   依赖配置
│
├── docs/                      # 📝 文档目录
│   ├── ROADMAP.md            #   产品路线图
│   │   └── VERSION_MANAGEMENT.md  # 版本管理规范
│   └── 系统规划文档.md        #   系统功能规划
│
├── scripts/                   # 📜 辅助脚本
│   ├── build.bat             #   Windows 构建脚本
│   ├── build_sync_service.bat #  构建+同步服务脚本
│   ├── sync-version.js       #   版本同步脚本
│   ├── label_sync_server.py  #   标签同步服务（Python）
│   └── create_icon.py        #   图标生成脚本
│
├── eslint-plugins/            # 🔍 ESLint 自定义规则
│   ├── fontawesome6/         #   FontAwesome6 检测
│   ├── forbid-emoji/         #   禁止 Emoji
│   ├── react-native/         #   React Native 规范
│   ├── reanimated/           #   Reanimated 动画规范
│   └── restrict-linear-gradient/  # 限制渐变使用
│
├── patches/                   # 🩹 依赖补丁
│   └── expo@*.patch          #   Expo 库补丁
│
├── package.json               # 📦 根目录 pnpm workspace 配置
├── pnpm-workspace.yaml        #   pnpm 工作空间配置
├── pnpm-lock.yaml            #   依赖锁定文件
└── tsconfig.json              #   TypeScript 根配置
```

---

## 核心功能模块

### 1. 入库管理 (`screens/inbound/`)
- 扫码入库：扫描物料二维码，自动解析型号、批次、数量等信息
- 扫码队列：连续扫码暂存队列，处理完成后自动下一条
- 重复检测：三重查重机制（已保存/队列/历史）
- 自动解析：根据配置规则智能解析扫码内容

### 2. 出库管理 (`screens/outbound/`)
- 扫码出库：扫描出库，支持订单匹配
- 订单持久化：App 重启后自动恢复扫码状态
- 仓库切换：自动保存并清空当前扫码记录

### 3. 库存盘点 (`screens/inventory/`)
- 扫码盘点：扫描物料核对库存
- 差异记录：自动记录盘点差异
- 仓库隔离：盘点数据按仓库隔离

### 4. 订单管理 (`screens/orders/`)
- 订单列表：支持时间筛选、仓库筛选
- 统计面板：今日/近三天/近七天的订单和物料数量
- 物料汇总：查看订单下的物料汇总和详情

### 5. 规则配置 (`screens/rules/`)
- 解析规则：配置扫码解析的字段顺序
- 分隔符设置：支持多种分隔符识别

### 6. 自定义字段 (`screens/custom-fields/`)
- 字段配置：添加/编辑/删除自定义字段
- 字段顺序：调整字段显示顺序

### 7. 仓库管理 (`screens/warehouse-management/`)
- 仓库增删改查
- 默认仓库设置

### 8. 系统设置 (`screens/settings/`)
- 声音开关：扫码成功/重复提示音
- 震动开关：扫码震动反馈
- 版本信息：当前版本、强制更新检查
- 清空数据：清除本地存储

---

## 工具函数说明 (`client/utils/`)

| 文件 | 功能 |
|------|------|
| `database.ts` | SQLite 本地数据库操作，CRUD |
| `time.ts` | 时间格式化（显示/存储格式统一管理） |
| `qrcodeParser.ts` | 二维码解析，支持多种分隔符 |
| `feedback.ts` | 震动 + 语音播报反馈 |
| `toast.tsx` | Toast 提示组件 |
| `update.ts` | App 在线更新检查 |
| `excel.ts` | Excel 导出功能 |
| `logger.ts` | 日志记录（生产环境自动移除） |
| `heartbeat.ts` | 心跳检测，网络状态监控 |

---

## 快速开始

### 环境要求
- Node.js 18+
- pnpm 8+

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
# 启动前端（端口 5000）
cd client && npx expo start

# 启动后端（端口 9091）
cd server && pnpm dev

# 或同时启动
pnpm dev
```

### 构建 APK
```bash
pnpm build
```

---

## 版本信息

当前版本：`V3.3.6`

详细更新日志请查看 [更新日志](./client/screens/changelog/index.tsx)

---

## 许可证

Private - © 2024 上海花栗鼠科技有限公司
