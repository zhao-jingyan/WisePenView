# Note 内容插件架构

## 1. 核心原则

Note 的内容单位是 block 与 inline content。每种内容类型只有一个 owner plugin，owner 同时拥有该类型的 schema、render、Markdown、projection、AI Diff、comments、print 等能力。

Engine 只编排横切能力，不解释内容语义：

- plugin 决定某种内容是什么、如何渲染、如何投影；
- engine 遍历 plugin tree、保存运行时快照、派发命令；
- 页面容器只组装 editor、协同状态和 UI portal；
- Yjs 生命周期、provider、IndexedDB 不属于本轮重构范围。

因此 AI Diff 不是一种内容类型，也没有独立的 `AiChangePlugin`。正文 schema 中不存在 `ai-diff`、`ai-add`、`ai-delete`、`ai-link-add`、`ai-link-delete`。

## 2. 目录边界

```text
CustomBlockNote/
├── plugins/
│   ├── DefaultContentPlugin/
│   ├── CodeBlockPlugin/
│   ├── TablePlugin/
│   └── LatexPlugin/
├── content/
│   ├── types.ts
│   ├── registry.ts
│   ├── projection.ts
│   └── outline.ts
├── engines/
│   ├── aiDiff/
│   │   ├── action.ts
│   │   ├── projection.ts
│   │   ├── runtime.ts
│   │   ├── store.ts
│   │   └── useAiDiffSidecarRuntime.ts
│   ├── comments/
│   │   ├── core/
│   │   ├── hooks/
│   │   └── ui/
│   ├── collaboration/
│   │   ├── useNoteCaptureKeyEvent.ts
│   │   └── useNoteYjsUndoStack.ts
│   ├── editor/
│   │   ├── dom.ts
│   │   ├── readOnly.ts
│   │   └── stripEscape.ts
│   ├── markdown/
│   └── print/
├── noteEditorComposition.ts
├── index.type.ts
├── index.tsx
└── style.module.less
```

目录规则：

- `plugins/` 只放内容 owner；内容专属 UI、codec 和 comments 实现属于 owner，可留在对应 plugin 内；
- `content/` 放 plugin 契约、registry 和内容 projection 基础设施；
- `engines/` 放 Markdown、print、editor、collaboration、AI Diff、comments 等跨内容类型编排；
- Comment engine 只管理 thread、权限、可见性、range selection、持久化调度和通用 UI；
- `noteEditorComposition.ts` 是唯一组合入口，负责装配 plugin tree、runtime extensions 与最终 schema；
- 根目录只保留组件入口、组件 props/style 与组合根，不放横切实现；

## 3. Plugin Tree 与 Registry

当前树形结构：

```text
note
├── default-content
│   ├── text
│   ├── link
│   ├── paragraph / heading / quote / lists
│   └── audio / divider / file / image / video
├── codeBlock
├── table
└── latex
    ├── math
    └── inlineMath
```

Registry 负责：

1. 展平树并按 dependency 排序；
2. 保证 plugin id 唯一；
3. 保证每种 block/inline type 只有一个 owner；
4. 校验 capability 声明与实现一致；
5. 汇总 schema、extension、editorProps、print styles、slash menu；
6. 提供默认插入 block。

Registry 不实现 AI Diff，不维护 type 白名单，也不知道 `expression`、table cell 或 media props。

## 4. Capability 模型

每个内容 owner 必须显式声明以下切面：

```ts
interface NoteContentCapabilityDeclarations {
  markdownImport: NoteCapabilityDeclaration;
  markdownExport: NoteCapabilityDeclaration;
  aiDiff: NoteCapabilityDeclaration;
  projection: NoteCapabilityDeclaration;
  print: NoteCapabilityDeclaration;
}
```

声明值为 `default | inherited | custom | unsupported`。当声明为 `inherited` 或 `custom` 时必须提供实现；实现存在但声明不匹配时 registry 直接报错。

### 4.1 AI Diff owner

```ts
interface NoteInlineAiDiff {
  equals(current, candidate): boolean;
  renderCandidate(candidate, registry): HTMLElement;
}

interface NoteBlockAiDiff {
  resolve(block, aiContent, registry): NoteAiDiffBlockProjection | null;
  renderCandidate(candidate, registry): HTMLElement;
  apply(block, aiContent, action, registry): NoteAiDiffBlockMutation;
}
```

- rich-text block owner 负责组合 text、link、inlineMath owner；
- math owner 直接比较、投影和渲染 `expression`；
- table owner 直接读取 row/cell，并委托 cell 内 inline owner；
- codeBlock、media 等 owner 各自渲染 native candidate；
- owner 的 `apply` 产出 native update/remove mutation；engine 只执行 mutation，不拼内容字段；
- engine 只调用统一接口，不出现类型分支。

当前接受/拒绝的最小单位是 block。将来加入局部 hunk 时，change id、patch 与候选重算仍应扩展在 owner 接口内，不新增正文 schema 节点。

### 4.2 Comment Facet

Facet 是内容 plugin 对某个横切 engine 提供的能力接口，不是独立模块或 AOP 运行时。Comment 使用判别联合声明三种模式：

```ts
type NoteCommentFacet =
  | { mode: 'range' }
  | { mode: 'dedicated'; anchor: NoteCommentAnchorFacet }
  | { mode: 'unsupported'; reason?: string };
```

- `range` 由 Comment engine 的通用相对选区策略处理；
- `dedicated` 必须由内容 owner 提供 anchor facet；
- `unsupported` 明确拒绝正文批注入口。

专用 anchor facet 负责解析自身 payload、选择内容、恢复位置、生成引用文本、比较锚点，并可选择同步 PM mark。Engine 只按 registry 派发，不出现 `math`、`inlineMath`、`formula` 等内容分支。

MathBlock 与 InlineMath 各自注册 comments facet，并共享 Latex plugin 内部的公式锚点 store。现有 Yjs map 名称继续作为持久协议使用，但它的类型、读写和解析只存在于 Latex plugin；Comment engine 不知道该 map 的名称或 payload。

`CustomBlockNote` 只装配一次 `NoteCommentRuntimeProvider`。内容 plugin 的渲染组件通过通用 comment runtime command 发起专用批注，不允许 host 再挂内容特定 Provider 或 hook。

## 5. AI-content 持久协议

### 5.1 唯一物理载体

AI candidate 只存放在 Y.Doc 顶层：

```ts
doc.getMap('ai-content-store');
```

map key 是 block id，value 是完整 candidate snapshot。不存在第二条 `<AI-content>` XML 路径。

逻辑上每个 block 都有 `aiContent: NoteAiContentPayload | null`；物理上采用 sparse map，无 key 等价于 `null`。这样避免为所有 block 写入 idle 数据，也不引入 block 删除后的额外 GC。

### 5.2 Payload

```ts
interface NoteAiContentPayload {
  revision: string;
  baseHash: string;
  operation: 'create' | 'update' | 'delete';
  candidate: {
    props: Record<string, unknown>;
    content: unknown;
  } | null;
}
```

约束：

- `candidate` 使用对应 owner 的 native props/content，不使用中间协议；
- `create`、`update` 必须有 candidate；`delete` 的 candidate 必须为 `null`；
- candidate 不包含 children，子 block 各自拥有 sidecar；
- block type 变更表示为 delete + create，不允许一个 owner 接管另一种 type；
- revision 必须唯一且不可复用；
- baseHash 基于当前 block 的 `type + props + content` 规范化结果生成；
- map value 是不可变 plain JSON，每次整体 set，不使用嵌套 Y.Map/Y.Array。

后端写入 create 时，必须在同一个 Yjs transaction 中创建带 id 的 native placeholder，并写入 sidecar。

### 5.3 不兼容迁移

新前端不读取以下旧数据：

- 正文中的五种 `ai-*` inline node；
- `AI-Create`、`AI-Delete`、`AI-Edit`；
- math/inlineMath 的 `aiDiffType/Key/Origin/Replace` props；
- block 内 `<AI-content>` XML element。

上线前必须由后端或一次性数据迁移清除已持久化旧节点，并切换为 `ai-content-store` payload。前端不保留 wrapper、alias 或双路径兼容。

## 6. AI Diff Engine

Engine 的 PM plugin state 只保存：

```ts
{
  displayMode;
  payloads;
  actionsEnabled;
  onAction;
  decorations;
}
```

运行过程：

1. hook 观察 `ai-content-store` 与正文 fragment；
2. 读取不可变 payload snapshot；
3. 通过 PM transaction meta 同步 engine state；
4. engine 遍历 `blockContainer`，用 block id 找 sidecar；
5. 调用 block owner `resolve`；
6. 根据显示模式生成 Decoration 与 candidate widget；
7. store 变化主动更新 React presence。

整个投影过程是只读的，不需要 awareness leader，也不监听 provider sync。普通观察永远不会改写正文或清除 candidate。

### 6.1 三种显示模式

| 模式    | native 正文                             | candidate            | 操作按钮 |
| ------- | --------------------------------------- | -------------------- | -------- |
| oldOnly | 显示；create placeholder 隐藏           | 不显示               | 不显示   |
| compare | 旧侧删除态；create placeholder 内容隐藏 | owner preview 新增态 | 显示     |
| newOnly | 变更正文隐藏；delete block 隐藏         | owner preview 普通态 | 不显示   |

Decoration 不进入 PM document，因此不会污染 selection、Yjs、正文 hash 或 schema。

### 6.2 接受与拒绝

所有动作点击时重新读取 block、revision 与 baseHash，不信任 widget 闭包中的旧内容。

| operation | accept                                            | discard                      |
| --------- | ------------------------------------------------- | ---------------------------- |
| update    | native props/content 替换为 candidate，清 sidecar | 正文不变，清 sidecar         |
| create    | placeholder 替换为 candidate，清 sidecar          | 删除 placeholder，清 sidecar |
| delete    | 删除 native block，清 sidecar                     | 正文不变，清 sidecar         |

接受以及 create 的拒绝会改正文，因此 baseHash 不匹配时禁止执行。update/delete 的拒绝只清 sidecar，可以在 stale 状态执行。

正文修改与 sidecar 清理放在同一个 Yjs transaction 中。UndoManager 同时跟踪正文 fragment 与 `ai-content-store`，撤销时不会只恢复一半状态。

remove mutation 会连带清理被删除子树的 sidecar，避免父块删除后留下孤儿 candidate。

### 6.3 并发边界

- revision 检查可阻止本客户端点击陈旧 widget；
- baseHash 可阻止 candidate 覆盖协同期间的新正文；
- Y.Map plain payload 使用 Yjs 的 LWW 语义；
- 前端 revision 检查不是分布式 CAS；
- 若产品要求严格互斥或审批仲裁，需要后端 command/CAS，不应重新引入 awareness leader。

## 7. 派生输出

Markdown、HTML、PDF、clipboard 不能从 widget 读取新内容。

- Markdown/HTML：先从 engine state 读取 sidecar，再由 block owner 生成 old/new native snapshot，最后交给 BlockNote serializer；
- PDF：临时切换 oldOnly，等待双 rAF 后克隆 DOM；
- outline 与正文 hash：读取 native 正文，只反映已接受内容；
- comments：待审阅 block 的范围批注入口由 engine sidecar presence 判断，不扫描 synthetic inline node。

COMPARE 没有可序列化的正文形态；导出时按 old snapshot 处理，除非调用方明确请求 NEW_ONLY。

## 8. 后续切面

在当前 block 级闭环稳定后，按同一结构逐步实现：

1. owner 内部的稳定 hunk id 与局部 accept/discard；
2. rich-text 精确 inline range decoration；
3. clipboard 的显式 old/new 选择；
4. stale candidate 的 regenerate/rebase 命令；
5. backend 严格 review command 或 CAS（仅在产品确实要求时）。

这些增强不得重新引入 synthetic schema、正文内 diff props 或双持久化路径。
