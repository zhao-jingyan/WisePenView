import { FRONTEND_CLIENT_ERROR, type FrontendClientErrorCode } from '@/utils/error/codes';
import { WisePenError } from '@/utils/error/WisePenError';

/** 创建带统一错误码、元数据和原始原因的客户端错误 */
export const createClientError = (
  code: FrontendClientErrorCode = FRONTEND_CLIENT_ERROR.VALIDATION,
  meta?: Record<string, unknown>,
  cause?: unknown
): WisePenError =>
  new WisePenError({
    code,
    source: 'client',
    meta,
    cause,
  });
