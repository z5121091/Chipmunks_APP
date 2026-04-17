# 掌上仓库 APP

基于 Expo 54 + React Native + Express.js 的仓储管理系统。

## 技术栈

- **前端**：Expo 54 + React Native + TypeScript
- **后端**：Express.js + Node.js
- **包管理**：pnpm

## 目录结构

```
chipmunks-app/
├── server/                     # 后端代码 (Express.js)
│   ├── src/
│   │   └── index.ts            # 入口文件
│   └── package.json
│
├── client/                     # 前端代码 (React Native)
│   ├── app/                    # 路由配置 (Expo Router)
│   │   ├── _layout.tsx         # 根布局
│   │   └── ...
│   ├── screens/                # 页面实现
│   ├── components/             # 通用组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── contexts/               # React Context
│   ├── constants/              # 常量配置
│   ├── utils/                  # 工具函数
│   └── package.json
│
├── package.json               # workspace 配置
├── .cozeproj/                # 脚手架脚本（勿改）
└── .coze                     # 配置文件（勿改）
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
coze dev
```

同时启动前端 (端口 5000) 和后端 (端口 9091)。

### 构建 APK

```bash
coze build
```

## 依赖安装规范

| 目录 | 安装命令 | 说明 |
|------|----------|------|
| `client/` | `npx expo install <package>` | 自动选择兼容版本 |
| `server/` | `pnpm add <package>` | 后端依赖 |

```bash
# 前端
cd client && npx expo install expo-camera

# 后端
cd server && pnpm add axios
```

## 开发规范

### 路径别名

使用 `@/` 代替相对路径：

```tsx
// 推荐
import { Screen } from '@/components/Screen';

// 避免
import { Screen } from '../../../components/Screen';
```

### 开发准则

1. **思考后再编码**：不确定时先提问，不要假设
2. **简洁优先**：用最少的代码解决问题，不做多余功能
3. **精准修改**：只改需要改的地方
4. **目标驱动**：明确成功标准，验证后再交付

## 功能模块

| 模块 | 说明 |
|------|------|
| 扫码入库 | 扫描物料二维码，自动解析字段 |
| 扫码出库 | 扫描出库，支持订单管理 |
| 订单管理 | 订单列表，拆包功能 |
| 盘点管理 | 整包/拆包盘点 |
| 物料管理 | 型号、供应商绑定 |
| 系统设置 | 仓库、规则、备份等 |

