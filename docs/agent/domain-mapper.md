# Domain Mapper 与 Normalizer 规范

Domain 数据转换只保留两个名字：`normalizer` 和 `mapper`。Normalizer 负责把后端不稳定数据变成稳定领域事实；mapper 只做薄协议适配。

## 一、固定分工

Normalizer 处理：

- 后端字段别名、大小写不一致、旧字段名兼容。
- 历史数据补齐、后端过渡字段、协议空值归一化。
- ID、时间、枚举、权限动作、状态值等领域归一化。
- 从 raw DTO 推导稳定领域事实，例如资源主挂载标签、模型 provider key。

Mapper 处理：

- service request 到 API request 的字段改名。
- API response 外壳到 service 返回外壳，例如分页结构。
- 简单 DTO 到 entity 的一对一字段搬运，且不包含兜底、推断、排序或展示文案。

ViewModel/Display 处理：

- 展示文案、空值占位、标签、表格行、列表 option、菜单 section、树节点。
- 只服务单个页面或组件的展示结构。

## 二、硬边界

- Mapper 不写复杂 fallback。出现多层 `??`、类型守卫、枚举猜测、字段别名链时，抽到 normalizer。
- Mapper 不写 UI 文案。出现 `暂无`、`Default`、`X.X 分`、按钮文案、菜单标题时，放到 viewmodel/display。
- Service 不修 raw response 字段。发现需要修字段时，回到 normalizer。
- Component/view 不猜后端字段。需要展示占位时，建立 viewmodel/display。
- 跨 domain 复用的稳定化逻辑不放在 `*Services.map.ts`，放在 `normalizer/*Normalizer.ts` 并通过 domain index 显式导出。

## 三、推荐目录

```text
src/domains/<Domain>/
├── apis/
├── entity/
├── normalizer/
│   └── xxxNormalizer.ts
├── mapper/
│   └── <Domain>Services.map.ts
└── service/
```

组件或页面私有展示转换：

```text
src/components/<Feature>/xxx.viewmodel.ts
src/views/<Route>/xxx.presenter.ts
src/domains/<Domain>/display/xxxDisplay.ts
```

## 四、命名

Normalizer：

- `normalizeXxxFromApi`
- `normalizeXxxListFromApi`
- `normalizeXxxPermission`
- `normalizeXxxStatus`

Mapper：

- `mapXxxRequest`
- `mapXxxPageFromApi`
- `mapXxxResponseFromApi`

ViewModel/Display：

- `buildXxxViewModel`
- `buildXxxRows`
- `getXxxDisplayText`

## 五、检查清单

- [ ] 兜底和协议兼容在 normalizer，不在 service/component。
- [ ] mapper 没有承担推断、排序、聚合或展示文案。
- [ ] viewmodel/display 承担展示文本、标签、菜单、树节点等 UI 形状。
- [ ] service 返回稳定业务结果，不返回 raw DTO 或组件 props。
- [ ] 跨 domain 复用的 normalizer 通过 domain index 暴露明确名字。
- [ ] 未新增 `any`。
