import type { UpdateUserInfoRequest, UserAccountProfile } from '@/domains/User';
import type { ProfileFieldConfig } from '@/views/app/profile/profile.config';

interface BuildProfileUpdatePayloadParams {
  user: UserAccountProfile | null;
  formValues: UpdateUserInfoRequest;
  fieldConfig: ProfileFieldConfig;
  readonlyFields: ReadonlySet<string>;
}

const optionalText = (value: string | null | undefined): string | undefined => value ?? undefined;

export function buildProfileFormValues(data: UserAccountProfile): UpdateUserInfoRequest {
  return {
    nickname: data.userInfo.nickname ?? undefined,
    realName: data.userInfo.realName ?? undefined,
    sex: data.userProfile.sex,
    university: data.userProfile.university ?? undefined,
    college: data.userProfile.college ?? undefined,
    major: data.userProfile.major ?? undefined,
    className: data.userProfile.className ?? undefined,
    enrollmentYear: data.userProfile.enrollmentYear ?? undefined,
    degreeLevel: data.userProfile.degreeLevel ?? undefined,
    academicTitle: data.userProfile.academicTitle ?? undefined,
  };
}

const canSubmitField = (
  fieldConfig: ProfileFieldConfig,
  readonlyFields: ReadonlySet<string>,
  key: keyof Omit<ProfileFieldConfig, 'showProfileSection'>
): boolean => fieldConfig[key] && !readonlyFields.has(key);

export function buildProfileUpdatePayload({
  user,
  formValues,
  fieldConfig,
  readonlyFields,
}: BuildProfileUpdatePayloadParams): UpdateUserInfoRequest {
  if (!user) return {};

  // 只读字段需保留当前实体值；可编辑字段使用表单草稿。
  return {
    nickname: canSubmitField(fieldConfig, readonlyFields, 'nickname')
      ? formValues.nickname
      : optionalText(user.userInfo.nickname),
    realName: canSubmitField(fieldConfig, readonlyFields, 'realName')
      ? formValues.realName
      : optionalText(user.userInfo.realName),
    sex: canSubmitField(fieldConfig, readonlyFields, 'sex') ? formValues.sex : user.userProfile.sex,
    university: canSubmitField(fieldConfig, readonlyFields, 'university')
      ? (formValues.university ?? null)
      : (user.userProfile.university ?? null),
    college: canSubmitField(fieldConfig, readonlyFields, 'college')
      ? formValues.college
      : optionalText(user.userProfile.college),
    major: canSubmitField(fieldConfig, readonlyFields, 'major')
      ? formValues.major
      : optionalText(user.userProfile.major),
    className: canSubmitField(fieldConfig, readonlyFields, 'className')
      ? formValues.className
      : optionalText(user.userProfile.className),
    enrollmentYear: canSubmitField(fieldConfig, readonlyFields, 'enrollmentYear')
      ? formValues.enrollmentYear
      : optionalText(user.userProfile.enrollmentYear),
    degreeLevel: canSubmitField(fieldConfig, readonlyFields, 'degreeLevel')
      ? formValues.degreeLevel
      : user.userProfile.degreeLevel,
    academicTitle: canSubmitField(fieldConfig, readonlyFields, 'academicTitle')
      ? formValues.academicTitle
      : optionalText(user.userProfile.academicTitle),
  };
}
