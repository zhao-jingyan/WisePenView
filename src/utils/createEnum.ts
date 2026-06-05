type RuntimeEnum = Record<string, string | number>;

type EnumOption<T extends string | number> = {
  value: T;
  label: string;
};

export function createEnum<const T extends RuntimeEnum>(
  genEnum: T,
  descriptions: readonly string[] = []
) {
  const keys = Object.keys(genEnum) as Array<keyof T>;
  const options = keys.map((key, index) => ({
    value: genEnum[key],
    label: descriptions[index] || String(key),
  })) as Array<EnumOption<T[keyof T]>>;

  const labels = Object.fromEntries(options.map((item) => [item.value, item.label])) as Record<
    T[keyof T],
    string
  >;

  return {
    raw: genEnum,
    options,
    labels,
    getLabel: (value: T[keyof T] | null | undefined): string =>
      value == null ? '未知' : (labels[value] ?? String(value)),
  };
}
