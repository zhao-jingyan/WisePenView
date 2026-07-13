import { ResultState, Spin } from '@/components/Feedback';
import { useNoteService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import {
  useResourceHostLayoutConfig,
  type ResourceHostLayoutConfig,
} from '@/views/workspace/ResourceHostContext';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import NoteWorkspace from './_components/NoteWorkspace';
import styles from './style.module.less';

const NOTE_FRAME_CONFIG: ResourceHostLayoutConfig = { className: styles.pageWrap };

function NoteFrame({ children }: { children: ReactNode }) {
  useResourceHostLayoutConfig(NOTE_FRAME_CONFIG);
  return <>{children}</>;
}

function NoteOpenFailure({ subTitle }: { subTitle?: string }) {
  return (
    <NoteFrame>
      <div className={styles.middleOverlay}>
        <div className={styles.middleOverlayInner}>
          <ResultState
            status="warning"
            title="无法打开笔记"
            subTitle={subTitle}
            extra={
              <Link to="/app/drive">
                <Button variant="secondary">返回云盘</Button>
              </Link>
            }
          />
        </div>
      </div>
    </NoteFrame>
  );
}

function NoteInfoLoading() {
  return (
    <NoteFrame>
      <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
        <div className={styles.middleOverlayLoading}>
          <Spin size="large" />
          <span className={styles.middleOverlayText}>正在加载笔记信息...</span>
        </div>
      </div>
    </NoteFrame>
  );
}

function NoteView({ resourceId }: { resourceId: string }) {
  const noteService = useNoteService();
  const {
    data: noteInfoDisplay,
    loading,
    error,
    refresh,
  } = useRequest(() => noteService.getNoteInfoDisplay({ resourceId }), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  if (!resourceId) {
    return <NoteOpenFailure />;
  }
  if (error) {
    return <NoteOpenFailure subTitle={parseErrorMessage(error)} />;
  }
  if (loading && !noteInfoDisplay) {
    return <NoteInfoLoading />;
  }
  if (!noteInfoDisplay) {
    return <NoteOpenFailure subTitle="笔记信息为空，请稍后重试" />;
  }

  return (
    <NoteWorkspace
      key={resourceId}
      resourceId={resourceId}
      noteInfoDisplay={noteInfoDisplay}
      onRefreshNoteInfo={refresh}
    />
  );
}

export default NoteView;
