type EnumConfigItem = {
  value: string | number;
  key: string;
  label: string;
  [key: string]: unknown;
};

/**
 * 高级枚举创建工具
 * 将配置、数值、类型、标签聚合在一起，解决原生 Enum 信息碎片化的问题。
 */
export function createEnum<const T extends readonly EnumConfigItem[]>(cfg: T) {
  return {
    /** 原始数组：用于 Select/Radio 的 options */
    options: cfg,

    /** 字典：通过 Key 获取 Value（模拟 Enum） */
    values: Object.fromEntries(cfg.map((item) => [item.key, item.value])) as {
      [K in T[number]['key']]: Extract<T[number], { key: K }>['value'];
    },

    /** 映射：通过 Value 获取 Label */
    labels: Object.fromEntries(cfg.map((item) => [item.value, item.label])) as {
      [V in T[number]['value']]: string;
    },

    /** 完整配置：通过 Value 获取整行对象 */
    configs: Object.fromEntries(cfg.map((item) => [item.value, item])) as {
      [V in T[number]['value']]: Extract<T[number], { value: V }>;
    },
  };
}
