import AppModal from '@/components/Overlay/AppModal';
import type { TreeDataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useChatService } from '@/domains';
import type { ChatAgentOption } from '@/domains/Chat';
import { buildOtherSkillTreeGroups } from '@/domains/Chat';
import type { ResourceSkillSummary } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Folder } from 'lucide-react';
import type { Key } from 'react';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useChatInputStore, useChatInputStoreApi } from '../_store/ChatInputStore';
import styles from './style.module.less';

function OtherSkillModal() {
  const open = useChatInputStore((state) => state.otherSkillModalOpen);
  if (!open) return null;
  return <OtherSkillModalContent />;
}

function OtherSkillModalContent() {
  const chatService = useChatService();
  const { currentAgent, selectedSkills } = useChatInputStore(
    useShallow((state) => ({
      currentAgent: state.selectedAgent,
      selectedSkills: state.selectedSkills,
    }))
  );
  const { replaceExternalSkills, setOtherSkillModalOpen } = useChatInputStoreApi().getState();
  const [selectedKeys, setSelectedKeys] = useState<Key[]>(() =>
    selectedSkills.filter((s) => s.external).map((s) => s.skillId)
  );
  const { data, loading } = useRequest(
    () => chatService.getChatInputCapabilityOptions({ agent: currentAgent }),
    {
      refreshDeps: [currentAgent.agentId],
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
  const rawGroups = data?.otherSkillGroups;

  const { skillMap, treeData } = useMemo(() => {
    const mapping = new Map<
      string,
      { skill: ResourceSkillSummary; sourceAgent: ChatAgentOption | null }
    >();
    const groups = buildOtherSkillTreeGroups(rawGroups ?? [], currentAgent);
    const data: TreeDataNode[] = groups.map((group) => {
      return {
        key: group.key,
        title: (
          <span className={styles.nodeTitle}>
            <Folder size={14} color="var(--warning)" />
            <span>{group.label}</span>
          </span>
        ),
        selectable: false,
        children: group.skills.map((skill) => {
          mapping.set(skill.skillId, { skill, sourceAgent: group.sourceAgent });
          return {
            key: skill.skillId,
            title: skill.displayName,
          };
        }),
      };
    });

    return { skillMap: mapping, treeData: data };
  }, [currentAgent, rawGroups]);

  function handleClose(): void {
    setOtherSkillModalOpen(false);
  }

  const handleOpenChange = (visible: boolean) => {
    if (!visible) handleClose();
  };

  const handleConfirm = () => {
    const selected = selectedKeys.map((key) => skillMap.get(String(key))).filter(Boolean) as Array<{
      skill: ResourceSkillSummary;
      sourceAgent: ChatAgentOption | null;
    }>;
    replaceExternalSkills(selected);
    handleClose();
  };

  return (
    <AppModal
      isOpen
      onOpenChange={handleOpenChange}
      title="选择其他 Skill"
      size="md"
      contentMode="dialog"
    >
      <AppModal.DeferredContent
        fallback={
          <AppModal.Body>
            <div className={styles.wrapper}>
              <div className={styles.hint}>选择要添加的 Skill（可多选）</div>
              <div className={styles.treeNav} />
            </div>
          </AppModal.Body>
        }
      >
        {() => (
          <AppModal.Body>
            <div className={styles.wrapper}>
              <div className={styles.hint}>选择要添加的 Skill（可多选）</div>
              <div className={styles.treeNav}>
                {loading ? (
                  <div className={styles.hint}>正在加载 Skill</div>
                ) : (
                  <Tree
                    treeData={treeData}
                    className={styles.tree}
                    multiple
                    selectedKeys={selectedKeys}
                    defaultExpandAll
                    blockNode
                    onSelect={(keys: Key[]) => setSelectedKeys(keys)}
                  />
                )}
              </div>
            </div>
          </AppModal.Body>
        )}
      </AppModal.DeferredContent>
      <AppModal.Footer>
        <Button variant="secondary" onPress={handleClose}>
          取消
        </Button>
        <Button variant="primary" onPress={handleConfirm}>
          确认
        </Button>
      </AppModal.Footer>
    </AppModal>
  );
}

export default OtherSkillModal;
