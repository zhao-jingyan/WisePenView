import { ResultState } from '@/components/Feedback';
import {
  useWorkspaceLayoutConfig,
  type WorkspaceLayoutConfig,
} from '@/layouts/Workspace/WorkspaceOutletContext';
import {
  RESOURCE_EDITOR_TYPE,
  isDocumentEditorType,
  normalizeResourceEditorType,
} from '@/utils/navigation/workspaceRoute';
import { Button } from '@heroui/react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import NoteView from './note';
import DocumentPreview from './pdf';
import styles from './WorkspaceResourceView.module.less';

interface UnsupportedResourceProps {
  editorType?: string;
  resourceId?: string;
}

function UnsupportedResource({ editorType, resourceId }: UnsupportedResourceProps) {
  const frameConfig = useMemo<WorkspaceLayoutConfig>(() => ({ header: false }), []);
  useWorkspaceLayoutConfig(frameConfig);

  const readableType = editorType ? `当前类型：${editorType}` : undefined;

  return (
    <div className={styles.middleOverlay}>
      <div className={styles.middleOverlayInner}>
        <ResultState
          status="warning"
          title={resourceId ? '暂不支持打开该资源' : '无法打开资源'}
          subTitle={readableType}
          extra={
            <Link to="/app/drive">
              <Button variant="secondary">返回云盘</Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}

function WorkspaceResourceView() {
  const { editorType: rawEditorType, id } = useParams<{ editorType?: string; id?: string }>();
  const editorType = normalizeResourceEditorType(rawEditorType);

  if (!id || editorType == null || rawEditorType !== editorType) {
    return <UnsupportedResource editorType={rawEditorType} />;
  }

  if (editorType === RESOURCE_EDITOR_TYPE.NOTE) {
    return <NoteView resourceId={id} />;
  }

  if (isDocumentEditorType(editorType)) {
    return <DocumentPreview resourceId={id} />;
  }

  return <UnsupportedResource editorType={rawEditorType} resourceId={id} />;
}

export default WorkspaceResourceView;
