import type { UpdateUserInfoRequest, UserAccountProfile } from '@/domains/User';
import type { ProfileFieldConfig, ProfileFieldKey } from '@/views/app/profile/profile.config';

export type ProfileFormValues = UpdateUserInfoRequest;

/** 与 `PROFILE_FIELDS` 单项结构一致 */
export type ProfileFieldItem = {
  key: ProfileFieldKey;
  label: string;
  type: 'input' | 'select';
  placeholder: string;
  optionsKey?: 'sex' | 'degreeLevel';
};

export interface AccountFormProps {
  show: boolean;
  user: UserAccountProfile | null;
  fieldConfig: ProfileFieldConfig;
  visibleFields: readonly ProfileFieldItem[];
  readonlyFieldSet: ReadonlySet<ProfileFieldKey>;
  onUserInfoReload: () => Promise<unknown>;
}
