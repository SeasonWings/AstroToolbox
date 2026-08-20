<div align="center">

<img src="public/icon.png" alt="AstroToolbox" width="96" />

# AstroToolbox

基于 Electron + Vue 3 的《诛仙世界》角色存档管理桌面工具

![Electron](https://img.shields.io/badge/Electron-35-47848F)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Vite](https://img.shields.io/badge/Vite-6-646CFF)
![Ant Design Vue](https://img.shields.io/badge/Ant%20Design%20Vue-4-0170FE)
![Version](https://img.shields.io/badge/version-0.1.8--beta-blue)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

## 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [可用脚本](#可用脚本)
- [配置](#配置)
- [测试与代码规范](#测试与代码规范)
- [常见问题](#常见问题)
- [许可证](#许可证)

## 功能特性

- 存档路径配置：自动识别标准端、极速端存档目录，支持手动浏览选择。
- 角色扫描：从存档目录扫描角色，并将 UID 映射为可读角色名。
- 角色搜索：按角色名或 UID 实时模糊筛选。
- 存档备份：将角色的布局、监控、系统配置打包为 `.astropak` 存档文件。
- 存档应用：按「布局设置 / 监控设置 / 系统设置」选择性恢复。
- 存档管理：列表展示、按存档名搜索、重命名、删除。
- UID 关联：将 UID 与角色名映射上传到服务端。
- 在线更新：检查、下载、安装更新，支持通道切换、自动检查、强制更新与跳过版本。
- 无边框窗口：自定义最小化、最大化/还原、关闭控件。

## 快速开始

### 前置要求

- Node.js 20.19 及以上（推荐 22.13 及以上）
- Windows 为当前主要目标平台

### 安装

```bash
npm install
```

项目已配置 Electron 国内镜像，安装依赖时无需额外设置。

### 开发

```bash
npm run dev
```

开发模式会同时启动 Vite 渲染服务和 Electron 桌面窗口。

### 构建与打包

```bash
npm run build
npm run pack
```

## 技术栈

| 类别      | 技术              |
| --------- | ----------------- |
| 桌面框架  | Electron 35       |
| 前端框架  | Vue 3             |
| 开发语言  | TypeScript        |
| 构建工具  | Vite 6            |
| UI 组件库 | Ant Design Vue 4  |
| 路由      | Vue Router 4      |
| 状态管理  | Pinia             |
| 在线更新  | electron-updater  |
| 测试      | Vitest            |
| 代码规范  | ESLint + Prettier |

## 项目结构

```text
.
├─ electron/            # Electron 主进程
│  ├─ main.ts           # 入口，负责组装各模块
│  ├─ config.ts         # 配置、目录、数据迁移、bootstrap
│  ├─ paths.ts          # 存档路径检测与客户端类型推断
│  ├─ roles.ts          # 角色扫描与设置文件名解析
│  ├─ archive.ts        # 存档读写
│  ├─ archive-utils.ts  # 存档相关纯函数
│  ├─ update.ts         # 在线更新流程
│  ├─ update-url.ts     # 更新域名白名单校验
│  ├─ version.ts        # 版本号处理
│  ├─ uid-mapping.ts    # UID 映射远端接口
│  ├─ ipc.ts            # IPC handler 注册
│  ├─ window.ts         # 窗口创建与控制
│  └─ preload.ts        # 渲染进程桥接
├─ shared/              # 主进程与渲染进程共享类型/协议
├─ src/                 # Vue 渲染进程
│  ├─ router/           # Vue Router
│  ├─ stores/           # Pinia stores
│  ├─ views/            # 页面视图
│  ├─ components/       # 业务组件
│  ├─ composables/      # 组合式函数
│  ├─ styles/           # 样式文件
│  ├─ App.vue           # 应用布局壳
│  └─ main.ts           # 渲染进程入口
├─ public/              # 静态资源与图标
├─ doc/                 # 项目文档
└─ package.json
```

## 可用脚本

| 脚本                         | 说明                 |
| ---------------------------- | -------------------- |
| `npm run dev`                | 启动开发模式         |
| `npm run build`              | 构建渲染进程与主进程 |
| `npm run build:renderer`     | 仅构建渲染进程       |
| `npm run build:electron`     | 仅构建主进程         |
| `npm run pack`               | 构建并打包为安装程序 |
| `npm run typecheck`          | 渲染进程类型检查     |
| `npm run typecheck:electron` | 主进程类型检查       |
| `npm run lint`               | ESLint 检查          |
| `npm run lint:fix`           | ESLint 自动修复      |
| `npm run format`             | Prettier 格式化      |
| `npm run format:check`       | Prettier 格式检查    |
| `npm run test`               | 运行单元测试         |
| `npm run test:watch`         | 监听模式运行单元测试 |

## 配置

应用通过项目根目录的 `.env` 提供运行时配置：

| 变量                          | 说明                                 |
| ----------------------------- | ------------------------------------ |
| `UID_MAPPING_API_BASE`        | UID 映射接口与更新策略接口的基础地址 |
| `UPDATE_ALLOWED_UPDATE_HOSTS` | 允许访问的更新源域名                 |

在线更新的策略接口、发布源和验证流程详见 [`doc/在线更新配置说明.md`](doc/在线更新配置说明.md)。

## 测试与代码规范

核心纯函数与关键 store 逻辑使用 Vitest 覆盖，测试文件位于 `electron/*.test.ts` 和 `src/**/*.test.ts`。

提交前建议依次执行：

```bash
npm run lint
npm run typecheck
npm run typecheck:electron
npm run test
```

## 常见问题

### `npm run dev` 没有弹出桌面窗口

确认 `5173` 端口没有被残留的 Vite 进程占用。如果提示 `Port 5173 is already in use`，结束对应的 `node ... vite.js` 进程后重新运行即可。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
