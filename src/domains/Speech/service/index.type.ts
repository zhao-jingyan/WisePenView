export interface IssueRecognitionCredentialRequest {
  eosMs: number;
}

export interface SpeechRecognitionCredential {
  provider: 'IFLYTEK';
  expiresAt: string;
  websocketUrl: string;
  appId: string;
  eosMs: number;
}

export interface ISpeechService {
  issueRecognitionCredential(
    params: IssueRecognitionCredentialRequest
  ): Promise<SpeechRecognitionCredential>;
}
