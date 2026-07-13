# Note 内容插件架构

> 状态：Draft，基于 2026-07-13 主分支现状审计。
>
> 本文负责定义 Note 编辑器治理的目标边界和迁移顺序。实现过程中若发现契约不足，应先更新本文和契约测试，再继续迁移，不能在具体内容插件中增加临时旁路。

## 1. 背景与目标

当前 `CustomBlockNote` 同时承担编辑器创建、内容能力、批注编排、AI Diff、Markdown 导入导出、PDF 打印、目录投影、页面通信和业务 service 调用。现有 `NoteEditorPlugin` 已能聚合 schema、extension、editor props、slash menu 和 Markdown 字符串后处理，但插件仍是扁平的技术能力集合，不是内容类型的所有权边界。

本轮治理采用以下主轴：

1. Block type 和 inline content type 是能力所有权单位。
2. 每种内容类型由唯一叶子插件拥有，负责该类型的全部局部语义。
3. 横向 Engine 只遍历、分派和聚合，不理解具体内容类型或 props。
4. 页面容器只负责编排资源、用户、权限、布局和浏览器副作用。
5. Note session 生命周期、Yjs 数据结构、同步协议和 provider 实现不在本轮 scope。

目标不是把现有 props 包进一个大对象，也不是把巨型组件替换成巨型 Context。完成后的结构应让新增一种内容类型时，只需新增一个叶子插件并显式声明其能力，不再修改 AI Diff、Markdown、批注、目录和菜单的全局类型判断。

## 2. 现状证据

### 2.1 入口混合的职责

`src/components/Note/CustomBlockNote/index.tsx` 当前同时处理：

- 图片上传及业务错误提示；
- editor schema、extension、editor props 和 collaboration 参数；
- AI Diff display mode、presence、body hash、normalization 和 accept/discard all；
- Markdown 待导入正文的读取、解析和写入；
- Outline 和 active heading 投影；
- selection store 和 Ask AI 上下文；
- 批注用户、服务端数据源、扩展、公式批注、侧栏和历史弹窗；
- PDF/Markdown imperative export API；
- 工具栏、slash menu、side menu 和 table handles 挂载。

`src/views/workspace/note/index.tsx` 负责页面资源、权限、session、标题、Header、侧栏和 Portal，但将这些状态拆成二十余个 props 传入编辑器。问题的根源不是 props 数量，而是缺少稳定的 Runtime、内容插件和页面端口边界。

### 2.2 现有插件契约不足

`src/components/Note/CustomBlockNote/plugins/types.ts` 的插件契约只有：

- `blockSpecs`
- `inlineContentSpecs`
- `extensions`
- `editorProps`
- `slashMenu`
- `blocksToMarkdownLossy`

它缺少内容类型 owner、树形组织、依赖、冲突检测、结构化 codec、AI Diff adapter、comments adapter、projection、命令和 UI slot。`registry.ts` 使用 `Object.assign` 合并 spec，重复类型会被后者静默覆盖。

### 2.3 内容语义泄漏

当前横向模块存在多处具体内容知识：

- AI Diff patch 维护完整 block type 白名单，并直接识别 `inlineMath` 和其 props；
- AI Diff Markdown exporter 对 `math`、`inlineMath` 和所有 AI inline 类型逐一分支；
- AI Diff presence、export visibility、normalization、comments policy 各自重复识别 AI 类型；
- Outline 直接识别 `heading`，plain text 只认识 `text` 和嵌套 `content`；
- content signature 直接维护一组稳定 block/inline props；
- comments extension 直接排除 `math`；
- formatting toolbar 通过 comments 模块判断 math 选区；
- PDF print CSS 直接识别 AI Diff、批注、math、code 和 table DOM。

这些判断应由对应内容插件的 capability 提供，Engine 不能继续扩张类型分支。

## 3. 边界与术语

### 3.1 页面容器

本文用“页面容器”指当前 `NoteViewConnected` 所承担的应用层编排，不新增名为 Host 的框架概念。

页面容器负责：

- `resourceId`、当前用户、权限和连接状态；
- Header、侧栏、Portal 容器、Loading 和页面布局；
- toast、路由、文件下载和系统打印等浏览器副作用；
- 创建笔记、挂载资源和 Markdown 导入 workflow；
- 将页面能力以窄端口注入 Editor Runtime。

页面容器不拥有 block/inline 的内容语义。

### 3.2 Editor Runtime

Editor Runtime 负责：

- 组装 plugin tree 和编译 registry；
- 创建 BlockNote schema 和 editor；
- 提供命令、事件和 projection 查询；
- 调用 Markdown、AI Diff、comments、export 等 Engine；
- 挂载 editor surface。

Runtime 不直接 import 页面 store、路由、toast 或具体 domain service。Yjs/session 通过现有 binding 接入，本轮不改其生命周期。

Runtime extension 与内容插件是两种不同的注册对象。Esc 字符清洗、只读事务过滤、协同 undo 等不拥有某个内容 type，应注册为 Runtime extension；不能为了统一形式把它们伪装成内容插件。AI Diff 的 block 折叠和删除键拦截如果依赖 AI syntax owner，则由 AI Diff Engine 提供 Runtime extension，并通过 registry 查询 syntax capability。

### 3.3 内容插件

内容插件分为 bundle 和叶子：

```text
note
├── defaults
│   ├── textInline
│   ├── linkInline
│   ├── paragraph
│   ├── heading
│   ├── quote
│   ├── listItems
│   ├── table
│   └── media
├── code
│   └── codeBlock
├── latex
│   ├── mathBlock
│   └── inlineMath
└── aiDiffSyntax
    ├── aiDiffInline
    ├── aiAddInline
    ├── aiDeleteInline
    ├── aiLinkAddInline
    └── aiLinkDeleteInline
```

Bundle 只组织 children 和声明依赖，不注册内容 type。叶子插件必须拥有一个 block type 或 inline content type。多个相关 type 可以通过 bundle 共享纯 helper，但不能形成多个 owner。

### 3.4 Engine

Engine 是无内容语义的调度器：

- 遍历 block tree 或 inline tree；
- 按 type 从 registry 查找 owner；
- 调用 capability；
- 聚合结果或执行文档级事务；
- 对缺失、重复或显式 unsupported 的能力给出确定结果。

以下代码不允许出现在通用 Engine：

```ts
if (block.type === 'math') {
  // ...
}
```

具体类型判断只能存在于该类型 owner、BlockNote 第三方适配器或测试 fixture 中。

## 4. Plugin Tree 与 Registry

### 4.1 节点契约草案

```ts
type NotePluginNode = NotePluginBundle | NoteBlockPlugin | NoteInlinePlugin;

interface NotePluginBundle {
  kind: 'bundle';
  id: string;
  dependencies?: readonly string[];
  children: readonly NotePluginNode[];
}

interface NoteBlockPlugin {
  kind: 'block';
  id: string;
  type: string;
  dependencies?: readonly string[];
  block: NoteBlockCapabilities;
}

interface NoteInlinePlugin {
  kind: 'inline';
  id: string;
  type: string;
  dependencies?: readonly string[];
  inline: NoteInlineCapabilities;
}
```

`id` 用于插件依赖和诊断；`type` 用于文档节点分派，两者不能混用。

### 4.2 Registry 规则

Registry 编译必须满足：

1. bundle id、leaf id 全局唯一；
2. `(kind, type)` 全局唯一，重复 owner 立即抛错；
3. 缺失 dependency、依赖环立即抛错；
4. 执行顺序由 dependency 拓扑排序和稳定声明顺序决定；
5. capability 冲突不能用“后者覆盖前者”解决；
6. 默认 BlockNote 类型也必须显式注册 owner；
7. registry 编译后只读，运行期不能随页面状态增删 schema 类型；
8. schema owner 与文档语义 owner 必须是同一叶子插件。

### 4.3 默认类型适配器

BlockNote 当前默认 schema 包含 14 种 block：

`audio`、`bulletListItem`、`checkListItem`、`codeBlock`、`divider`、`file`、`heading`、`image`、`numberedListItem`、`paragraph`、`quote`、`table`、`toggleListItem`、`video`，以及 `text`、`link` 两种 inline content。

新 registry 不能再依靠 `BlockNoteSchema.create()` 隐式注入它们。默认 owner 可以直接引用 BlockNote 导出的 `defaultBlockSpecs`、`defaultInlineContentSpecs` 和 `defaultStyleSpecs`，但必须在 plugin tree 中显式出现。CodeBlock 使用现有自定义 spec 覆盖默认 spec 时，只保留 CodeBlock owner，不保留默认 codeBlock owner。

## 5. Capability 模型

### 5.1 显式支持声明

每项能力不能依赖 `undefined` 表示任意含义。叶子插件应显式选择：

```ts
type Capability<T> =
  | { support: 'custom'; value: T }
  | { support: 'default'; adapter: T }
  | { support: 'inherited'; from: string }
  | { support: 'unsupported'; reason: string };
```

`inherited` 只能引用 registry 中已注册的 capability profile，例如多个文本块继承 `richTextBlock`，不能通过任意函数链隐式兜底。Registry 在编译时解析继承并检测环。

### 5.2 Schema 与 Render

每个叶子 owner 必须提供 schema/spec。Render 由 BlockNote spec 实现，但插件同时对外声明：

- editor render；
- external/export render；
- print contribution，例如稳定属性、class 或 CSS；
- content model：`inline`、`table` 或 `none`。

PDF Engine 不直接识别内容类型，只组合插件贡献的 export DOM 和 print style。系统 `print()` 仍由页面容器触发。

### 5.3 Markdown Codec

Markdown 能力处理结构化输入输出，禁止继续对整篇 Markdown 字符串做插件链式替换。

```ts
interface NoteMarkdownCodec<TNode> {
  decode(context: MarkdownDecodeContext): TNode | NoMatch;
  encode(node: TNode, context: MarkdownEncodeContext): MarkdownNode;
}
```

迁移初期允许 `default` adapter 委托 BlockNote 的 lossy parser/exporter，但自定义内容必须由 owner 提供明确 codec。下载、剪贴板和空文档判断不得各自调用不同的序列化路径。

页面容器负责读取文件、创建资源和下载 artifact；Markdown Engine 只解析或生成内容。

### 5.4 AI Diff Adapter

AI Diff Engine 负责遍历、按 key 调度、文档级 accept/discard 和 display projection。内容 owner 负责本类型的 diff 语义：

```ts
interface NoteAiDiffAdapter<TNode> {
  detect(node: TNode): boolean;
  build(origin: TNode, replacement: TNode, context: AiDiffBuildContext): AiDiffBuildResult<TNode>;
  project(node: TNode, mode: AiDiffDisplayMode): AiDiffProjection<TNode>;
  apply(node: TNode, action: 'accept' | 'discard'): AiDiffApplyResult<TNode>;
}
```

文本块可继承 `richTextBlock` profile；`text`、`link`、`inlineMath` 和 AI syntax inline 由各自 owner 提供 inline adapter。`math` 由 MathBlock owner 提供 atomic adapter。`codeBlock` 维持当前 unsupported 行为，直到产品明确其 diff 语义。

Engine 不维护 block type 白名单，不读取 `expression`、`aiDiffType` 等具体 props。

### 5.5 Comments Adapter

Comments Engine 负责通用 thread、selection、visibility 和 UI 调度；内容 owner 声明：

```ts
interface NoteCommentsAdapter<TNode> {
  canAnchor(context: CommentSelectionContext<TNode>): boolean;
  captureAnchor(context: CommentSelectionContext<TNode>): CommentAnchor | null;
  resolveAnchor(anchor: CommentAnchor, context: CommentResolveContext): CommentPosition | null;
  referenceText(node: TNode): string;
}
```

普通富文本继承 text selection adapter；MathBlock 和 InlineMath 提供 custom adapter。Comments Engine 不再直接排除 `math`，Toolbar 不再从 comments 模块导入 math 选区判断。Yjs thread/anchor 数据结构和同步逻辑本轮保持不变，只通过 adapter 接口重新归属内容语义。

### 5.6 Menu Contribution

内容插件可以贡献 declarative menu item/command：

- slash insert item；
- block type transform item；
- formatting toolbar item；
- side menu item；
- content-local toolbar。

Menu Engine 根据当前 selection 和 owner capability 聚合可用项。具体插件不能直接操作页面侧栏 store；需要打开批注侧栏等页面行为时，只执行 Runtime command，由页面端口响应。

### 5.7 Projection

Projection 是从文档状态可确定的派生数据，不通过多条 callback 维护第二份真相。

基础 projection 包括：

- `plainText`
- `isEmpty`
- `outline`
- `contentSignature`
- `selectionSnapshot`
- `aiDiffPresence`

每个 owner 贡献局部 projection，Projection Engine 一次遍历聚合。Heading owner 贡献 outline item；inline owner 贡献 plain text；各 owner 声明进入 content signature 的稳定字段。Engine 不维护具体 props 白名单。

## 6. Runtime API、状态与事件

### 6.1 创建期依赖

创建期只接收确实决定 editor 构造的依赖：

```ts
interface NoteEditorBootstrap {
  resourceId: string;
  plugins: readonly NotePluginNode[];
  collaboration: NoteCollaborationBinding;
  imageUploader: NoteImageUploader;
  comments?: NoteCommentsBinding;
}
```

本轮保留现有 collaboration/Yjs 对象和创建时机，不重写生命周期。

### 6.2 可变外部状态

可变状态通过窄的 state port 订阅，不通过重挂载，也不铺成大量 props：

```ts
interface NoteEditorExternalState {
  readOnly: boolean;
  blockLocalDocWrites: boolean;
  aiDiffDisplayMode: AiDiffDisplayMode;
  comments: NoteCommentsPolicy;
}

interface NoteEditorStatePort {
  getSnapshot(): NoteEditorExternalState;
  subscribe(listener: () => void): () => void;
}
```

`comments` 必须是有定义的权限状态，而不是把 `enabled`、`uiEnabled`、`authorizable`、`writable` 当作可任意组合的四个 boolean。

批注存在一个切换前必须确认的权限问题：当前 `commentDocumentRole` 没有页面调用方，入口默认值为 `editor`，而底层 `ThreadStoreAuth` 会据此决定是否允许删除整串批注。新策略不能沿用隐式默认值，也不能自行按协同编辑权推导；应由后端权限模型或明确的产品规则提供 `comment | editor` role。该问题不阻塞 registry、CodeBlock 和 Latex 样板，但阻塞 comments capability 的最终切换。

### 6.3 命令

外部主动操作使用 Runtime 命令：

```ts
interface NoteEditorRuntime {
  focus(): void;
  navigate(target: NoteNavigationTarget): void;
  execute(command: NoteEditorCommand): Promise<void>;
  export(request: NoteExportRequest): Promise<NoteArtifact>;
  getProjection<T>(projection: NoteProjection<T>): T;
  subscribeProjection<T>(projection: NoteProjection<T>, listener: (value: T) => void): () => void;
}
```

`downloadMarkdown` 不属于 Runtime；Runtime 只返回 artifact。页面容器负责文件名、Blob、下载和 toast。PDF Runtime 返回可打印 artifact 或执行 editor 内部 export render，页面容器负责系统打印副作用。

### 6.4 事件

只有无法表达为 projection 的瞬时事实使用事件，例如请求页面打开批注侧栏。Outline、hash、selection 和 AI Diff presence 使用 projection subscription，避免事件丢失和重复状态。

## 7. 当前内容能力矩阵

状态说明：

- `custom`：项目已有自定义实现；
- `default`：委托 BlockNote 默认能力；
- `inherited`：应在目标架构继承共享 profile；
- `unsupported`：当前实现明确不支持或 UI 禁用；
- `partial`：存在实现但路径不一致或行为有缺口；
- `n/a`：该能力没有语义。

### 7.1 Block types

| Type             | Schema/Render             | MD Import                  | MD Export          | AI Diff                                 | Comments                           | Menu                             | Projection                          |
| ---------------- | ------------------------- | -------------------------- | ------------------ | --------------------------------------- | ---------------------------------- | -------------------------------- | ----------------------------------- |
| paragraph        | default                   | default                    | default            | inherited rich text                     | inherited text selection           | custom transform/slash           | plain text、empty                   |
| heading          | default                   | default                    | default            | inherited rich text                     | inherited text selection           | custom levels/toggle             | plain text、outline、active heading |
| quote            | default                   | default                    | default            | inherited rich text                     | inherited text selection           | custom transform/slash           | plain text                          |
| bulletListItem   | default                   | default                    | default            | inherited rich text                     | inherited text selection           | custom transform/slash           | plain text                          |
| numberedListItem | default                   | default                    | default            | inherited rich text                     | inherited text selection           | custom transform/slash           | plain text                          |
| checkListItem    | default                   | default                    | default            | inherited rich text                     | inherited text selection           | custom transform/slash           | plain text                          |
| toggleListItem   | default                   | default                    | default            | inherited rich text，含折叠占位逻辑     | inherited text selection           | custom transform/slash           | plain text                          |
| codeBlock        | custom                    | default                    | default            | unsupported，当前映射明确排除           | partial，依赖默认 text selection   | custom toolbar/transform/slash   | plain text 待验证                   |
| table            | default + custom handles  | default lossy              | default lossy      | unsupported，当前映射误收录且丢 content | partial，当前 selection 行为未建模 | custom toolbar/side menu/handles | plain text/empty 待定义             |
| divider          | default                   | default                    | default            | n/a                                     | unsupported                        | default slash                    | empty                               |
| image            | default + injected upload | default                    | default            | unsupported                             | unsupported                        | default slash/toolbar            | signature 字段待定义                |
| file             | default                   | default                    | default            | unsupported                             | unsupported                        | slash 当前隐藏                   | signature 字段待定义                |
| audio            | default                   | default                    | default            | unsupported                             | unsupported                        | slash 当前隐藏                   | signature 字段待定义                |
| video            | default                   | default                    | default            | unsupported                             | unsupported                        | slash 当前隐藏                   | signature 字段待定义                |
| math             | custom                    | custom `$$...$$` normalize | custom `$$` export | custom atomic                           | custom formula anchor              | custom slash/local toolbar       | expression、signature               |

### 7.2 Inline content types

| Type           | Schema/Render | MD Import                | MD Export              | AI Diff                   | Comments                 | Projection              |
| -------------- | ------------- | ------------------------ | ---------------------- | ------------------------- | ------------------------ | ----------------------- |
| text           | default       | default                  | default                | inherited text diff       | inherited text selection | text、styles signature  |
| link           | default       | default                  | default                | custom create/delete/edit | inherited text selection | text、href、signature   |
| inlineMath     | custom        | custom `$...$` normalize | custom `$...$` export  | custom atomic             | custom formula anchor    | expression、signature   |
| ai-diff        | custom        | n/a                      | project 后转 text      | custom syntax             | unsupported              | display text、signature |
| ai-add         | custom        | n/a                      | project 后转 text      | custom syntax             | unsupported              | display text、signature |
| ai-delete      | custom        | n/a                      | project 后转 text      | custom syntax             | unsupported              | display text、signature |
| ai-link-add    | custom        | n/a                      | project 后转 link/text | custom syntax             | unsupported              | text、href、signature   |
| ai-link-delete | custom        | n/a                      | project 后转 link/text | custom syntax             | unsupported              | text、href、signature   |

### 7.3 当前保持的产品决策

样板阶段先保持现有行为，不借架构重构扩张产品能力：

1. CodeBlock、table、media 不新增 AI Diff 能力；table 当前进入映射后会丢 content，应按既有产品说明修正为显式 unsupported，不能保留破坏性半支持；
2. AI Diff 内容不可创建批注；
3. math/inlineMath 继续支持自定义公式批注；
4. Markdown 和 PDF 默认导出 AI Diff 的旧文本视图；
5. Slash menu 继续隐藏 file、audio、video；
6. 默认 BlockNote Markdown codec 的 lossy 行为暂不改变，但需要 characterization test 固定当前结果。
7. 公式导入先委托 BlockNote 默认 parser，再由 math/inlineMath owner 恢复自定义节点；行内代码、链接文本和转义美元符保持原义。

当前 BlockNote lossy exporter 会把 MathBlock 的外部 HTML 压平为 `$$ expression $$`，多行 expression 会丢失换行。导入器同时识别独立 `$$` 围栏和该实际输出；多行导出的保真问题留在 Markdown export 切面解决，导入切面不增加第二套 exporter。

## 8. 测试策略

仓库当前没有测试脚本和测试依赖。Foundation 阶段先引入最小 Vitest 基础设施，测试文件与被测模块同域放置，不启动 dev/mock 服务。

### 8.1 Registry contract tests

- bundle 展开和稳定顺序；
- 重复 id；
- 重复 `(kind, type)`；
- 缺失依赖和依赖环；
- capability profile 继承和继承环；
- explicit unsupported；
- 默认类型 owner 完整性。

### 8.2 Characterization tests

- 默认 block Markdown import/export fixture；
- CodeBlock fenced Markdown、language、collapse UI 与 clipboard export；
- MathBlock/InlineMath Markdown round trip；
- AI Diff text/link/math/inlineMath 的 build、project、accept、discard；
- AI Diff 嵌套 children、空块删除和 toggleListItem；
- comments 对普通文本、AI Diff、math/inlineMath 的 anchor policy；
- outline、active heading、plain text、empty state、content signature；
- print contribution 聚合，不直接在单元测试调用系统打印。

当前 content signature 包含 block ID，却忽略大多数 props、inline styles 和 table object content。它是 AI Chat 一致性协议，不应直接当成通用正文 projection。Foundation 保持现有算法；只有在服务端协议同步调整时才允许改变。

`AI-Create`、`AI-Delete`、`AI-Edit` 是后端 `AI-content` 转换过程的中间协议类型，不是当前 schema 注册的 inline type。export/visibility 中仍存在兼容判断；先用 characterization test 证明规范化后的 `editor.document` 不会包含这些类型，再随目标迁移删除兼容分支。

### 8.3 测试边界

纯转换和 registry 使用 Node 环境。依赖 DOM 的 render、selection、clipboard 和 print 使用 jsdom 或最小 adapter fixture。Yjs/thread store 的既有协议只做边界回归，不重写 session 生命周期。

## 9. 迁移 DAG

```text
A. Characterization fixtures + test runner
                 |
B. Plugin node / capability contracts
                 |
C. Registry compiler + default owners
                 |
D. Runtime ports + Engine interfaces
          _______|_______
         |               |
E1. CodeBlock sample  E2. MathBlock + InlineMath sample
         |_______________|
                 |
F. Review and freeze contract v1
                 |
G1. Default rich text owners
G2. Table owner
G3. Media owners
G4. AI syntax inline owners
G5. Comments adapters
                 |
H. Projection/Menu/Export Engine integration
                 |
I. CustomBlockNote + Note page cutover
                 |
J. Delete old paths + full validation
```

A-D 必须串行，由主任务完成。E1/E2 在共享契约稳定后可以使用独立 worktree，但主任务负责集成和契约调整。F 之后才能广泛并行 G 系列任务。

## 10. 高冲突文件

以下文件在 contract v1 冻结前只由主任务修改：

- `src/components/Note/CustomBlockNote/index.tsx`
- `src/components/Note/CustomBlockNote/index.type.ts`
- `src/components/Note/CustomBlockNote/blockNoteSchema.ts`
- `src/components/Note/CustomBlockNote/plugins/types.ts`
- `src/components/Note/CustomBlockNote/plugins/registry.ts`
- `src/components/Note/CustomBlockNote/plugins/index.ts`
- `src/views/workspace/note/index.tsx`
- 测试脚本和公共测试配置

独立 worktree 必须从已提交的 foundation 分支开始，并限制在自己的内容插件目录和测试 fixture。公共契约变更回到主任务处理。

## 11. 删除与合并清单

以下项目是迁移目标，不在 foundation 阶段提前删除：

| 候选                                              | 证据                                                | 目标                                                                |
| ------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| `getNoteEditorPlugins()`                          | 只返回静态数组                                      | registry 编译后直接导出只读实例                                     |
| `NoteEditorPlugin.blocksToMarkdownLossy`          | 当前唯一 LaTeX 实现为空函数，仍以字符串链式后处理   | 删除，改结构化 codec                                                |
| `NoteBodyEditorHandle.getAiDiffBodyContentHash`   | 页面没有调用，只通过 callback 接收 hash             | 删除，改 projection subscription                                    |
| `useNoteEditorSelectionStore`                     | 只在编辑器入口内部读写                              | 收敛到 Runtime selection projection/ref                             |
| `usePendingNoteImportStore` 的 editor 直读        | 导入 workflow 与 editor 生命周期桥接                | 页面 workflow 通过 Runtime command 提交 artifact；不改 Yjs 生命周期 |
| `CustomBlockNote` 内浏览器下载                    | editor 创建 Blob 和 `<a>`                           | 页面容器处理下载，Runtime 返回 artifact                             |
| AI Diff type sets/visitors                        | presence、comments、export、normalization 多份重复  | owner adapter + 单一 Engine traversal                               |
| MathBlock/InlineMath AI Diff UI 与 props 操作     | 两个组件重复 display state、clear props、按钮       | 共享 capability UI primitives，各 owner 保留自身 node update        |
| Comments 对 math/AI Diff 的硬编码                 | comments core 直接识别节点名和 props                | comments adapter/policy registry                                    |
| Outline/plain text/hash 的具体类型和 props 白名单 | 横向模块直接识别 heading、text、稳定 props          | Projection capability                                               |
| PDF 对具体内容 class 的硬编码                     | print CSS 直接识别 AI Diff/math/code/table/comments | print contribution 聚合                                             |
| 页面到 editor 的批注 boolean 集合                 | 四个 boolean 组合表达能力状态                       | `NoteCommentsPolicy` 判别联合                                       |
| 页面与 editor 的多条 projection callbacks         | outline、active heading、presence、hash 分别维护    | projection subscription                                             |
| `useActiveCommentUser`                            | 页面已有 current user，editor wrapper 再维护 actor  | 页面注入统一 actor port                                             |
| `useNewNoteStore.isTitleEmpty/isNoteEmpty`        | 字段只被写入、没有读取者                            | 收敛为明确的 `markNewNoteDirty` workflow                            |
| comments/AI actions 的 inline + portal 双路径     | 页面提供 surface host，null 时仍临时 inline 渲染    | 使用必需 surface slot，不保留 noop/fallback                         |

兼容层、旧 alias 和双路径只允许在同一个迁移提交内短暂存在，提交完成时必须只保留目标 API。

## 12. 迁移前决策

以下问题不能由 fallback 或兼容层代替业务决定：

1. `commentDocumentRole` 应由哪个后端权限或产品规则提供；该问题阻塞 comments 最终切换。
2. `math` / `inlineMath` 要求 Markdown round-trip：`$...$` 映射 inlineMath，独立 `$$` 围栏和当前 exporter 的 `$$ expression $$` 映射 math；多行 MathBlock 的 lossy export 仍需在导出切面修复。
3. audio/file/video 是否继续作为只读旧文档兼容类型保留在 schema；当前 slash 隐藏，编辑器上传口只接受 image。
4. code/table 普通批注是否属于正式支持范围；当前 UI 没有明确排除，但没有类型契约。
5. 服务端是否仍可能把 `AI-Create`、`AI-Delete`、`AI-Edit` 直接放入持久化 editor document；若不会，应删除 export/visibility 的遗留兼容分支。

在这些问题有答案前，Foundation 保持现有文档 schema 和协议，不扩大能力。能由现有产品说明证明的行为，例如 CodeBlock、table、media 不承担 AI Diff，直接按 unsupported 建模。

## 13. 分阶段完成标准

### Foundation

- registry 和 capability contract 有测试；
- 默认类型全部拥有显式 owner；
- 重复 type 和缺失能力不能静默通过；
- 尚未迁移的现有编辑器行为不变。

### 样板

- CodeBlock 和 MathBlock/InlineMath 的内容语义全部从 owner 暴露；
- 通用 Engine 不出现这些类型的硬编码；
- Markdown、AI Diff、comments 和 projection fixture 通过；
- 样板迁移后删除对应旧路径，不保留 wrapper。

### 最终

- `CustomBlockNote` 只组装 Runtime、binding 和 surface；
- 页面容器不理解具体 block/inline props；
- Engine 不硬编码内容类型；
- 能力矩阵无 `partial`；
- 旧 props、store、helper 和重复 visitor 全仓无引用；
- `pnpm lint`、`pnpm typecheck`、`pnpm build` 和专项测试通过；
- Note session 生命周期和 Yjs 协议未发生越界修改。
