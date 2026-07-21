import type { AgentSpec } from '@/domains/Agent';
import type { ToolOption } from '@/domains/Chat';
import type { SkillSummary } from '@/domains/Skill';
import CapabilityPolicyPanel, { type CapabilityPolicyOption } from '../CapabilityPolicyPanel';
import SectionShell from '../SectionShell';
import SettingRow from '../SettingRow';

interface Props {
  spec: AgentSpec;
  tools: ToolOption[];
  skills: SkillSummary[];
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}

export default function CapabilitiesSection({ spec, tools, skills, disabled, onChange }: Props) {
  const policy = spec.toolAndSkillPolicy;
  const deniedToolSet = new Set(policy.denyToolNames);
  const defaultAllowedToolIds =
    policy.allowToolNames.length === 0
      ? tools.map((tool) => tool.toolId).filter((toolId) => !deniedToolSet.has(toolId))
      : policy.allowToolNames;
  const onDemandSkillSet = new Set(policy.onDemandSkillIds);
  const forceSkillSet = new Set(policy.forceEnabledSkillIds);

  const getToolAvailabilityReason = (tool: ToolOption) => {
    if (!tool.enabled) return '该 Tool 当前未启用';
    if (tool.requiresConfig && !tool.configured) return '该 Tool 需要先完成配置';
    if (!tool.configured) return '该 Tool 配置不完整';
    return undefined;
  };

  const toToolOptions = (
    blockedSet: Set<string>,
    blockedReason: string
  ): CapabilityPolicyOption[] =>
    tools.map((tool) => {
      const disabledReason = blockedSet.has(tool.toolId)
        ? blockedReason
        : getToolAvailabilityReason(tool);
      return {
        id: tool.toolId,
        name: tool.label,
        internalName: tool.toolId,
        description: tool.description,
        disabled: Boolean(disabledReason),
        disabledReason,
      };
    });

  const toSkillOptions = (
    blockedSet: Set<string>,
    blockedReason: string
  ): CapabilityPolicyOption[] =>
    skills.map((skill) => {
      const disabledReason = blockedSet.has(skill.resourceId) ? blockedReason : undefined;
      return {
        id: skill.resourceId,
        name: skill.title,
        internalName: skill.skillName,
        description: skill.description,
        disabled: Boolean(disabledReason),
        disabledReason,
      };
    });

  // 允许和禁用 Tool 可以在两侧直接切换，提交时再从另一侧移除，避免默认全选后无法禁用。
  const allowToolOptions = toToolOptions(new Set(), '');
  const denyToolOptions = toToolOptions(new Set(), '');
  const onDemandSkillOptions = toSkillOptions(forceSkillSet, '该 Skill 已加入强制启用 Skill');
  const forceSkillOptions = toSkillOptions(onDemandSkillSet, '该 Skill 已加入按需 Skill');

  const updatePolicy = (next: Partial<typeof policy>) => {
    onChange({ ...spec, toolAndSkillPolicy: { ...policy, ...next } });
  };

  return (
    <SectionShell
      id="capabilities"
      title="工具与 Skill"
      description="配置 Agent 可以调用的工具和专业能力。"
    >
      <SettingRow
        title="启用 Tool"
        description="关闭后隐藏并停用全部 Tool 与 Skill 配置。"
        selected={policy.enableUseTool}
        disabled={disabled}
        onChange={(value) => updatePolicy({ enableUseTool: value })}
      />
      {policy.enableUseTool ? (
        <>
          <CapabilityPolicyPanel
            kind="tool"
            title="允许 Tool"
            description="添加 Agent 可以调用的 Tool"
            addLabel="添加允许 Tool"
            searchPlaceholder="搜索 Tool 名称或描述"
            emptyText="没有匹配的 Tool"
            selectedEmptyText="暂未选择 Tool"
            options={allowToolOptions}
            selectedIds={defaultAllowedToolIds}
            disabled={disabled}
            onChange={(ids) =>
              updatePolicy({
                allowToolNames: ids,
                denyToolNames: policy.denyToolNames.filter((id) => !ids.includes(id)),
              })
            }
          />
          <CapabilityPolicyPanel
            kind="tool"
            title="禁用 Tool"
            description="添加 Agent 明确不能调用的 Tool"
            addLabel="添加禁用 Tool"
            searchPlaceholder="搜索 Tool 名称或描述"
            emptyText="没有匹配的 Tool"
            selectedEmptyText="暂未选择 Tool"
            options={denyToolOptions}
            selectedIds={policy.denyToolNames}
            disabled={disabled}
            onChange={(ids) =>
              updatePolicy({
                denyToolNames: ids,
                allowToolNames: policy.allowToolNames.filter((id) => !ids.includes(id)),
              })
            }
          />
          <SettingRow
            title="启用 Skill"
            description="关闭后不向 Agent 提供 Skill。"
            selected={policy.enableUseSkill}
            disabled={disabled}
            onChange={(value) => updatePolicy({ enableUseSkill: value })}
          />
          {policy.enableUseSkill ? (
            <>
              <CapabilityPolicyPanel
                kind="skill"
                title="按需 Skill"
                description="添加需要时由 Agent 匹配加载的 Skill"
                addLabel="添加按需 Skill"
                searchPlaceholder="搜索 Skill 名称或描述"
                emptyText="没有匹配的 Skill"
                selectedEmptyText="暂未选择 Skill"
                options={onDemandSkillOptions}
                selectedIds={policy.onDemandSkillIds}
                disabled={disabled}
                onChange={(ids) => updatePolicy({ onDemandSkillIds: ids })}
              />
              <CapabilityPolicyPanel
                kind="skill"
                title="强制启用 Skill"
                description="添加每次会话固定加载的 Skill"
                addLabel="添加强制启用 Skill"
                searchPlaceholder="搜索 Skill 名称或描述"
                emptyText="没有匹配的 Skill"
                selectedEmptyText="暂未选择 Skill"
                options={forceSkillOptions}
                selectedIds={policy.forceEnabledSkillIds}
                disabled={disabled}
                onChange={(ids) => updatePolicy({ forceEnabledSkillIds: ids })}
              />
            </>
          ) : null}
        </>
      ) : null}
    </SectionShell>
  );
}
