import type { ApiErrorBody } from '@/apis/api.type';
import i18n from '@/i18n';
import { I18N_NAMESPACES } from '@/i18n/resources';
import { isWisePenError } from '@/utils/error/WisePenError';
import type { AxiosError } from 'axios';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readCodeFromAxiosData = (data: unknown): number | undefined => {
  if (!isRecord(data)) return undefined;
  return typeof data.code === 'number' ? data.code : undefined;
};

const readServerMsgFromAxiosData = (data: unknown): string | undefined => {
  if (!isRecord(data)) return undefined;
  const body = data as ApiErrorBody;
  if (typeof body.msg === 'string') return body.msg;
  if (typeof body.message === 'string') return body.message;
  return undefined;
};

const extractErrorCode = (err: unknown): number | undefined => {
  if (isWisePenError(err)) return err.code;
  const axiosErr = err as AxiosError<ApiErrorBody>;
  if (axiosErr?.response?.data) {
    return readCodeFromAxiosData(axiosErr.response.data);
  }
  return undefined;
};

const extractServerMsg = (err: unknown): string | undefined => {
  if (isWisePenError(err)) return err.serverMsg ?? err.message;
  const axiosErr = err as AxiosError<ApiErrorBody>;
  if (axiosErr?.response?.data) {
    return readServerMsgFromAxiosData(axiosErr.response.data);
  }
  if (err instanceof Error && err.message) return err.message;
  return undefined;
};

const translateByCode = (code: number): string | undefined => {
  const key = `code.${code}`;
  const translated = i18n.t(key, { ns: I18N_NAMESPACES.ERRORS });
  if (translated === key || translated === `${I18N_NAMESPACES.ERRORS}:${key}`) {
    return undefined;
  }
  return translated;
};

/** 从 err 解析出提示文案：i18n(code) → serverMsg → unknown */
export const parseErrorMessage = (err: unknown): string => {
  const code = extractErrorCode(err);
  if (code !== undefined) {
    const i18nMsg = translateByCode(code);
    if (i18nMsg) return i18nMsg;
  }

  const serverMsg = extractServerMsg(err);
  if (serverMsg) return serverMsg;

  return i18n.t('common.unknown', { ns: I18N_NAMESPACES.ERRORS });
};
