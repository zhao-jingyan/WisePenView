import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useDriveRefreshVersion } from '@/components/business/Drive/driveRefresh';
import { useDriveService, useNoteService } from '@/domains';
import { normalizeResourceKind, RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { useApi } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';

import { loadSidebarNotes } from './sidebarNoteLoader';
import SidebarNotesView from './SidebarNotesView';

interface NotesTabProps {
  active: boolean;
}

function NotesTab({ active }: NotesTabProps) {
  const { t } = useTranslation('shell');
  const driveService = useDriveService();
  const noteService = useNoteService();
  const openResource = useOpenResource();
  const { resourceId, resourceType } = useParams<{ resourceId?: string; resourceType?: string }>();
  const refreshVersion = useDriveRefreshVersion();
  const { data, loading, hasError } = useApi(() => loadSidebarNotes(driveService, noteService), {
    ready: active,
    refreshDeps: [driveService, noteService, refreshVersion],
    getErrorMessage: () => t('sidebar.noteLoadFailed'),
  });

  return (
    <SidebarNotesView
      notes={data?.notes ?? []}
      selectedNoteId={
        normalizeResourceKind(resourceType) === RESOURCE_KIND.NOTE ? resourceId : undefined
      }
      loading={loading}
      hasError={hasError}
      onOpenNote={(note) => {
        openResource({
          resourceId: note.resourceId,
          resourceType: RESOURCE_KIND.NOTE,
          resourceName: note.title,
          driveLocation: data?.location,
        });
      }}
    />
  );
}

NotesTab.displayName = 'NotesTab';

export default NotesTab;
