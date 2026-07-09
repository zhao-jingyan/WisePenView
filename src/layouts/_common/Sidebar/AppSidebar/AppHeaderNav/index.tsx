import { FormField, Input } from '@/components/Input';
import AppFormDialog from '@/components/Overlay/AppFormDialog';
import CreateSkillModal from '@/components/Skill/CreateSkillModal';
import { useNoteService } from '@/domains';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { useNewNoteStore } from '@/store';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { WORKSPACE_RESOURCE_TYPE } from '@/utils/navigation/workspaceRoute';
import { ListBox, ListBoxItem, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import clsx from 'clsx';
import { Bot, FileText, PenTool, Puzzle, Users, Workflow } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppHeaderNavProps } from './index.type';
import styles from './style.module.less';

function AppHeaderNav({ collapsed }: AppHeaderNavProps) {
  const navigate = useNavigate();
  const openInWorkspace = useOpenInWorkspace();
  const location = useLocation();
  const noteService = useNoteService();
  const [drawioModalOpen, setDrawioModalOpen] = useState(false);
  const [drawioName, setDrawioName] = useState('未命名图表');
  const [drawioNameError, setDrawioNameError] = useState('');
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  const isDriveActive =
    location.pathname.startsWith('/app/drive') || location.pathname.startsWith('/app/workspace');
  const isGroupActive = location.pathname.startsWith('/app/my-group');
  const isChatActive = location.pathname.startsWith('/app/chat');
  const isSkillActive =
    location.pathname.startsWith('/app/workspace/skill') ||
    location.pathname.startsWith('/app/skill');
  const selectedKeys = isChatActive
    ? ['/app/chat']
    : isSkillActive
      ? ['/app/workspace/skill']
      : isDriveActive
        ? ['/app/drive']
        : isGroupActive
          ? ['/app/my-group']
          : [];
  const { loading: creatingNote, run: runCreateNote } = useRequest(
    async () => {
      const { resourceId } = await noteService.createNote({ title: '未命名笔记' });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      return { resourceId };
    },
    {
      manual: true,
      onSuccess: ({ resourceId }) => {
        useNewNoteStore.getState().setNewNoteResourceId(resourceId);
        openInWorkspace({
          resourceId,
          resourceType: WORKSPACE_RESOURCE_TYPE.NOTE,
        });
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleCreateNote = () => {
    if (creatingNote) return;
    const pendingNewNoteId = useNewNoteStore.getState().newNoteResourceId;
    if (pendingNewNoteId != null && pendingNewNoteId !== '') {
      openInWorkspace({
        resourceId: pendingNewNoteId,
        resourceType: WORKSPACE_RESOURCE_TYPE.NOTE,
      });
      return;
    }
    runCreateNote();
  };

  const handleCreateSkill = () => {
    setSkillModalOpen(true);
  };

  const handleCreateSkillSuccess = (resourceId: string) => {
    setSkillModalOpen(false);
    openInWorkspace({
      resourceId,
      resourceType: WORKSPACE_RESOURCE_TYPE.SKILL,
    });
  };

  const { loading: creatingDrawio, run: runCreateDrawio } = useRequest(
    async () => {
      const title = drawioName.trim() || '未命名图表';
      const { resourceId } = await noteService.createNote({
        title,
        resourceType: 'DRAWIO',
      });
      if (!resourceId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      }
      return { resourceId };
    },
    {
      manual: true,
      onSuccess: ({ resourceId }) => {
        setDrawioModalOpen(false);
        setDrawioNameError('');
        openInWorkspace({
          resourceId,
          resourceType: WORKSPACE_RESOURCE_TYPE.DRAWIO,
        });
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleOpenDrawioModal = () => {
    if (creatingDrawio) return;
    setDrawioName('未命名图表');
    setDrawioNameError('');
    setDrawioModalOpen(true);
  };

  const handleConfirmCreateDrawio = () => {
    if (creatingDrawio) return;
    if (!drawioName.trim()) {
      setDrawioNameError('请输入 Draw.io 图名称');
      return;
    }
    runCreateDrawio();
  };

  const handleDrawioModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDrawioNameError('');
    }
    setDrawioModalOpen(nextOpen);
  };

  return (
    <>
      <ListBox
        aria-label="应用导航"
        selectionMode="single"
        selectedKeys={selectedKeys}
        className={clsx(styles.headerMenu, collapsed && styles.headerMenuCollapsed)}
      >
        <ListBoxItem
          id="new-note"
          textValue="新建笔记"
          isDisabled={creatingNote}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={handleCreateNote}
        >
          <span className={styles.menuIcon}>
            <PenTool size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>新建笔记</span>}
        </ListBoxItem>
        <ListBoxItem
          id="new-drawio"
          textValue="新建 Draw.io 图"
          isDisabled={creatingDrawio}
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={handleOpenDrawioModal}
        >
          <span className={styles.menuIcon}>
            <Workflow size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>新建图表</span>}
        </ListBoxItem>
        <ListBoxItem
          id="new-skill"
          textValue="新建 Skill"
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={handleCreateSkill}
        >
          <span className={styles.menuIcon}>
            <Puzzle size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>新建 Skill</span>}
        </ListBoxItem>
        <ListBoxItem
          id="/app/chat"
          textValue="AI 对话"
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate('/app/chat')}
        >
          <span className={styles.menuIcon}>
            <Bot size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>AI 对话</span>}
        </ListBoxItem>
        <ListBoxItem
          id="/app/drive"
          textValue="文档与云盘"
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate('/app/drive')}
        >
          <span className={styles.menuIcon}>
            <FileText size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>文档与云盘</span>}
        </ListBoxItem>
        <ListBoxItem
          id="/app/my-group"
          textValue="我的小组"
          className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
          onPress={() => navigate('/app/my-group')}
        >
          <span className={styles.menuIcon}>
            <Users size={18} />
          </span>
          {!collapsed && <span className={styles.menuLabel}>我的小组</span>}
        </ListBoxItem>
      </ListBox>
      <AppFormDialog
        isOpen={drawioModalOpen}
        onOpenChange={handleDrawioModalOpenChange}
        title="新建 Draw.io 图"
        confirmText="创建"
        onSubmit={handleConfirmCreateDrawio}
        isSubmitting={creatingDrawio}
        isSubmitDisabled={creatingDrawio}
        isDismissable={!creatingDrawio}
      >
        <FormField
          aria-label="Draw.io 图名称"
          label="Draw.io 图名称"
          name="drawioName"
          value={drawioName}
          onChange={(value) => {
            setDrawioName(value);
            setDrawioNameError('');
          }}
          errorMessage={drawioNameError}
          isRequired
        >
          <Input placeholder="请输入名称" autoFocus />
        </FormField>
      </AppFormDialog>
      <CreateSkillModal
        isOpen={skillModalOpen}
        onOpenChange={setSkillModalOpen}
        onSuccess={handleCreateSkillSuccess}
      />
    </>
  );
}

export default AppHeaderNav;
