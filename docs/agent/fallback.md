# Fallback 收敛规约

Fallback 是边界设计，不是默认编码习惯。判断一个默认值是否合理，先看它在修补“协议不稳定”还是表达“UI 状态”。

## 一、核心原则

- 后端字段兼容、旧接口兼容、大小写兼容、历史数据补齐，放在 mapper 或明确命名的领域 normalizer。
- Service、component、view 默认消费稳定 entity，不修补后端字段。
- Component/view 可以处理 loading、empty、请求尚未返回、受控/非受控状态和纯 UI props 默认值。
- 接口字段不确定时，先确认契约或调整 mapper，不用默认值掩盖问题。
- 必填字段缺失时，不静默转成空字符串、空数组或 `0`；应显式 nullable、抛业务错误，或推动接口契约修正。
- 非显而易见的兼容 fallback 用中文注释说明来源。

## 二、允许场景

可以使用 `??`、`?.` 或默认值的典型场景：

- Mapper 内处理 raw DTO 字段别名，例如 `tokenLimit ?? TokenLimit`。
- Mapper 内处理历史数据或后端过渡字段，并输出稳定 entity。
- Service 内处理请求参数默认值，例如页码、分页大小、可选开关。
- Component/view 内处理纯 UI 默认值，例如空态文案、弹窗默认状态、图标颜色。
- Component/view 内处理请求尚未返回的 UI 初始态，例如稳定的 `REQUEST_PENDING_ITEMS` 常量。
- 用户输入、浏览器 API、第三方编辑器节点等外部非业务数据的保护，但应尽快收敛为本地稳定类型。

## 三、禁止场景

默认禁止：

- Service 中对 API response 或 entity 字段写 `raw.foo ?? raw.bar ?? ''`。
- Component/view 中对业务实体字段写展示兜底，例如 `user?.profile?.nickname ?? '-'`。
- JSX 中直接写后端字段别名选择、枚举翻译或展示文案兜底。
- 多层 `?.` 加 `??` 跨越 API、service、store、view 多个边界。
- 因为“不确定会不会为空”而新增 fallback；不确定时先问，或回到 mapper 定义清楚 nullable 契约。

## 四、分层边界

- Mapper：把 raw DTO 变成稳定 entity 或 service 返回类型，承载字段兼容、枚举、时间、ID、权限动作和展示文本。
- Service：编排请求、校验业务、抛错和写领域副作用；不修 response 字段，不透传 raw DTO。
- Component/View：渲染稳定类型，处理 UI 默认值和异步请求状态；不猜后端缺什么。
- Store：保存已归一化状态；共享归一化逻辑回到 mapper 或领域 helper。

## 五、检查清单

- [ ] 字段兼容集中在 mapper 或领域 normalizer。
- [ ] Service 没有修补 response/entity 字段。
- [ ] Component/view 没有修补业务实体字段。
- [ ] Store 保存的是已归一化状态。
- [ ] 保留的 fallback 属于明确允许场景。
- [ ] 非显而易见的兼容 fallback 有中文注释说明原因。
