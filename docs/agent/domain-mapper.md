# Domain Mapper 规范

Mapper 层负责把后端协议数据转换为前端展示和 service 编排真正关心的类型。凡是字段兼容、fallback、归一化，都应集中在 mapper。

## 一、职责

Mapper 应处理：

- 后端 DTO 到 entity/view model 的转换。
- service 请求参数到 API request 的转换。
- fallback 和旧接口兼容。
- ID 归一化，例如使用 `normalizeId` 处理数字 ID 或大整数 ID。
- 时间、枚举、权限动作、状态值等展示前归一化。
- 后端大小写不一致、字段缺失、旧字段名兼容等问题。

Mapper 不应处理：

- 发请求。
- UI 提示。
- React 状态。
- store 写入。
- 跨 service 编排。

## 二、写法选择

- 简单字段映射、数组元素转换和 entity 组装，优先使用命名 mapper 函数配合 `map`/`filter`，例如 `data.list.map(mapXxxFromApi)`。
- 不要为了“看起来过程式”把自解释的 `map(mapperFunc)` 改成临时数组加 `for...of`。
- 对象字面量里如果出现不易理解的字段兼容或 fallback，优先抽成有名字的 mapper/normalizer 函数，不在 `{}` 中堆叠表达式。
- 涉及多阶段分组、去重、排序、插入位置控制、提前跳过、跨集合状态时，可以使用过程式写法。
- `filter`、`sort`、`reduce` 承载业务规则时，应在规则附近写中文注释说明排序优先级、过滤原因或合并策略；纯粹的类型收窄或简单映射不需要冗余注释。
- 注释服务于业务意图，不重复解释语法本身。自解释字段映射不要写空洞注释。

## 三、fallback 原则

- fallback 必须有明确原因，通常是旧接口兼容、后端过渡字段或历史数据。
- fallback 逻辑集中写在 mapper 或明确命名的领域 normalizer，不要散落在 JSX、service、store 或组件内部。
- 对非显而易见的 fallback 写中文注释，说明兼容哪个后端形态。
- 不要为了掩盖边界不清楚而写大量 `?.`、默认值或类型守卫。边界不清楚时先问。
- 对必填字段不要静默补空字符串、空数组或 `0`；应明确输出 nullable 类型、抛错，或推动接口契约修正。
- mapper 输出后，service/component/view 应按稳定 entity 使用，不再重复 fallback。

示例场景：

- 后端同时返回 `tokenLimit` 和 `TokenLimit`。
- 枚举可能返回数字、数字字符串或枚举名。
- 配置接口可能省略 `groupId`，需要使用请求入参兜底。

## 四、类型边界

- Mapper 输入类型贴近 API response。
- Mapper 输出类型贴近 `entity` 或 service 的业务返回类型。
- 不要在组件中重复定义与领域实体相同语义的类型。
- 不要把后端 raw DTO 直接作为组件 Props。
- 组件本地状态与领域会话/请求上下文之间的转换，若被多个调用点复用或带默认状态，应提升到领域 mapper。

## 五、命名建议

常见文件：

```text
src/domains/<Domain>/mapper/<Domain>Services.map.ts
src/domains/<Domain>/mapper/<entity>.mapper.ts
```

常见函数命名：

- `mapXxxRequest`
- `mapXxxFromApi`
- `mapXxxToApi`
- `normalizeXxx`

## 六、检查清单

- [ ] 字段转换集中在 mapper。
- [ ] 简单集合转换使用 `map(mapperFunc)`，没有被机械改成冗长循环。
- [ ] 复杂过滤、排序、分组或合并逻辑有必要的中文注释。
- [ ] 自解释字段映射没有冗余注释。
- [ ] fallback 有明确业务或兼容原因。
- [ ] ID、时间、枚举在 mapper 中归一化。
- [ ] 组件没有直接消费后端 raw DTO。
- [ ] service 中没有堆叠大量字段兼容逻辑。
- [ ] mapper 输出类型清楚标记必填、optional 与 nullable。
- [ ] 未新增 `any`。
