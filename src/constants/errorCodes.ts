/** API 标准返回码 */
export const API_CODE = {
    SUCCESS: 0,
} as const;

/** 错误码对应的前端提示文案，未配置时 fallback 到后端返回的 msg */
export const ERROR_CODE_MSG: Partial<Record<number, string>> = {};
