# WisePenView Agent 开发规约

本文件是 WisePenView 面向 agent 的唯一总则。`docs/agent` 下的专题文档只补充目录、分层和局部约定；若专题文档与本文件冲突，以本文件为准。

## 一、基本哲学

代码首先表达业务语义，其次才是语法形态。

- 不用“后端式”“函数式”“过程式”这类标签替代判断。选择写法时只问：它是否让数据来源、稳定边界、业务分支和副作用更清楚。
- 简单直白优于复杂抽象。不要为了统一风格、拆文件或展示技巧而增加读者负担。
- 新代码朝最终形态写；修改旧代码时，只收敛当前任务触达的部分，不做无关大重构。
- 不确定业务接口、字段边界、权限边界时，先确认契约，不用防御性代码把问题藏起来。

## 二、协作底线

- 注释使用中文，commit message 使用中文。
- 修改前查看工作区状态，不要擅自回滚用户已有改动。
- 先用 `rg` 查同域、同类型实现，沿用项目已有模式。
- 不盲扫 `node_modules`；第三方 API 不确定时，优先看官方类型、官方文档或向用户确认。
- 项目已移除 Ant Design，不新增、恢复或沿用 antd 组件、API 和 `.ant-xxx` 样式覆盖。

## 三、分层边界

统一数据线：

```text
api raw DTO -> normalizer -> service usecase -> viewmodel/display -> component/view
```

- API 层只表达后端协议：URL、method、query/body 和 raw DTO。它不做展示加工、fallback、缓存或 UI 提示。
- Normalizer 是后端数据的稳定化边界：字段别名、旧接口兼容、ID、时间、枚举、权限动作和历史数据补齐都放在这里。文件名用 `normalizer/*Normalizer.ts` 或明确的 `normalizeXxx`。
- Mapper 只是薄协议适配器：service request 到 API request、API 包装结构到分页/简单返回结构、字段改名等。需要兜底、推断、聚合、排序时优先抽到 normalizer 或 usecase，不让 mapper 变成第二个 service/viewmodel。
- Service 是业务用例入口：做参数组织、客户端业务校验、调用 API/其它 service、调用 normalizer/mapper、写缓存/session、抛错，并返回稳定业务结果。它不修补 raw response 字段，也不生产某个组件专属的展示结构。
- Entity 是稳定领域事实。组件、service 和 store 应消费 entity，而不是消费后端 raw DTO；不要把单个页面的按钮文案、菜单结构或树节点塞进 entity。
- ViewModel/Display 是稳定业务结果到界面可消费形状的转换层：展示文案、标签、菜单 section、树节点、列表 option、空值占位等放在这里。优先放在组件或 view 同目录；多页面复用时再提升到 domain 的 `display/`、`presenter/` 或明确命名 helper。
- View/component 负责 UI 状态、交互和展示。它可以处理 loading、empty、请求尚未返回、受控/非受控 props 等 UI 默认值，但不猜后端 raw 字段。
- Store 保存已归一化状态；跨页面复用的归一化逻辑回到 normalizer 或领域 helper。
- 不新增泛泛的 domain `model` 层。需要 viewmodel 时显式命名它服务的视图，例如 `skillMenu.viewmodel.ts`、`groupCard.presenter.ts`。
- Mapper 不通过 domain index 对外导出。Normalizer 是否导出看复用范围；跨 domain 复用时必须通过 domain index 暴露明确名字。

## 四、表达方式选择

语法服务语义，不按层级机械规定。

- 一对一转换用 `map`，筛选用 `filter`，存在性判断用 `some/every`，排序用 `sort`。只要规则清楚，这些写法在 service、mapper、component 中都可以使用。
- `reduce` 只在 accumulator 的业务含义清晰且命名良好时使用；否则用局部变量或 `for...of` 更容易审查。
- `for...of` 适合有顺序要求、提前退出、异步串行、多处副作用、跨项状态累积，或链式表达会隐藏步骤的流程。
- 校验、抛错和副作用不天然要求 `for...of`。关键是条件有名字、失败路径靠近触发点、副作用的顺序和原因可读。
- 简单二选一可以用三元表达式；业务分支、多条件分支或嵌套分支用 `if/else`、提前 `return` 或命名变量。
- 抽 helper 的理由是命名了业务概念、隔离了复杂规则或降低重复；不要为了“看起来规整”而抽空壳函数。
- 命名使用业务词，不用宽泛词兜底。比如 Skill + Tool 菜单就叫 `SkillMenu`/`SelectedSkill`/`SelectedTool`，不要用 `Capability` 这类读者需要再解释的词。
- 注释解释“为什么”和业务规则，不解释显而易见的语法。

## 五、Fallback 原则

`??`、`?.` 和默认值不是问题本身，问题是它们出现在哪个边界、掩盖了什么。

- 后端字段兼容、旧数据补齐和大小写兼容，放在 normalizer。
- 展示文案、占位文本和 UI 标签放在 viewmodel/display；不要为了让组件少写判断而把页面文案塞进 mapper。
- Mapper 不写兜底；如果 mapper 里开始出现多层 `??`、类型守卫、枚举推断或排序分组，先抽 normalizer。
- Service 默认消费稳定 entity；如果发现需要修字段，先回到 normalizer 或类型契约。
- Component/view 不对后端 raw 字段写 `raw.foo ?? raw.bar ?? '-'`；需要业务占位时，建立明确 viewmodel，或把字段显式建模为 nullable 后在 display 层处理。
- UI 默认值是允许的，例如空态文案、弹窗默认开关、分页默认页码、请求未返回时的稳定空列表常量。
- 必填字段缺失不要静默转成空字符串、空数组或 `0`；应显式 nullable、抛业务错误，或推动接口契约修正。
- 非显而易见的兼容 fallback 必须有中文注释说明兼容来源。

## 六、React 与 TypeScript

- 只写函数组件和 Hooks；Hooks 只在顶层调用。
- 默认不直接用 `useEffect` 组织业务逻辑。请求用 `useRequest`，事件用 handler，生命周期或订阅优先封装领域 Hook；必须用 effect 时使用 `useEffectForce` 并说明原因。
- 不滥用 `useMemo`、`useCallback`、`React.memo`。只有计算昂贵、引用稳定影响子组件或第三方库要求稳定引用时才使用。
- 不新增 `any`。与第三方库交互无法推断时，把不确定范围缩到最小，并尽快转换成项目内稳定类型。

## 七、交付

完成任务后说明：

- 改了什么。
- 为什么这样改。
- 跑了哪些验证；如果未运行 lint、compile 或 build，说明原因和建议命令。
- 仍然存在的风险或需要用户确认的契约边界。
