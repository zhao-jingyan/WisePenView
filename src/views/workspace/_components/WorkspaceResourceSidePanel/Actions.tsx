import { ToggleButton, Tooltip } from '@heroui/react';
import { MessageSquareText, MessagesSquare } from 'lucide-react';
import { useWorkspaceResourceSidePanelStore } from '../../_store/useWorkspaceResourceSidePanelStore';
import styles from './style.module.less';

interface WorkspaceResourceSidePanelActionsProps {
  resourceId: string;
  inlineCommentAvailable: boolean;
  disabled?: boolean;
}

function WorkspaceResourceSidePanelActions({
  resourceId,
  inlineCommentAvailable,
  disabled,
}: WorkspaceResourceSidePanelActionsProps) {
  const mode = useWorkspaceResourceSidePanelStore(
    (state) => state.modeByResourceId[resourceId] ?? 'closed'
  );
  const toggleMode = useWorkspaceResourceSidePanelStore((state) => state.toggleMode);

  return (
    <div className={styles.actions}>
      {inlineCommentAvailable ? (
        <Tooltip>
          <Tooltip.Trigger>
            <ToggleButton
              variant="ghost"
              size="sm"
              isIconOnly
              isSelected={mode === 'inlineComment'}
              isDisabled={disabled}
              aria-label={mode === 'inlineComment' ? '收起批注栏' : '展开批注栏'}
              aria-expanded={mode === 'inlineComment'}
              onChange={() => toggleMode(resourceId, 'inlineComment')}
            >
              <MessageSquareText size={18} aria-hidden="true" />
            </ToggleButton>
          </Tooltip.Trigger>
          <Tooltip.Content>
            {mode === 'inlineComment' ? '收起批注栏' : '打开批注栏'}
          </Tooltip.Content>
        </Tooltip>
      ) : null}
      <Tooltip>
        <Tooltip.Trigger>
          <ToggleButton
            variant="ghost"
            size="sm"
            isIconOnly
            isSelected={mode === 'comment'}
            isDisabled={disabled}
            aria-label={mode === 'comment' ? '收起评论区' : '展开评论区'}
            aria-expanded={mode === 'comment'}
            onChange={() => toggleMode(resourceId, 'comment')}
          >
            <MessagesSquare size={18} aria-hidden="true" />
          </ToggleButton>
        </Tooltip.Trigger>
        <Tooltip.Content>{mode === 'comment' ? '收起评论区' : '打开评论区'}</Tooltip.Content>
      </Tooltip>
    </div>
  );
}

export default WorkspaceResourceSidePanelActions;
