# Domain Service 规范

Service 层位于 `src/domains/<Domain>/service`，负责业务编排和错误抛出。它是 view/component 获取领域能力的主要入口。

## 一、职责

Service 应负责：

- 编排一个或多个 API 调用。
- 调用 mapper 完成请求参数和响应数据转换。
- 做必要的客户端业务校验。
- 抛出 `Error` 或 `WisePenError`。
- 管理领域内缓存、session 或跨请求状态，前提是职责清晰。

Service 不应负责：

- 展示 UI 提示。
- 直接操作 React 组件状态。
- 修补 response/entity 字段缺失或后端字段别名。
- 直接 import `@/apis/Axios`。
- 把后端 raw response 透传给组件。
- 直接 import 其它 service 的实现文件。

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

- `XxxServices.impl.ts` 是 public service 编排入口，只放对外能力、依赖注入、API 调用、store/cache/session 副作用和错误抛出。
- `XxxServices.helper.ts` 是 service 私有业务规则文件，只放纯逻辑、校验、参数决策、集合处理和可复用的小型领域算法。
- helper 只能由同目录相邻的 `XxxServices.impl.ts` 通过 `./XxxServices.helper` 导入，不跨 domain、不跨 service 复用。
- helper 不直接 import API、store、registry、其它 service 实现或其它 service helper；需要副作用时由 impl 调用 helper 获取决策结果，再在 impl 中执行副作用。
- helper 不是通用工具箱；跨领域复用逻辑应提升到 mapper、明确命名的 normalizer、`src/utils` 或 `src/domains/_shared`。

装配层级：

- Level 0：无跨 service 依赖，工厂无参。
- Level 1：依赖 Level 0，通过 `deps` 注入。
- Level 2+：继续在 registry 中显式分层装配。

禁止：

- `*Services.impl.ts` 之间直接 import 彼此实现。
- 跨目录或通过 `@/domains/...` alias import `*Services.helper.ts`。
- 在工厂之外的模块顶层执行跨 service 调用或副作用注册。
- 组件直接 import `*Services.impl.ts` 或 `*Services.mock.ts`。

## 三、后端式编码风格

Domain service 的业务逻辑显式优先：

- public service 方法应像后端应用服务一样按步骤阅读：参数归一化、业务校验、读取上下文、调用 API、同步副作用、返回结果。
- 有业务含义的分支优先使用 `if`、`else if`、提前 `return`，避免嵌套三元表达式。
- 有校验、抛错、缓存写入或副作用的集合处理优先使用 `for...of`，避免链式表达掩盖步骤。
- service 内若存在多阶段合并、过滤、排序、去重或跨 service 协作，应为关键业务规则写中文注释；普通参数传递和自解释 API 调用不写冗余注释。
- 纯数据转换不在 service 中展开，交给 mapper；简单集合转换在 mapper 中可以使用 `map/filter`。
- `Promise.all` 只用于明确互不依赖的并发请求；每个结果应有清晰命名，不构造混合数组后再用 `as` 强转。
- service 中避免隐式对象展开掩盖请求字段来源；业务 payload 优先显式列出字段，或交给 mapper/helper 构造。
- mapper 仍承担 DTO 兼容、fallback、字段归一化，可以保留必要的 TypeScript 表达式；service 消费稳定 entity。
- service 返回给 view/component 的分页、详情和列表数据应已通过 mapper 归一化，调用侧不需要再补 `list`、`total` 或展示文案默认值。

## 四、错误处理

- Service 只抛错，不做 UI 提示。
- 客户端业务校验错误优先使用 `createClientError(code?, message?)`。
- UI 层 catch 后使用 `useAppMessage()` 和 `parseErrorMessage(err)`。
- `parseErrorMessage` 只接收一个 `unknown` 参数，不传 fallback 文案。

## 五、字段 fallback 边界

- Service 默认不写字段保护型 fallback，例如 `data.foo ?? data.bar ?? ''`。
- API response 字段别名、历史兼容、空值归一化应放到 mapper。
- service 不向组件透传需要二次兜底的半成品数据；若组件需要直接展示的字段，应在 mapper/entity 中补齐。
- Service 可以保留清晰的请求参数默认值，例如分页默认页码，但优先通过 mapper 或具名 helper 表达。
- 必填字段缺失时，service 应抛出业务错误或推动 mapper/entity 调整，不静默补空值。
- 清理或新增 fallback 前，先阅读 `docs/agent/fallback.md`。

## 六、请求触发

- React 组件或 Hook 中调用 service 的异步请求，默认使用 `ahooks` 的 `useRequest`。
- 用户交互触发请求使用 `useRequest(fn, { manual: true })`。
- 初始化请求使用 `ready`、`refreshDeps` 或领域 session hook 管理时机。
- 新建后跳转必须遵循：`create -> 获取后端 ID -> navigate`。

## 七、新增 Service 流程

新增领域 service 时，按需补齐：

```text
src/domains/<Domain>/
├── index.ts
├── apis/
├── mapper/
├── entity/
├── enum/
├── mock/
└── service/
```

并更新：

- `src/domains/_registry/registry.types.ts`
- `src/domains/_registry/registry.impl.ts`
- `src/domains/_registry/registry.mock.ts`
- `src/domains/_registry/hooks.ts`
- `src/domains/index.ts`

## 八、检查清单

- [ ] 调用侧通过 `useXxxService()` 获取能力。
- [ ] service 实现导出 `createXxxServices` 工厂。
- [ ] 跨 service 依赖通过 registry 注入。
- [ ] 复杂 service 的内部规则已收敛到同目录 helper。
- [ ] helper 只由相邻 impl 导入，且不直接 import API、store、registry 或其它 service。
- [ ] service 不做 UI 提示。
- [ ] service 不直接 import Axios。
- [ ] service 业务流程使用显式变量、分支和循环，避免过度链式表达。
- [ ] service 中复杂过滤、排序、合并或跨 service 协作有必要中文注释。
- [ ] 自解释代码没有冗余注释。
- [ ] 字段转换交给 mapper。
- [ ] 字段 fallback 没有散落在 service。
- [ ] 返回给组件的数据结构已经可直接消费，组件不需要再兜底领域字段。
- [ ] 错误向上抛出。
- [ ] 未新增 `any`。
