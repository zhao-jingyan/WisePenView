import {
  areResourcePermissionActionsEqualByOptions,
  buildResourcePermissionActionKeySet,
  filterResourcePermissionActionsByOptions,
} from '@/components/Drive/common/resourcePermissionPolicy';
import { Popover } from '@/components/Overlay';
import { useResourceService, useTagService, useUserService } from '@/domains';
import {
  type ResourceAction,
  type ResourcePermissionActionOption,
  type ResourcePermissionOverview,
  type ResourcePermissionSource,
  type ResourcePermissionSubject,
} from '@/domains/Resource';
import type { UserSearchUser } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { Avatar, Button, Chip, Input, ListBox, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { ChevronDown, Trash2, UserPlus } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ResourcePermissionPanelProps } from './index.type';
import styles from './style.module.less';

interface SubjectPermissionPopoverProps {
  subject: ResourcePermissionSubject;
  actionOptions: ResourcePermissionActionOption[];
  onActionToggle: (
    subject: ResourcePermissionSubject,
    action: ResourcePermissionActionOption['action']
  ) => void;
}

type SpecifiedUserCandidate = Pick<
  UserSearchUser,
  'userId' | 'username' | 'nickname' | 'realName' | 'avatar'
>;

const sourceLabelMap: Record<ResourcePermissionSource, string> = {
  owner: '所有者',
  tag: '来自标签',
  resourceOverride: '资源覆盖',
  specifiedUser: '指定用户',
};
const TAG_INHERITED_DESCRIPTION = '继承自资源所在标签的权限';
const RESOURCE_OVERRIDE_DESCRIPTION = '已覆盖标签策略，仅对此资源生效';
const EMPTY_ACTION_OPTIONS: ResourcePermissionActionOption[] = [];

const getDisplayInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || '?';

const getUserCandidateDisplayName = (user: SpecifiedUserCandidate): string =>
  user.realName?.trim() || user.nickname?.trim() || user.username.trim() || `用户 ${user.userId}`;

const getUserCandidateDescription = (user: SpecifiedUserCandidate): string =>
  user.username ? `@${user.username}` : user.userId;

const getActionLabel = (
  action: ResourcePermissionActionOption['action'],
  options: ResourcePermissionActionOption[]
): string => options.find((option) => option.action === action)?.label ?? String(action);

const formatActionSummary = (
  subject: ResourcePermissionSubject,
  options: ResourcePermissionActionOption[]
): string => {
  if (subject.source === 'owner') return '全部权限';
  if (subject.source === 'tag') return '继承自标签';
  const actions = subject.effectiveActions;
  if (actions.length === 0) {
    return '无权限';
  }
  const first = actions[0];
  return `${getActionLabel(first, options)} 等 ${actions.length} 个权限`;
};

const getSubjectActionsForDisplay = (subject: ResourcePermissionSubject) => {
  if (subject.source === 'tag') {
    return subject.inheritedActions ?? subject.effectiveActions;
  }
  return subject.readonly ? subject.effectiveActions : subject.editableActions;
};

const canCompareWithInheritedActions = (subject: ResourcePermissionSubject): boolean =>
  Array.isArray(subject.inheritedActions);

const getSubjectRenderKey = (subject: ResourcePermissionSubject): string => {
  if (subject.groupId) return `group:${subject.groupId}`;
  if (subject.userId) return `user:${subject.userId}:${subject.source}`;
  return subject.id;
};

const updateSubjectActions = (
  subjects: ResourcePermissionSubject[],
  subjectId: string,
  actions: ResourcePermissionActionOption['action'][],
  options: ResourcePermissionActionOption[]
): ResourcePermissionSubject[] =>
  subjects.map((subject) => {
    if (subject.id !== subjectId || subject.readonly) return subject;
    const nextActions = filterResourcePermissionActionsByOptions(actions, options);
    if (
      subject.source === 'resourceOverride' &&
      canCompareWithInheritedActions(subject) &&
      areResourcePermissionActionsEqualByOptions(nextActions, subject.inheritedActions, options)
    ) {
      const inheritedActions = filterResourcePermissionActionsByOptions(
        subject.inheritedActions,
        options
      );
      return {
        ...subject,
        id: subject.groupId ? `group:${subject.groupId}:tag` : subject.id,
        source: 'tag',
        description: TAG_INHERITED_DESCRIPTION,
        editableActions: inheritedActions,
        effectiveActions: inheritedActions,
        inheritedActions,
      };
    }
    if (subject.source === 'tag') {
      return {
        ...subject,
        id: subject.groupId ? `group:${subject.groupId}:override` : `${subject.id}:override`,
        source: 'resourceOverride',
        description: RESOURCE_OVERRIDE_DESCRIPTION,
        editableActions: nextActions,
        effectiveActions: nextActions,
      };
    }
    return {
      ...subject,
      editableActions: nextActions,
      effectiveActions: nextActions,
    };
  });

const createSpecifiedUserSubject = (user: SpecifiedUserCandidate): ResourcePermissionSubject => ({
  id: `user:${user.userId}:specified`,
  kind: 'user',
  source: 'specifiedUser',
  name: getUserCandidateDisplayName(user),
  description: '由您邀请而获得的权限',
  avatar: user.avatar,
  userId: user.userId,
  effectiveActions: [],
  editableActions: [],
});

const hydrateInheritedTagActions = (
  subjects: ResourcePermissionSubject[],
  options: ResourcePermissionActionOption[],
  getInheritedActions: (subject: ResourcePermissionSubject) => ResourceAction[] | undefined
): ResourcePermissionSubject[] =>
  subjects.map((subject) => {
    if (!subject.groupId || !subject.primaryTagId) return subject;
    const inheritedActions = getInheritedActions(subject);
    if (!inheritedActions) return subject;
    const normalizedInheritedActions = filterResourcePermissionActionsByOptions(
      inheritedActions,
      options
    );

    if (subject.source === 'resourceOverride') {
      const matchesTag = areResourcePermissionActionsEqualByOptions(
        subject.editableActions,
        normalizedInheritedActions,
        options
      );
      if (matchesTag) {
        return {
          ...subject,
          id: `group:${subject.groupId}:tag`,
          source: 'tag',
          description: TAG_INHERITED_DESCRIPTION,
          editableActions: normalizedInheritedActions,
          effectiveActions: normalizedInheritedActions,
          inheritedActions: normalizedInheritedActions,
        };
      }
    }

    if (subject.source === 'tag') {
      return {
        ...subject,
        description: TAG_INHERITED_DESCRIPTION,
        editableActions: normalizedInheritedActions,
        effectiveActions: normalizedInheritedActions,
        inheritedActions: normalizedInheritedActions,
      };
    }

    return {
      ...subject,
      inheritedActions: normalizedInheritedActions,
    };
  });

function SubjectPermissionPopover({
  subject,
  actionOptions,
  onActionToggle,
}: SubjectPermissionPopoverProps) {
  const selectedActionKeys = buildResourcePermissionActionKeySet(
    getSubjectActionsForDisplay(subject),
    actionOptions
  );
  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className={styles.permissionButton}
      isDisabled={subject.readonly || actionOptions.length === 0}
      aria-label={`${subject.name} 的权限`}
    >
      <span className={styles.permissionTriggerText}>
        {formatActionSummary(subject, actionOptions)}
      </span>
      {!subject.readonly && actionOptions.length > 0 ? (
        <ChevronDown size={14} aria-hidden className={styles.permissionChevron} />
      ) : null}
    </Button>
  );

  if (subject.readonly || actionOptions.length === 0) {
    return trigger;
  }

  return (
    <Popover deferContent={false}>
      <Popover.Trigger>{trigger}</Popover.Trigger>
      <Popover.Content className={styles.permissionPopover} placement="bottom end">
        <Popover.Dialog>
          <ListBox
            aria-label={`${subject.name} 的权限选项`}
            selectionMode="multiple"
            selectedKeys={selectedActionKeys}
            className={styles.actionList}
          >
            {actionOptions.map((option) => (
              <ListBox.Item
                id={option.key}
                key={option.key}
                textValue={option.label}
                onPress={() => onActionToggle(subject, option.action)}
              >
                <span className={styles.actionLabel}>{option.label}</span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function ResourcePermissionPanel({
  resourceId,
  resourceType,
  onSuccess,
}: ResourcePermissionPanelProps) {
  const resourceService = useResourceService();
  const tagService = useTagService();
  const userService = useUserService();
  const updateQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestSubjectsRef = useRef<ResourcePermissionSubject[]>([]);
  const [subjectDrafts, setSubjectDrafts] = useState<ResourcePermissionSubject[] | null>(null);
  const [newUserKeyword, setNewUserKeyword] = useState('');
  const [pendingUpdateCount, setPendingUpdateCount] = useState(0);
  const inviteKeyword = newUserKeyword.trim();
  const {
    data: permissionOverview,
    loading,
    error,
    refresh: refreshPermissionOverview,
  } = useRequest(
    () => resourceService.getResourcePermissionOverview({ resourceId, resourceType }),
    {
      ready: Boolean(resourceId && resourceType),
      refreshDeps: [resourceId, resourceType],
      onSuccess: (overview: ResourcePermissionOverview) => {
        latestSubjectsRef.current = overview.subjects;
        setSubjectDrafts(overview.subjects);
      },
    }
  );
  const { data: userSuggestions, loading: userSuggestionsLoading } = useRequest(
    () => userService.listUserSearchSuggestions({ keyword: inviteKeyword, size: 6 }),
    {
      ready: inviteKeyword.length >= 2,
      refreshDeps: [inviteKeyword, userService],
      debounceWait: 250,
    }
  );
  const { loading: userSearchLoading, runAsync: runSearchUsers } = useRequest(
    (keyword: string) => userService.searchUsers({ keyword }),
    { manual: true }
  );

  const subjects = subjectDrafts ?? permissionOverview?.subjects ?? [];
  const actionOptions = permissionOverview?.actionOptions ?? EMPTY_ACTION_OPTIONS;
  const inheritedSubjects = subjects.filter((subject) => subject.source !== 'specifiedUser');
  const specifiedUserSubjects = subjects.filter((subject) => subject.source === 'specifiedUser');
  const existingSpecifiedUserIds = new Set(
    specifiedUserSubjects.map((subject) => subject.userId).filter(Boolean)
  );
  const suggestionUsers =
    inviteKeyword.length >= 2
      ? (userSuggestions ?? []).filter((user) => !existingSpecifiedUserIds.has(user.userId))
      : [];
  const shouldShowInviteDivider = inheritedSubjects.length > 0 && specifiedUserSubjects.length > 0;

  const isUpdating = pendingUpdateCount > 0;

  useRequest(
    async () => {
      if (!permissionOverview || actionOptions.length === 0) return;
      const groupIds = Array.from(
        new Set(
          permissionOverview.subjects
            .map((subject) => subject.groupId)
            .filter((groupId): groupId is string => Boolean(groupId))
        )
      );
      if (groupIds.length === 0) return;

      await Promise.all(
        groupIds.map((groupId) => tagService.getRawTagTree(groupId).catch(() => []))
      );
      setSubjectDrafts((currentSubjects) => {
        const baseSubjects = currentSubjects ?? permissionOverview.subjects;
        const nextSubjects = hydrateInheritedTagActions(baseSubjects, actionOptions, (subject) =>
          subject.primaryTagId
            ? tagService.getRawTagById(subject.primaryTagId, subject.groupId)?.grantedActions
            : undefined
        );
        latestSubjectsRef.current = nextSubjects;
        return nextSubjects;
      });
    },
    {
      ready: Boolean(permissionOverview && actionOptions.length > 0),
      refreshDeps: [permissionOverview, actionOptions, tagService],
    }
  );

  const persistPermissionSubjects = (nextSubjects: ResourcePermissionSubject[]) => {
    setPendingUpdateCount((count) => count + 1);
    updateQueueRef.current = updateQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await resourceService.updateResourcePermissionSubjects({
          resourceId,
          subjects: nextSubjects,
        });
        onSuccess?.();
      })
      .catch((err) => {
        toast.danger(parseErrorMessage(err));
        refreshPermissionOverview();
      })
      .finally(() => {
        setPendingUpdateCount((count) => Math.max(0, count - 1));
      });
  };

  const commitSubjectDrafts = (nextSubjects: ResourcePermissionSubject[]) => {
    latestSubjectsRef.current = nextSubjects;
    setSubjectDrafts(nextSubjects);
    persistPermissionSubjects(nextSubjects);
  };

  const handleActionToggle = (
    changedSubject: ResourcePermissionSubject,
    action: ResourcePermissionActionOption['action']
  ) => {
    const currentSubjects = latestSubjectsRef.current;
    const currentSelectedSubject = currentSubjects.find(
      (subject) => subject.id === changedSubject.id
    );
    if (!currentSelectedSubject || currentSelectedSubject.readonly) return;
    const currentActions = getSubjectActionsForDisplay(currentSelectedSubject);
    const nextActions = currentActions.includes(action)
      ? currentActions.filter((currentAction) => currentAction !== action)
      : [...currentActions, action];
    const nextSubjects = updateSubjectActions(
      currentSubjects,
      currentSelectedSubject.id,
      nextActions,
      actionOptions
    );
    commitSubjectDrafts(nextSubjects);
  };

  const addSpecifiedUserCandidate = (user: SpecifiedUserCandidate) => {
    const currentSubjects = latestSubjectsRef.current;
    const userId = user.userId.trim();
    if (!userId) {
      toast.warning('未找到有效用户');
      return;
    }
    if (currentSubjects.some((subject) => subject.userId === userId)) {
      toast.warning('该用户已在协作者列表中');
      return;
    }
    const nextSubject = createSpecifiedUserSubject({ ...user, userId });
    const nextSubjects = [...currentSubjects, nextSubject];
    commitSubjectDrafts(nextSubjects);
    setNewUserKeyword('');
  };

  const handleAddSpecifiedUser = async () => {
    if (!inviteKeyword) {
      toast.warning('请输入完整用户名或邮箱');
      return;
    }
    try {
      const users = await runSearchUsers(inviteKeyword);
      const user = users[0];
      if (!user) {
        toast.warning('未找到可见用户');
        return;
      }
      addSpecifiedUserCandidate(user);
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  };

  const handleRemoveSpecifiedUser = (subject: ResourcePermissionSubject) => {
    if (subject.source !== 'specifiedUser') return;
    const nextSubjects = latestSubjectsRef.current.filter(
      (currentSubject) => currentSubject.id !== subject.id
    );
    commitSubjectDrafts(nextSubjects);
  };

  const renderSuggestionUser = (user: UserSearchUser) => {
    const displayName = getUserCandidateDisplayName(user);
    return (
      <button
        key={user.userId}
        type="button"
        role="option"
        aria-selected={false}
        className={styles.suggestionItem}
        onClick={() => addSpecifiedUserCandidate(user)}
      >
        <Avatar aria-label={displayName} className={styles.suggestionAvatar}>
          {user.avatar ? <Avatar.Image alt={displayName} src={user.avatar} /> : null}
          <Avatar.Fallback>{getDisplayInitial(displayName)}</Avatar.Fallback>
        </Avatar>
        <span className={styles.suggestionMeta}>
          <span className={styles.suggestionName}>{displayName}</span>
          <span className={styles.suggestionDescription}>{getUserCandidateDescription(user)}</span>
        </span>
      </button>
    );
  };

  const renderSubjectItem = (subject: ResourcePermissionSubject) => (
    <div key={getSubjectRenderKey(subject)} role="listitem" className={styles.subjectItem}>
      <div className={styles.subjectContent}>
        <Avatar aria-label={subject.name} className={styles.avatar}>
          {subject.avatar ? <Avatar.Image alt={subject.name} src={subject.avatar} /> : null}
          <Avatar.Fallback>{getDisplayInitial(subject.name)}</Avatar.Fallback>
        </Avatar>
        <div className={styles.subjectMeta}>
          <div className={styles.subjectNameRow}>
            <span className={styles.subjectName}>{subject.name}</span>
            <Chip size="sm" variant="soft" className={styles.sourceChip}>
              <Chip.Label>{sourceLabelMap[subject.source]}</Chip.Label>
            </Chip>
          </div>
          {subject.description ? (
            <span className={styles.subjectDescription}>{subject.description}</span>
          ) : null}
        </div>
        <div className={styles.subjectActions}>
          <SubjectPermissionPopover
            subject={subject}
            actionOptions={actionOptions}
            onActionToggle={handleActionToggle}
          />
          {subject.source === 'specifiedUser' ? (
            <Button
              size="sm"
              variant="danger"
              onPress={() => handleRemoveSpecifiedUser(subject)}
              aria-label="移除协作者"
            >
              <Trash2 size={16} aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.panel} aria-busy={isUpdating || undefined}>
      <div className={styles.panelHeader}>
        <div>
          <div className={styles.panelTitle}>管理协作者</div>
          <div className={styles.panelSubtitle}>所有可访问此资源的用户</div>
        </div>
      </div>
      <div className={styles.panelBody}>
        {loading ? (
          <div className={styles.stateText}>正在加载权限配置...</div>
        ) : error ? (
          <div className={styles.stateText}>{parseErrorMessage(error)}</div>
        ) : permissionOverview ? (
          <div className={styles.shell}>
            <section className={styles.subjectPane} aria-label="协作者">
              <div className={styles.subjectList} role="list" aria-label="协作者权限来源">
                {inheritedSubjects.map(renderSubjectItem)}
                {shouldShowInviteDivider ? (
                  <div className={styles.inviteDivider} aria-hidden />
                ) : null}
                {specifiedUserSubjects.map(renderSubjectItem)}
              </div>
              <div className={styles.addRow}>
                <TextField
                  aria-label="协作者用户名或邮箱"
                  value={newUserKeyword}
                  onChange={setNewUserKeyword}
                >
                  <Input
                    placeholder="完整用户名或邮箱"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleAddSpecifiedUser();
                      }
                    }}
                  />
                </TextField>
                <Button
                  variant="secondary"
                  isDisabled={userSearchLoading}
                  onPress={() => void handleAddSpecifiedUser()}
                >
                  <UserPlus size={16} aria-hidden />
                  添加
                </Button>
                {inviteKeyword.length >= 2 ? (
                  <div className={styles.suggestionList} role="listbox" aria-label="用户搜索建议">
                    {userSuggestionsLoading ? (
                      <div className={styles.suggestionState}>搜索中...</div>
                    ) : suggestionUsers.length > 0 ? (
                      suggestionUsers.map(renderSuggestionUser)
                    ) : (
                      <div className={styles.suggestionState}>无匹配用户</div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : (
          <div className={styles.stateText}>暂无权限配置</div>
        )}
      </div>
    </div>
  );
}

export default ResourcePermissionPanel;
