import type { ApiResponse } from '@/types/api';
import { API_CODE, ERROR_CODE_MSG } from '@/constants/errorCodes';

/** 校验标准返回体，失败时抛出 Error(ERROR_CODE_MSG[code] ?? res.msg ?? '请求失败') */
export const checkResponse = (res: ApiResponse): void => {
    if (res?.code !== API_CODE.SUCCESS) {
        const msg = ERROR_CODE_MSG[res.code] ?? res?.msg ?? '请求失败';
        throw new Error(msg);
    }
};
