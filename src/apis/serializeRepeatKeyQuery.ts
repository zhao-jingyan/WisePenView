/**
 * Serialize query params with repeated keys for array values,
 * e.g. { ids: ['a', 'b'] } -> "ids=a&ids=b".
 * This is compatible with Spring @RequestParam List<T>.
 */
export const serializeRepeatKeyQuery = (params: Record<string, unknown>): string => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && String(item) !== '') {
          sp.append(key, String(item));
        }
      });
      return;
    }
    sp.append(key, String(value));
  });
  return sp.toString();
};
