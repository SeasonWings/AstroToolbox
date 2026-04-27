# AstroToolbox

AstroToolbox 是一个基于 **Electron + Vue 3 + TypeScript + Ant Design Vue** 的桌面工具，用于角色存档管理与在线更新。

## 功能概览

- 存档路径配置（支持自动识别标准端/极速端路径）
- 角色扫描与展示
- 存档应用（可按设置项选择性恢复）
- 存档管理（重命名、删除）
- UID 与角色名映射上传
- 在线更新（检查、下载、安装、通道切换）

## 项目结构

```text
.
├─ electron/              # Electron 主进程与 preload
│  ├─ main.ts
│  └─ preload.ts
├─ src/                   # Vue 渲染进程
│  ├─ App.vue
│  ├─ main.ts
│  └─ styles.css
├─ shared/                # 主进程与渲染进程共享类型/协议
│  └─ contracts.ts
├─ public/                # 静态资源（图标等）
├─ doc/                   # 项目文档
└─ package.json
```

