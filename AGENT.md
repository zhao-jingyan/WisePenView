# WisePenView Agent 开发规约

本文件是 WisePenView 前端项目的 agent 主入口。执行任何代码修改前，先阅读本文件，再按任务类型阅读 `docs/agent` 下的专题规约。

## 一、最高优先级规则

- 注释使用中文，commit message 使用中文。
- 分支命名使用 `feat/<content>` 、 `fix/<content>` 、 `refactor/<content>`，`content` 推荐英文短横线。
- 不要盲目扫描 `node_modules`。当第三方 API 不确定时，优先询问用户提供接口文档或官方来源。
- 不确定业务接口、字段边界、权限边界时，先询问用户，不要用防御性代码掩盖不确定性。
- 字段 fallback、旧接口兼容和 raw DTO 归一化默认只能出现在 mapper 或明确命名的领域 normalizer 中；service、component、view 不用 `??`、`?.` 链条修补接口不稳定。
- 不要擅自回滚用户已有改动。修改前查看工作区状态，遇到无关改动保持兼容。
- 项目已彻底移除 Ant Design，不再新增、恢复或沿用 antd 组件、API 和样式覆盖模式。

## 二、开发原则

- KISS：简单直白优于复杂晦涩，避免不可维护的抽象和过度封装。
- 先看现有实现：使用 `rg` 查找同域、同类型代码，沿用项目现有模式。
- 新代码遵循最终目标形态，旧迁移态代码只在相关任务中渐进收敛。
- 保持前后端契约同步：遇到字段落空、命名不一致或历史兼容时，优先修 mapper 和类型契约，不在调用处层层兜底。
- Domain service 采用后端式、可审计写法：业务流程优先使用显式变量、`if`、`for...of` 和提前 `return`，避免用链式表达掩盖校验、副作用和异常路径。
- Mapper 以读者清晰为准：简单字段映射和数组转换优先使用命名 mapper 函数配合 `map/filter`；多阶段分组、去重、排序或包含业务分支时使用过程式写法，并为关键规则补中文注释。
- 复杂 service 的内部规则收敛到同目录 `*Services.helper.ts`，只能由相邻 `*Services.impl.ts` 导入；helper 不跨领域复用，不调用 API、store 或其它 service。

## 三、按任务读取规约

- 领域 API、请求类型：阅读 `docs/agent/domain-api.md`。
- 字段映射、fallback、兼容旧接口：阅读 `docs/agent/domain-mapper.md`。
- fallback 边界和允许场景：阅读 `docs/agent/fallback.md`。
- Service 编排、依赖注入、错误处理：阅读 `docs/agent/domain-service.md`。
- Entity、Enum、常量和展示类型：阅读 `docs/agent/domain-entity.md`。
- 组件放置位置、components 与 views 边界：阅读 `docs/agent/component-boundary.md`。
- React、Hooks、JSX、TypeScript 编码：阅读 `docs/agent/component-react.md`。
- 样式、UI 组件库、布局：阅读 `docs/agent/component-style.md`。
- 分支与 commit：阅读 `docs/agent/commit.md`。

跨层任务按调用链补读：`view/component -> service -> mapper -> api -> entity/enum`。

## 四、React 编码底线

- 只写函数组件和 Hooks，不在函数组件中使用 `this`。
- 函数组件必须返回有效 React 节点，不能没有返回值。
- Hooks 只在顶层调用，只在函数组件或自定义 Hook 中调用。
- 自定义 Hook 必须以 `use` 开头，并使用小驼峰命名。
- 默认禁止直接使用 `useEffect` 组织业务逻辑，优先使用显式事件、`useRequest`、`useMount`、`useUnmount` 或领域 Hook。
- 必须使用 effect 时，统一使用 `useEffectForce`，并在上方写 JSDoc 说明执行时机、不可替代原因和 cleanup 作用。
- 不滥用 `useMemo`、`useCallback`、`React.memo`。只有计算昂贵或引用稳定确实影响 memo 子组件时才使用。
- 禁止新增 `any`。与第三方库交互且无法推断时，必须把范围收窄到最小。

## 五、交付说明

完成任务后说明：

- 改了什么。
- 为什么这样改。
- 跑了哪些验证；如果未运行 lint、compile 或 build，明确说明并给出建议命令。
- 仍然存在的风险或需要用户确认的接口边界。
