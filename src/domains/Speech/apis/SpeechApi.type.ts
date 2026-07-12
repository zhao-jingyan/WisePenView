export interface IssueRecognitionCredentialApiRequest {
  eos_ms?: number;
}

export interface IssueRecognitionCredentialApiResponse {
  provider: string;
  expires_at: string;
  credential: {
    url: string;
    common: {
      app_id: string;
    };
  };
}
