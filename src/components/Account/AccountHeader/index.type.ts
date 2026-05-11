import type { GetUserInfoResponse } from '@/domains/User';

export interface AccountHeaderProps {
  user: GetUserInfoResponse | null;
  onUserInfoUpdated: (data: GetUserInfoResponse) => void;
}
