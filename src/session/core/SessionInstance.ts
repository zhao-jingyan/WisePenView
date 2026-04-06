/**
 * 实例对象与传输适配器同生命周期；由 `createSessionHook` 以 `new Instance(adapter)` 创建，
 * 并可由 plugin gateway 注入连接状态读取能力。
 */
export interface ConnectionInstance {
  dispose?(): void;
}
