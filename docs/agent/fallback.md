# Fallback 收敛规约

WisePenView 的目标是保持前端契约精简、同步、可追踪。`fallback` 不是默认编码习惯，只能用于明确的兼容边界或 UI 默认值。

## 一、核心原则

- 字段兼容、旧接口兼容、大小写兼容、历史数据补齐，统一放在 `src/domains/<Domain>/mapper` 或明确命名的领域 normalizer 中。
- Service、component、view 默认消费稳定 entity，不用 `??`、`?.` 链条修补后端字段。
- fallback 表达式如果让对象字面量难读，应抽成命名 mapper/normalizer，并在函数名或中文注释中说明兼容来源。
- 接口字段不确定时，先确认契约或调整 mapper，不用默认值掩盖问题。
- 必填字段缺失时，不要静默转成空字符串、空数组或 `0`；应在 mapper 中转成显式 nullable 类型，或由 service 抛出业务错误。
- 每个非显而易见的兼容 fallback 都要有中文注释说明兼容来源，例如旧字段、后端过渡字段或历史数据。

## 二、允许的 fallback

以下场景可以使用 `??`，但应保持局部、语义明确：

- Mapper 内处理 raw DTO 字段别名，例如 `tokenLimit ?? TokenLimit`。
- Mapper 内处理历史数据或过渡接口，并输出稳定 entity。
- 组件处理纯 UI props 默认值，例如 `emptyText ?? t('empty.noData')`。
- 控制型/非控制型组件的本地默认值，例如 `isOpen ?? innerOpen`。
- 用户输入、浏览器 API、第三方编辑器节点等外部非业务数据的保护，但应尽快收敛为本地稳定类型。
- 分页、弹窗延迟、图标颜色等纯展示配置默认值。

## 三、禁止的 fallback

以下写法默认禁止，除非已有清晰注释说明无法迁移到 mapper：

- Service 中对 API response 或 entity 字段写 `raw.foo ?? raw.bar ?? ''`。
- Component/view 中对业务实体字段写展示兜底，例如 `user?.userInfo?.nickname ?? '-'`。
- 用 `String(value ?? '')`、`Number(value ?? 0)`、`items ?? []` 掩盖必填字段缺失。
- 多层 `?.` 加 `??` 链条跨越 API、service、store、view 多个边界。
- 在 JSX 中直接写后端兼容逻辑或字段别名选择。
- 因为“不确定会不会为空”而新增 fallback；不确定时先问，或回到 mapper 定义清楚 nullable 契约。

## 四、分层边界

Mapper：

- 接收 raw DTO，输出稳定 entity/view model。
- 承载字段别名、枚举、时间、ID、权限动作、历史数据兼容。
- 对缺失字段做显式决策：可为空就输出 `null`/`undefined`，不可为空就抛错或让 service 校验。

Service：

- 只做业务编排、请求参数组织、客户端业务校验和错误抛出。
- 不修补 response 字段，不把 raw DTO 继续传给组件。
- 请求参数默认值可以存在，但应优先通过 mapper 或具名 helper 表达业务含义。

Component/View：

- 只消费 mapper/service 输出后的稳定类型。
- 允许纯 UI 默认值和占位文案，不允许修补接口字段。
- 展示空态应依赖明确的 entity 字段或 UI props，而不是在 JSX 中猜测后端缺什么。

Store：

- Store 保存已归一化后的状态。
- 不在 store 中补 raw DTO 字段；跨页面共享的归一化逻辑应回到 mapper 或领域 helper。

## 五、检查清单

- [ ] 字段兼容集中在 mapper 或领域 normalizer。
- [ ] Service 没有修补 response/entity 字段。
- [ ] Component/view 没有修补业务实体字段。
- [ ] Store 保存的是已归一化状态。
- [ ] 保留的 fallback 属于明确允许场景。
- [ ] 非显而易见的兼容 fallback 有中文注释说明原因。
