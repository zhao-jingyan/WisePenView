/**
 * ServicesContext - Service 统一注册与注入
 *
 * 本目录是项目中所有 Service 的「一处注册」入口。新增服务时，在 `registry.ts` 与 `hooks.ts`
 * 中按步骤补齐，即可让任意组件通过 useXxxService() 获取对应 Service 实例。
 *
 * --- 运行模式 ---
 * - 开发/生产：使用真实实现（XxxServicesImpl）
 * - 开发模式且 MODE === 'mock'：使用 Mock 实现（XxxServicesMock）
 *
 * --- 新增服务完整流程 ---
 *
 * 由于 TypeScript 缺乏 Spring 式的 IOC 容器，所以需要手动注册。
 * 假设你要新增一个 OrderService，需要依次完成：
 *
 * 1. 在 src/services/Order/ 下创建：
 *    - index.type.ts：定义 IOrderService 接口及 *Request 类型
 *    - OrderServices.impl.ts：实现 IOrderService，内部调用真实 API
 * 2. 在 src/mocks/Order/ 下创建：
 *    - OrderServices.mock.ts：实现 IOrderService，返回假数据或 delay 模拟
 * 3. 在 `registry.ts` 中完成第四步～第六步（类型、真实实现、Mock 绑定）
 * 4. 在 `hooks.ts` 中完成第七步：export const useOrderService = ...
 */

export type { ServicesContextValue } from './registry';
export { ServicesProvider } from './ServicesProvider';
export {
  useAuthService,
  useChatService,
  useDocumentService,
  useFolderService,
  useGroupService,
  useImageService,
  useNoteService,
  useQuotaService,
  useResourceService,
  useStickerService,
  useTagService,
  useUserService,
  useWalletService,
} from './hooks';
