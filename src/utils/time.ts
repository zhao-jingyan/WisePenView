const padNumber = (value: number): string => String(value).padStart(2, '0');

const parseToValidDate = (timestamp?: number | string | null): Date | null => {
  if (timestamp == null || timestamp === '') {
    return null;
  }

  const timestampNumber = typeof timestamp === 'number' ? timestamp : Number(timestamp);
  const date = Number.isFinite(timestampNumber)
    ? new Date(timestampNumber)
    : new Date(String(timestamp));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/**
 * 将毫秒时间戳（number/string）转换为 `YYYY-MM-DD HH:mm:ss`
 */
export const formatTimestampToDateTime = (timestamp?: number | string | null): string => {
  const date = parseToValidDate(timestamp);
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hour = padNumber(date.getHours());
  const minute = padNumber(date.getMinutes());
  const second = padNumber(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

/**
 * 将时间值（毫秒时间戳/日期字符串）转换为 `YYYY-MM-DD`。
 * 该函数用于展示层日期文案，后续 i18n 可直接替换此实现。
 */
export const formatTimestampToDate = (timestamp?: number | string | null): string => {
  const date = parseToValidDate(timestamp);
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  return `${year}-${month}-${day}`;
};
