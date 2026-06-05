# Domain API 规范

API 层是后端协议的薄封装，位于 `src/domains/<Domain>/apis`。它只表达“如何请求后端”，不表达“业务如何展示”。

## 一、职责

API 层只负责：

- 定义后端 URL、method、query/body 位置。
- 调用 `apiGet`、`apiPost`、`apiPut`、`apiDelete`。
- 使用请求/响应 DTO 类型。
- 返回已经由 `src/apis/request.ts` 解包后的 `data`。
- 做极轻协议适配，例如 GET 参数放入 `params`、POST 空 body 使用 `null` 或 `undefined`。

API 层禁止：

- 做业务字段映射。
- 做 fallback、枚举转换、ID 归一化、时间格式化。
- 读写 store、缓存、session。
- 做 UI 提示。
- 直接处理 React 生命周期或组件状态。
- 直接 import service、mapper、view、component。

## 二、autoGen 类型优先

- 新增或改造 API 类型时，优先从 `src/_autoGen/api/**/types.gen.ts` 引用后端生成类型。
- autoGen 类型只作为后端协议来源，不允许泄漏到组件展示层。
- 如果 autoGen 暂时缺少接口或字段，先向用户确认接口文档，要求用户运行脚本更新 autoGen 类型，不要盲猜。
- 若必须临时补充 DTO，放在同域 `apis/*Api.type.ts`，并用清晰命名标识请求/响应语义。

命名建议：

```text
src/domains/<Domain>/apis/
├── <Domain>Api.ts
└── <Domain>Api.type.ts
```

- 请求类型：`XxxApiRequest`
- 响应类型：`XxxApiResponse`
- API 对象：`XxxApi`、`XxxMemberApi`、`XxxConfigApi`

## 三、依赖方向

允许：

```text
service -> domain api -> src/apis/request -> src/apis/Axios
```

禁止：

```text
api -> service
api -> mapper
api -> store
api -> hooks
api -> views/components
```

同一 URL 只在一个 API 文件中定义一次。其它业务需要复用时，优先在 service 层编排已有 API。

## 四、错误边界

- 网络、HTTP、业务响应解包由 `src/apis/Axios.ts` 与 `src/apis/request.ts` 统一处理。
- API 层不捕获错误用于改写 UI 文案。
- API 层不调用 `message.*`。
- 客户端业务校验错误放到 service 层，通过 `createClientError` 抛出。

## 五、检查清单

- [ ] API 文件只做请求薄封装。
- [ ] 类型优先来自 `src/_autoGen/api/**/types.gen.ts`。
- [ ] API DTO 未泄漏到组件展示层。
- [ ] 未新增 `any`。
- [ ] 未在 API 层做 fallback、字段映射、UI 提示或缓存。
- [ ] 同一 URL 没有重复定义。
