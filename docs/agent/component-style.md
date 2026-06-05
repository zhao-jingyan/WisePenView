# 样式与 UI 规范

WisePenView 使用 Less、CSS Modules，并处于 HeroUI 与 Ant Design 迁移期。新增代码优先遵循 HeroUI 和项目现有设计语言。

## 一、样式组织

- 样式使用 Less + CSS Modules。
- 组件样式文件命名为 `style.module.less`。
- 样式类名使用 camelCase。
- 避免非必要内联样式。
- 动态样式优先通过 className、CSS 变量或组件受控属性表达。

推荐结构：

```text
ComponentName/
├── index.tsx
├── index.type.ts
└── style.module.less
```

## 二、HeroUI 与 AntD 迁移

- 新增 Modal、Button、Input、Select、Checkbox 等基础交互控件，优先使用 HeroUI。
- 迁移以 HeroUI 设计语言为准，不复刻 AntD 视觉。
- 不新增 AntD Modal 专用属性风格，例如 `footer` 数组、`destroyOnHidden`、`onCancel`。
- 覆盖 AntD 样式时使用 `:global(.ant-xxx)`，并限定在当前组件根类下。
- 旧 AntD 代码只在相关任务中渐进迁移，不做无关大改。

## 三、Modal 约定

HeroUI Modal 统一使用组合式结构：

```text
Modal
Modal.Backdrop
Modal.Container
Modal.Dialog
Modal.Header
Modal.Body
Modal.Footer
```

- 受控属性使用 `isOpen` 和 `onOpenChange`。
- 关闭弹窗调用 `onOpenChange(false)`。
- 操作成功后通常先调用 `onSuccess?.()`，再关闭弹窗。
- 异步提交使用 `useRequest(fn, { manual: true })`。
- 错误提示使用 `useAppMessage()` 和 `parseErrorMessage(err)`。

## 四、布局与可读性

- 页面和工具界面优先清晰、紧凑、可扫描。
- 不要为了装饰创建过多卡片嵌套。
- 固定格式 UI 需要稳定尺寸，例如表格、工具栏、图标按钮、计数器。
- 文本不能溢出容器或互相遮挡。
- 不要使用纯装饰性渐变球、光斑、无意义背景图。
- 不要用 viewport 宽度直接缩放字体。

## 五、组件库使用

- 图标按钮优先使用已有图标库，例如 `lucide-react`。
- 有明确图标语义时，不要用文字按钮代替图标按钮。
- 不熟悉的图标按钮应提供 tooltip 或可访问名称。
- 表格、菜单、tabs、开关、滑块等控件使用符合用户预期的交互形态。

## 六、检查清单

- [ ] 样式使用 Less + CSS Modules。
- [ ] 没有非必要内联样式。
- [ ] 新增交互控件优先 HeroUI。
- [ ] AntD 样式覆盖被限制在当前组件根类下。
- [ ] 文本和控件在常见宽度下不会重叠或溢出。
- [ ] 没有无意义装饰和卡片套卡片。
