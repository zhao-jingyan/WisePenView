const DEFAULT_FALLBACK = '请求失败';

/** 从 err 解析出提示文案，fallback 可选，未提供时用解析结果或默认文案 */
export const parseErrorMessage = (err: unknown, fallback?: string): string => {
    if (err instanceof Error && err.message) return err.message;
    const axiosErr = err as { response?: { data?: { msg?: string } } };
    return axiosErr?.response?.data?.msg ?? fallback ?? DEFAULT_FALLBACK;
};
