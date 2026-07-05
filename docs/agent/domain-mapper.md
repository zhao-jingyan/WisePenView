# Domain Mapper 规范

Mapper 层负责把后端协议数据转换为前端真正消费的稳定类型。凡是字段兼容、旧接口 fallback、ID/时间/枚举归一化和展示文案补齐，都应集中在 mapper 或明确命名的领域 normalizer。

## 一、职责

Mapper 应处理：

- API DTO 到 entity 或 service 返回类型的转换。
- service request 到 API request 的转换。
- 后端字段别名、大小写不一致、旧字段名兼容。
- ID、时间、枚举、权限动作、状态值等归一化。
- 组件需要直接展示的稳定字段，例如 `displayName`、`statusText`、`createTimeText`。

Mapper 不应处理：

- 发请求。
- UI 提示。
- React 状态。
- store 写入。
- 跨 service 编排。

## 二、表达方式

Mapper 的重点是让“不稳定输入如何变稳定输出”清楚可审查。

- 一对一字段转换和数组元素转换优先使用命名 mapper 函数配合 `map`，例如 `data.list.map(mapXxxFromApi)`。
- 筛选、存在性判断和排序分别使用 `filter`、`some/every`、`sort`；当规则有业务含义时，用命名函数或中文注释说明。
- `reduce` 只在 accumulator 业务含义清楚时使用；否则用局部变量或 `for...of`。
- `for...of` 适合多阶段分组、去重、跨集合状态、提前跳过、插入位置控制等流程。
- 对象字面量里不要堆太长的兼容表达式；读起来吃力时抽成 `normalizeXxx` 或 `mapXxxText`。
- 不机械替换语法：自解释的 `map(mapperFunc)` 保持 `map`，顺序流程也不要硬塞进链式调用。

## 三、Fallback 原则

- fallback 必须有原因：旧接口兼容、后端过渡字段、历史数据或明确 UI 展示约定。
- 非显而易见的 fallback 写中文注释说明兼容来源。
- 必填字段缺失不要静默转成空字符串、空数组或 `0`；应输出显式 nullable、抛错，或推动接口契约修正。
- mapper 输出后，service/component/view 应按稳定 entity 使用，不再重复兜底。
- 请求未返回、loading、empty 等 UI 状态不属于业务字段 fallback，由 view/component 处理。

## 四、类型边界

- Mapper 输入类型贴近 API response。
- Mapper 输出类型贴近 `entity` 或 service 的业务返回类型。
- 不要把 API DTO 直接作为组件 Props。
- 不要在组件中重复定义与领域实体相同语义的类型。
- 组件本地状态与领域会话/请求上下文之间的转换，若属于稳定业务语义，应提升到 service 返回类型、entity 或明确命名的领域 helper；若只服务单个菜单、弹窗或树组件，放在组件同目录。
- Mapper 是 domain 内部转换边界，不通过 domain index re-export。组件、页面和 request 代码不直接 import mapper。

## 五、命名建议

常见文件：

```text
src/domains/<Domain>/mapper/<Domain>Services.map.ts
src/domains/<Domain>/mapper/<entity>.mapper.ts
```

常见函数：

- `mapXxxRequest`
- `mapXxxFromApi`
- `mapXxxToApi`
- `normalizeXxx`
- `mapXxxText`

## 六、检查清单

- [ ] 字段转换集中在 mapper 或领域 normalizer。
- [ ] 集合写法按语义选择，没有机械替换成链式或循环。
- [ ] 复杂过滤、排序、分组或合并逻辑有必要的中文注释。
- [ ] fallback 有明确业务或兼容原因。
- [ ] ID、时间、枚举和展示文案在 mapper 中归一化。
- [ ] mapper 输出类型清楚标记必填、optional 与 nullable。
- [ ] 组件没有直接消费 API DTO，也没有对 service 返回字段二次兜底。
- [ ] mapper 没有通过 domain index 或组件路径外露。
- [ ] 未新增 `any`。
