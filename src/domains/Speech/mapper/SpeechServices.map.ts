import type {
  IssueRecognitionCredentialApiRequest,
  IssueRecognitionCredentialApiResponse,
} from '../apis/SpeechApi.type';
import type {
  IssueRecognitionCredentialRequest,
  SpeechRecognitionCredential,
} from '../service/index.type';

function mapIssueRecognitionCredentialRequest(
  params: IssueRecognitionCredentialRequest
): IssueRecognitionCredentialApiRequest {
  if (!Number.isInteger(params.eosMs) || params.eosMs < 1000 || params.eosMs > 10000) {
    throw new Error('语音识别静音结束时间必须在 1000-10000ms 之间');
  }
  return { eos_ms: params.eosMs };
}

function mapRecognitionCredentialFromApi(
  response: IssueRecognitionCredentialApiResponse,
  params: IssueRecognitionCredentialRequest
): SpeechRecognitionCredential {
  if (response.provider !== 'IFLYTEK') {
    throw new Error(`暂不支持语音识别服务商: ${response.provider}`);
  }

  const websocketUrlValue = response.credential.url;
  let websocketUrl: URL;
  try {
    websocketUrl = new URL(websocketUrlValue);
  } catch {
    throw new Error('语音识别凭证 URL 无效');
  }
  if (websocketUrl.protocol !== 'wss:' || websocketUrl.hostname !== 'iat-api.xfyun.cn') {
    throw new Error('语音识别凭证地址不受支持');
  }

  return {
    provider: 'IFLYTEK',
    expiresAt: response.expires_at,
    websocketUrl: websocketUrlValue,
    appId: response.credential.common.app_id,
    eosMs: params.eosMs,
  };
}

export const SpeechServicesMap = {
  mapIssueRecognitionCredentialRequest,
  mapRecognitionCredentialFromApi,
};
