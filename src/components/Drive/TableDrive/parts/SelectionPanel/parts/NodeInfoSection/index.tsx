import { getDriveNodeLabel } from '@/components/Drive/common/driveComponentModel';
import { Spin } from '@/components/Feedback';
import { useDocumentService, useNoteService } from '@/domains';
import {
  isDocumentEditorType,
  resolveResourceEditorType,
  RESOURCE_EDITOR_TYPE,
} from '@/utils/navigation/workspaceRoute';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';
import { buildNodeInfoFields } from './buildNodeInfoFields';
import type { NodeInfoSectionProps } from './index.type';
import styles from './style.module.less';

function NodeInfoSection({ selectedRow }: NodeInfoSectionProps) {
  const documentService = useDocumentService();
  const noteService = useNoteService();
  const node = selectedRow.node;

  const resourceId = node.type === 'resource' || node.type === 'link' ? node.resourceId : undefined;
  const resourceName = getDriveNodeLabel(node);

  const editorType = useMemo(() => {
    if (!resourceId) {
      return null;
    }
    return resolveResourceEditorType({
      resourceType:
        node.type === 'resource' || node.type === 'link' ? node.resourceType : undefined,
      resourceName,
    });
  }, [node, resourceId, resourceName]);

  const shouldFetchNoteInfo =
    Boolean(resourceId) &&
    (editorType === RESOURCE_EDITOR_TYPE.NOTE || editorType === RESOURCE_EDITOR_TYPE.DRAWIO);
  const shouldFetchDocInfo = Boolean(resourceId) && isDocumentEditorType(editorType ?? undefined);

  const { data: noteInfo, loading: isNoteInfoLoading } = useRequest(
    () => noteService.getNoteInfoDisplay({ resourceId: resourceId as string }),
    {
      ready: shouldFetchNoteInfo,
      refreshDeps: [resourceId],
    }
  );

  const { data: docInfo, loading: isDocInfoLoading } = useRequest(
    () => documentService.getDocInfo(resourceId as string),
    {
      ready: shouldFetchDocInfo,
      refreshDeps: [resourceId],
    }
  );

  const isLoading = shouldFetchNoteInfo
    ? isNoteInfoLoading
    : shouldFetchDocInfo
      ? isDocInfoLoading
      : false;

  const fields = useMemo(
    () =>
      buildNodeInfoFields({
        selectedRow,
        docInfo,
        noteInfo,
      }),
    [docInfo, noteInfo, selectedRow]
  );

  if (isLoading) {
    return (
      <div className={styles.loading} aria-busy="true" aria-label="正在加载文档信息">
        <Spin size="small" />
      </div>
    );
  }

  return (
    <dl className={styles.section}>
      {fields.map((field) => (
        <div key={field.id} className={styles.field}>
          <dt className={styles.fieldLabel}>{field.label}</dt>
          <dd className={field.muted ? styles.fieldValueMuted : styles.fieldValue}>
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default NodeInfoSection;
