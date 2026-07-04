import DescriptionGrid from '@/components/DescriptionGrid';
import { Spin } from '@/components/Feedback';
import { useUserService } from '@/domains';
import type { UserAccountProfile } from '@/domains/User';
import { buildAccountDisplayItems, getAccountIdentityType } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { Separator, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useMemo, useState } from 'react';
import { AccountForm, AccountHeader, AccountVerification } from '../_components/Account';
import type { ProfileFieldKey } from '../profile.config';
import { getProfileFieldConfig, PROFILE_FIELDS } from '../profile.config';
import layout from '../style.module.less';

const PROFILE_FIELD_KEY_SET = new Set<string>(PROFILE_FIELDS.map((field) => field.key));

const isProfileFieldKey = (value: string): value is ProfileFieldKey =>
  PROFILE_FIELD_KEY_SET.has(value);

const buildReadonlyFieldSet = (user: UserAccountProfile | null): Set<ProfileFieldKey> => {
  if (!user) return new Set();
  return new Set(user.readonlyFields.filter(isProfileFieldKey));
};

function Account() {
  const userService = useUserService();
  const [user, setUser] = useState<UserAccountProfile | null>(null);

  const { loading, runAsync: reloadUserInfo } = useRequest(() => userService.getFullUserInfo(), {
    onSuccess: (data) => {
      setUser(data);
    },
    onError: (err: unknown) => {
      toast.danger(parseErrorMessage(err));
    },
  });

  const identityType = getAccountIdentityType(user);
  const fieldConfig = getProfileFieldConfig(identityType);
  const visibleFields = PROFILE_FIELDS.filter((f) => fieldConfig[f.key]);

  const readonlyFieldSet = useMemo(() => buildReadonlyFieldSet(user), [user]);
  const accountItems = useMemo(() => buildAccountDisplayItems(user), [user]);

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>账号管理</h1>
        <span className={layout.pageSubtitle}>管理您的账号信息</span>
      </div>
      <AccountVerification user={user} onUserInfoReload={reloadUserInfo} />
      <Spin spinning={loading}>
        <div className={layout.formSection}>
          <AccountHeader user={user} onUserInfoReload={reloadUserInfo} />

          <Separator className={layout.sectionDivider} />

          <h3 className={layout.sectionTitle}>账号</h3>
          <DescriptionGrid items={accountItems} columns={2} className={layout.descriptions} />

          <Separator className={layout.sectionDivider} />

          <AccountForm
            show={fieldConfig.showProfileSection}
            user={user}
            fieldConfig={fieldConfig}
            visibleFields={visibleFields}
            readonlyFieldSet={readonlyFieldSet}
            onUserInfoReload={reloadUserInfo}
          />
        </div>
      </Spin>
    </div>
  );
}

export default Account;
