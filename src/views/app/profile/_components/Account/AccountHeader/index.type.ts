import type { UserAccountProfile } from '@/domains/User';

export interface AccountHeaderProps {
  user: UserAccountProfile | null;
  onUserInfoReload: () => Promise<unknown>;
}
