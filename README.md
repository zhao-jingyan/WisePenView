# WisePenView

WisePenView 前端项目，基于 React、Vite、TypeScript、HeroUI 与 Ant Design。项目处于 HeroUI 与 AntD 迁移期，新增基础交互控件优先使用 HeroUI，旧 AntD 代码按任务渐进收敛。

开发规约入口见 `AGENT.md`，专题规约位于 `docs/agent/`。

## 快速开始

### 1 安装前置环境

- Node.js：建议使用当前 LTS 版本。
- pnpm：`npm install -g pnpm`

### 2 项目初始化

```bash
pnpm install
```

如需连接真实后端，复制开发环境示例并按需调整：

```bash
cp .env.development.example .env.development
```

Mock 模式使用 `.env.mock`，生产构建使用 `.env.production`。

### 3 启动本地开发

```bash
pnpm dev
```

Mock 模式：

```bash
pnpm mock
```

## 常用命令

- `pnpm dev`：启动开发服务器
- `pnpm mock`：以 mock 模式启动
- `pnpm build`：构建产物
- `pnpm lint`：执行 ESLint
- `pnpm openapi:sync`：同步并生成 OpenAPI 类型
