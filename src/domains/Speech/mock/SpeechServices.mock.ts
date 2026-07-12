import type { ISpeechService, SpeechRecognitionCredential } from '../service/index.type';

const MOCK_CREDENTIAL: SpeechRecognitionCredential = {
  provider: 'IFLYTEK',
  expiresAt: '2099-01-01T00:00:00Z',
  websocketUrl: 'wss://iat-api.xfyun.cn/v2/iat?mock=true',
  appId: 'mock-app-id',
  eosMs: 2500,
};

export const SpeechServicesMock: ISpeechService = {
  issueRecognitionCredential: async ({ eosMs }) => ({ ...MOCK_CREDENTIAL, eosMs }),
};
