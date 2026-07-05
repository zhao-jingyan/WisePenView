# Domain Service 规范

Service 层位于 `src/domains/<Domain>/service`，是 view/component 获取业务用例能力的主要入口。它负责业务编排，不负责修补协议字段，也不生产单个视图专属的 viewmodel。

## 一、职责

Service 应负责：

- 组织 service request，调用 API 或由 registry 注入的其它 service。
- 调用 normalizer 完成 raw response 稳定化；调用薄 mapper 完成请求参数或分页外壳适配。
- 做客户端业务校验并向上抛错；客户端业务错误优先使用 `createClientError`。
- 管理领域内缓存、session 或跨请求状态，前提是职责清晰。
- 返回稳定业务结果，例如实体、分页、聚合用例结果或跨 service 编排结果。

Service 不应负责：

- 展示 UI 提示。
- 直接操作 React 组件状态。
- 修补 response/entity 字段缺失或后端字段别名。
- 直接 import `@/apis/Axios`。
- 把后端 raw response 透传给组件。
- 直接 import 其它 service 的实现文件。
- 构造某个菜单、弹窗、表格或树组件专属的展示结构。

## 二、依赖注入

业务代码通过 `useXxxService()` 获取 service。

真实 service 通过 `src/domains/_registry/registry.impl.ts` 装配，mock service 通过 `registry.mock.ts` 装配。跨 service 依赖必须由工厂参数注入。

标准实现形态：

```ts
export const createXxxServices = (deps?: XxxServiceDeps): IXxxService => ({
  fetchSomething,
});
```

复杂 service 可以新增同目录 helper：

```text
src/domains/<Domain>/service/
├── XxxServices.impl.ts
├── XxxServices.helper.ts
└── index.type.ts
```

- `XxxServices.impl.ts` 是 public service 编排入口。
- `XxxServices.helper.ts` 是 service 私有业务规则文件，只放纯逻辑、校验、参数决策和集合规则。
- helper 只能由相邻 `XxxServices.impl.ts` 通过相对路径导入。
- helper 不直接 import API、store、registry、其它 service 实现或其它 service helper。
- 跨领域协议归一化应提升到明确命名的 normalizer、`src/utils` 或 `src/domains/_shared`。
- 跨视图展示转换应提升到 domain `display/`、`presenter/`，或保留在调用它的 view/component 同目录。

## 三、编码表达

Service 代码应让业务流程可审查，但“可审查”不等于强制 `for...of`。

- public service 方法按业务步骤阅读：准备参数、校验、读取上下文、调用 API、转换结果、写副作用、返回。
- 业务分支用清晰的 `if/else`、提前 `return` 或命名变量表达；不要把多分支压进嵌套三元。
- 集合处理按语义选择写法：一对一转换用 `map`，筛选用 `filter`，存在性判断用 `some/every`，顺序流程、提前退出、异步串行或多处副作用用 `for...of`。
- 校验和抛错可以出现在 `map/filter/some/every` 周围，也可以出现在 `for...of` 中；判断标准是失败路径是否清楚、规则是否命名、读者能否看出业务意图。
- 纯协议数据稳定化不要在 service 中展开，交给 normalizer。
- 简单请求字段改名或分页外壳转换交给薄 mapper。
- 视图展示转换不要在 service 中展开，交给 viewmodel/display。
- `Promise.all` 只用于互不依赖的并发请求；每个结果应有清晰命名，不用混合数组后再 `as` 强转。
- 业务 payload 优先显式列出字段，或交给 mapper/helper 构造；不要用大对象展开掩盖字段来源。

## 四、Fallback 边界

- Service 默认消费稳定 entity，不写 `data.foo ?? data.bar ?? ''` 这类字段保护。
- API response 字段别名、历史兼容、空值归一化放到 normalizer。
- 请求参数默认值可以存在，但要表达清楚业务含义，例如分页默认页码。
- Service 不向组件透传需要二次兜底的半成品 raw 数据；组件需要的展示字段应由 viewmodel/display 明确生成。
- 必填字段缺失时，service 应抛业务错误，或推动 mapper/entity 明确 nullable 契约。

## 五、请求触发

- React 组件或 Hook 中调用 service 的异步请求，默认使用 `ahooks` 的 `useRequest`。
- 用户交互触发请求使用 `useRequest(fn, { manual: true })`。
- 初始化请求使用 `ready`、`refreshDeps` 或领域 session hook 管理时机。
- 新建后跳转遵循：`create -> 获取后端 ID -> navigate`。

## 六、检查清单

- [ ] 调用侧通过 `useXxxService()` 获取能力。
- [ ] service 实现导出 `createXxxServices` 工厂。
- [ ] 跨 service 依赖通过 registry 注入。
- [ ] service 不做 UI 提示、不直接 import Axios、不透传 raw DTO。
- [ ] 复杂内部规则已收敛到相邻 helper，且 helper 不跨 domain 滥用。
- [ ] 集合写法按语义选择，没有机械替换成链式或循环。
- [ ] 字段兼容和 fallback 交给 normalizer，薄 mapper 只做协议适配。
- [ ] 返回给组件的是稳定业务结果；组件专属形状由 viewmodel/display 生成。
- [ ] 错误向上抛出。
- [ ] 未新增 `any`。
