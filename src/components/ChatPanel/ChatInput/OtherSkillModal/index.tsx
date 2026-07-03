import { Modal } from '@/components/Overlay';
import type { TreeDataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useChatService } from '@/domains';
import { buildOtherSkillTreeGroups } from '@/domains/Chat';
import type { SkillSummary } from '@/domains/Resource';
import type { ChatAgentOption } from '@/store';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { ChevronDown, Folder } from 'lucide-react';
import type { Key } from 'react';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useChatInputStore, useChatInputStoreApi } from '../ChatInputStore';
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
    const mapping = new Map<string, { skill: SkillSummary; sourceAgent: ChatAgentOption | null }>();
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
      skill: SkillSummary;
      sourceAgent: ChatAgentOption | null;
    }>;
    replaceExternalSkills(selected);
    handleClose();
  };

  return (
    <Modal isOpen onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>选择其他 Skill</Modal.Heading>
            </Modal.Header>
            <Modal.DeferredContent
              fallback={
                <Modal.Body>
                  <div className={styles.wrapper}>
                    <div className={styles.hint}>选择要添加的 Skill（可多选）</div>
                    <div className={styles.treeNav} />
                  </div>
                </Modal.Body>
              }
            >
              {() => (
                <Modal.Body>
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
                          switcherIcon={
                            <span>
                              <ChevronDown size={14} />
                            </span>
                          }
                          onSelect={(keys: Key[]) => setSelectedKeys(keys)}
                        />
                      )}
                    </div>
                  </div>
                </Modal.Body>
              )}
            </Modal.DeferredContent>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose}>
                取消
              </Button>
              <Button variant="primary" onPress={handleConfirm}>
                确认
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default OtherSkillModal;
