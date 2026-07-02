import EntryIcon from '@/components/EntryIcon';
import { ResultState, Spin } from '@/components/Feedback';
import IconText from '@/components/IconText';
import { useNoteService, useResourceService, useUserService } from '@/domains';
import type {
  DrawIoLatestSnapshotData,
  NoteInfoDisplayData,
  NoteVersionListPage,
} from '@/domains/Note';
import { useResourceDisplayName } from '@/hooks/useResourceDisplayName';
import { useWorkspaceLayoutConfig } from '@/layouts/Workspace/WorkspaceOutletContext';
import { parseErrorMessage } from '@/utils/error';
import {
  buildWorkspaceResourcePath,
  RESOURCE_EDITOR_TYPE,
} from '@/utils/navigation/workspaceRoute';
import { Button, Input, Modal, TextField, toast } from '@heroui/react';
import { useEventListener, useRequest, useUnmount, useUpdateEffect } from 'ahooks';
import { Copy, History, Save } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './style.module.less';

const DEFAULT_DRAWIO_EMBED_URL = 'https://embed.diagrams.net/';

const EMPTY_DRAWIO_XML = `<mxfile host="WisePen"><diagram name="Page-1"><mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;

type SaveState = 'saved' | 'dirty' | 'saving' | 'failed';

interface DrawioViewProps {
  resourceId?: string;
}

interface DrawioViewData {
  noteInfoDisplay: NoteInfoDisplayData;
  snapshot: DrawIoLatestSnapshotData;
  initialXml: string;
}

interface DrawioToolbarTitleProps {
  resourceId: string;
  fallbackTitle?: string;
}

interface DrawioViewConnectedProps {
  resourceId: string;
  data: DrawioViewData;
}

interface DrawioMessage {
  event?: string;
  xml?: string;
  message?: string;
}

function decodeBase64Utf8(value?: string | null): string {
  if (!value) return EMPTY_DRAWIO_XML;
  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readDrawioMessage(raw: unknown): DrawioMessage | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as DrawioMessage;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function extractPlainText(xml: string): string | undefined {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const values = Array.from(doc.querySelectorAll('mxCell[value]'))
      .map((cell) => cell.getAttribute('value') ?? '')
      .filter(Boolean)
      .map((value) => new DOMParser().parseFromString(value, 'text/html').body.textContent ?? '')
      .map((value) => value.trim())
      .filter(Boolean);
    return values.length > 0 ? values.join(' ') : undefined;
  } catch {
    return undefined;
  }
}

function hasAction(actions: unknown, action: string): boolean {
  return Array.isArray(actions) && actions.some((item) => item === action);
}

function readDrawioEmbedUrl(): URL {
  return new URL(DEFAULT_DRAWIO_EMBED_URL, window.location.origin);
}

function readDrawioEmbedOrigin(): string {
  return readDrawioEmbedUrl().origin;
}

function buildDrawioUrl(canEdit: boolean): string {
  const url = readDrawioEmbedUrl();
  url.searchParams.set('embed', '1');
  url.searchParams.set('proto', 'json');
  url.searchParams.set('spin', '1');
  url.searchParams.set('ui', 'min');
  url.searchParams.set('libraries', '1');
  url.searchParams.set('noExitBtn', '1');
  url.searchParams.set('saveAndExit', '0');
  if (!canEdit) {
    url.searchParams.set('noSaveBtn', '1');
  }
  return url.toString();
}

function DrawioToolbarTitle({ resourceId, fallbackTitle }: DrawioToolbarTitleProps) {
  const title = useResourceDisplayName(resourceId, fallbackTitle, '未命名图表');

  return (
    <IconText
      className={styles.toolbarTitleText}
      icon={<EntryIcon entryType="resource" resourceType="DRAWIO" />}
      iconSize={18}
      gap="var(--space-sm)"
      ellipsis
    >
      {title}
    </IconText>
  );
}

function DrawioLayoutConfig({
  children,
  resourceId,
  noteInfoDisplay,
  extra,
}: {
  children: ReactNode;
  resourceId?: string;
  noteInfoDisplay?: NoteInfoDisplayData;
  extra?: ReactNode;
}) {
  const frameConfig = useMemo(
    () => ({
      className: styles.container,
      header:
        resourceId && noteInfoDisplay
          ? {
              inlineTitle: (
                <DrawioToolbarTitle
                  resourceId={resourceId}
                  fallbackTitle={noteInfoDisplay.noteTitle}
                />
              ),
              statsResourceId: resourceId,
              extra,
            }
          : {},
      footer: resourceId ? { resourceId } : null,
    }),
    [extra, noteInfoDisplay, resourceId]
  );
  useWorkspaceLayoutConfig(frameConfig);

  return <>{children}</>;
}

function SaveStatusText({ state }: { state: SaveState }) {
  const text =
    state === 'dirty'
      ? '未保存'
      : state === 'saving'
        ? '保存中'
        : state === 'failed'
          ? '保存失败'
          : '已保存';
  return <span className={styles.saveStatus}>{text}</span>;
}

function VersionModal({
  open,
  loading,
  error,
  versions,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error?: unknown;
  versions?: NoteVersionListPage;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={open} onOpenChange={(visible) => !visible && onClose()}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>版本记录</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {loading ? (
                <div className={styles.modalState}>
                  <Spin />
                  <span>正在加载版本记录...</span>
                </div>
              ) : error ? (
                <ResultState
                  status="warning"
                  title="版本记录加载失败"
                  subTitle={parseErrorMessage(error)}
                />
              ) : !versions || versions.list.length === 0 ? (
                <ResultState status="info" title="暂无版本记录" />
              ) : (
                <div className={styles.versionList}>
                  {versions.list.map((item) => (
                    <div key={`${item.version}-${item.type}`} className={styles.versionRow}>
                      <span>v{item.version ?? '-'}</span>
                      <span>{item.type ?? '-'}</span>
                      <span>{item.createdBy?.join(', ') || '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                关闭
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function CopyModal({
  open,
  name,
  loading,
  onNameChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  loading: boolean;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal isOpen={open} onOpenChange={(visible) => !visible && onClose()}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>复制 Draw.io 图</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <TextField aria-label="复制后的名称" value={name} onChange={onNameChange}>
                <Input
                  placeholder="请输入名称"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onConfirm();
                    }
                  }}
                />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={loading}>
                取消
              </Button>
              <Button variant="primary" onPress={onConfirm} isDisabled={loading || !name.trim()}>
                复制
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function DrawioViewConnected({ resourceId, data }: DrawioViewConnectedProps) {
  const { noteInfoDisplay, snapshot, initialXml } = data;
  const noteService = useNoteService();
  const navigate = useNavigate();
  const userService = useUserService();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialVersion = Math.max(noteInfoDisplay.version ?? 0, snapshot.version ?? 0);
  const currentVersionRef = useRef(initialVersion);
  const lastSavedXmlRef = useRef(initialXml);
  const exportTimerRef = useRef<number | null>(null);
  const pendingExportForSaveRef = useRef(false);
  const [currentVersion, setCurrentVersion] = useState(initialVersion);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [editorReady, setEditorReady] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyName, setCopyName] = useState('');
  const [versionOpen, setVersionOpen] = useState(false);
  const canEdit = noteInfoDisplay.canCollaborativeEdit;
  const canFork = hasAction(noteInfoDisplay.resourceInfo?.currentActions, 'FORK');
  const canViewVersions = Boolean(noteInfoDisplay.ownerId);
  const title = useResourceDisplayName(resourceId, noteInfoDisplay.noteTitle, '未命名图表');
  const drawioUrl = useMemo(() => buildDrawioUrl(canEdit), [canEdit]);
  const drawioOrigin = readDrawioEmbedOrigin();

  const { data: currentUser } = useRequest(() => userService.getUserInfo(), {
    ready: Boolean(noteInfoDisplay.ownerId),
    refreshDeps: [noteInfoDisplay.ownerId],
  });

  const postToEditor = useCallback(
    (message: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), drawioOrigin);
    },
    [drawioOrigin]
  );

  const clearExportTimer = useCallback(() => {
    if (exportTimerRef.current !== null) {
      window.clearTimeout(exportTimerRef.current);
      exportTimerRef.current = null;
    }
  }, []);

  const persistXml = useCallback(
    async (xml: string) => {
      if (!canEdit) {
        toast.danger('你没有编辑权限');
        return;
      }

      const nextVersion = currentVersionRef.current + 1;
      setSaveState('saving');
      try {
        await noteService.saveDrawIoSnapshot({
          resourceId,
          version: nextVersion,
          xml,
          plainText: extractPlainText(xml),
        });
        currentVersionRef.current = nextVersion;
        lastSavedXmlRef.current = xml;
        setCurrentVersion(nextVersion);
        setSaveState('saved');
        postToEditor({ action: 'status', message: '已保存', modified: false });
        toast.success('已保存');
      } catch (err) {
        setSaveState('failed');
        postToEditor({ action: 'status', message: '保存失败', modified: true });
        toast.danger(parseErrorMessage(err));
      }
    },
    [canEdit, noteService, postToEditor, resourceId]
  );

  const requestEditorExport = useCallback(() => {
    if (!canEdit) {
      toast.danger('你没有编辑权限');
      return;
    }
    if (!editorLoaded) {
      toast.info('编辑器未就绪');
      return;
    }
    if (saveState === 'saved') {
      toast.info('当前内容已保存');
      return;
    }

    pendingExportForSaveRef.current = true;
    setSaveState('saving');
    postToEditor({ action: 'export', format: 'xml' });
    clearExportTimer();
    exportTimerRef.current = window.setTimeout(() => {
      pendingExportForSaveRef.current = false;
      setSaveState('failed');
      toast.danger('保存失败，请稍后重试');
    }, 10000);
  }, [canEdit, clearExportTimer, editorLoaded, postToEditor, saveState]);

  useUpdateEffect(() => {
    currentVersionRef.current = Math.max(noteInfoDisplay.version ?? 0, snapshot.version ?? 0);
    setCurrentVersion(currentVersionRef.current);
    lastSavedXmlRef.current = initialXml;
    setSaveState('saved');
    setEditorReady(false);
    setEditorLoaded(false);
  }, [initialXml, noteInfoDisplay.version, resourceId, snapshot.version]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.origin !== drawioOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      const message = readDrawioMessage(event.data);
      if (!message?.event) return;

      if (message.event === 'init') {
        setEditorReady(true);
        postToEditor({
          action: 'load',
          autosave: canEdit ? 1 : 0,
          modified: false,
          noExitBtn: 1,
          noSaveBtn: canEdit ? 0 : 1,
          saveAndExit: 0,
          title,
          xml: initialXml,
        });
        return;
      }

      if (message.event === 'load') {
        setEditorLoaded(true);
        setSaveState('saved');
        return;
      }

      if (message.event === 'autosave' && canEdit && typeof message.xml === 'string') {
        if (message.xml !== lastSavedXmlRef.current && saveState !== 'saving') {
          setSaveState('dirty');
        }
        return;
      }

      if (message.event === 'save' && typeof message.xml === 'string') {
        void persistXml(message.xml);
        return;
      }

      if (message.event === 'export' && pendingExportForSaveRef.current) {
        pendingExportForSaveRef.current = false;
        clearExportTimer();
        if (typeof message.xml === 'string') {
          void persistXml(message.xml);
        } else {
          setSaveState('failed');
          toast.danger('保存失败，请稍后重试');
        }
        return;
      }

      if (message.event === 'error') {
        toast.danger(message.message || 'Draw.io 编辑器加载失败');
      }
    },
    [
      canEdit,
      clearExportTimer,
      drawioOrigin,
      initialXml,
      persistXml,
      postToEditor,
      saveState,
      title,
    ]
  );

  useEventListener('message', handleMessage);

  useUnmount(clearExportTimer);

  const {
    data: versions,
    error: versionsError,
    loading: versionsLoading,
    run: runLoadVersions,
  } = useRequest(() => noteService.listNoteVersions({ resourceId, page: 1, size: 20 }), {
    manual: true,
  });

  const { loading: copyLoading, run: runCopy } = useRequest(
    async () => {
      const trimmed = copyName.trim();
      const res = await noteService.forkNote({
        resourceId,
        forkedResourceVersion: currentVersion,
        forkedResourceName: trimmed,
      });
      if (!res.resourceId) {
        throw new Error('复制结果缺少资源 ID');
      }
      return res.resourceId;
    },
    {
      manual: true,
      onSuccess: (newResourceId) => {
        setCopyOpen(false);
        toast.success('复制成功');
        navigate(buildWorkspaceResourcePath(RESOURCE_EDITOR_TYPE.DRAWIO, newResourceId));
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleOpenCopy = () => {
    setCopyName(`${title} 副本`);
    setCopyOpen(true);
  };

  const handleOpenVersions = () => {
    setVersionOpen(true);
    runLoadVersions();
  };

  const headerExtra = (
    <div className={styles.headerExtra}>
      <span className={styles.versionBadge}>v{currentVersion}</span>
      <SaveStatusText state={saveState} />
      {currentUser?.id === noteInfoDisplay.ownerId && canViewVersions ? (
        <Button size="sm" variant="secondary" onPress={handleOpenVersions} aria-label="版本记录">
          <History size={16} />
          <span>版本</span>
        </Button>
      ) : null}
      {canFork ? (
        <Button size="sm" variant="secondary" onPress={handleOpenCopy} aria-label="复制">
          <Copy size={16} />
          <span>复制</span>
        </Button>
      ) : null}
      {canEdit ? (
        <Button
          size="sm"
          variant="primary"
          isDisabled={!editorLoaded || saveState === 'saved' || saveState === 'saving'}
          onPress={requestEditorExport}
          aria-label="保存"
        >
          <Save size={16} />
          <span>{saveState === 'saving' ? '保存中' : '保存'}</span>
        </Button>
      ) : null}
    </div>
  );

  return (
    <DrawioLayoutConfig
      resourceId={resourceId}
      noteInfoDisplay={noteInfoDisplay}
      extra={headerExtra}
    >
      <div className={styles.content}>
        <iframe
          key={`${resourceId}-${canEdit ? 'edit' : 'view'}`}
          ref={iframeRef}
          className={styles.iframe}
          src={drawioUrl}
          title={title}
          allow="clipboard-read; clipboard-write"
        />
        {(!editorReady || !editorLoaded) && (
          <div className={styles.loadingOverlay} aria-busy="true" aria-live="polite">
            <Spin size="large" />
            <span>正在加载 Draw.io 编辑器...</span>
          </div>
        )}
      </div>
      <CopyModal
        open={copyOpen}
        name={copyName}
        loading={copyLoading}
        onNameChange={setCopyName}
        onClose={() => setCopyOpen(false)}
        onConfirm={runCopy}
      />
      <VersionModal
        open={versionOpen}
        loading={versionsLoading}
        error={versionsError}
        versions={versions}
        onClose={() => setVersionOpen(false)}
      />
    </DrawioLayoutConfig>
  );
}

function DrawioView({ resourceId }: DrawioViewProps) {
  const noteService = useNoteService();
  const resourceService = useResourceService();
  const {
    data,
    error,
    loading: loadingDrawio,
  } = useRequest(
    async () => {
      const [noteInfoDisplay, snapshot] = await Promise.all([
        noteService.getNoteInfoDisplay({ resourceId: resourceId as string }),
        noteService.getDrawIoLatestSnapshot({ resourceId: resourceId as string }),
      ]);

      return {
        noteInfoDisplay,
        snapshot,
        initialXml: decodeBase64Utf8(snapshot.fullSnapshot),
      };
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  useRequest(() => resourceService.interactRead(resourceId as string), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  if (!resourceId) {
    return (
      <DrawioLayoutConfig>
        <div className={styles.middleOverlay}>
          <ResultState
            status="warning"
            title="无法打开 Draw.io 图"
            extra={
              <Link to="/app/drive">
                <Button variant="secondary">返回云盘</Button>
              </Link>
            }
          />
        </div>
      </DrawioLayoutConfig>
    );
  }

  if (error) {
    return (
      <DrawioLayoutConfig resourceId={resourceId}>
        <div className={styles.middleOverlay}>
          <ResultState
            status="warning"
            title="Draw.io 图加载失败"
            subTitle={parseErrorMessage(error)}
            extra={
              <Link to="/app/drive">
                <Button variant="secondary">返回云盘</Button>
              </Link>
            }
          />
        </div>
      </DrawioLayoutConfig>
    );
  }

  if (loadingDrawio && !data) {
    return (
      <DrawioLayoutConfig resourceId={resourceId}>
        <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
          <div className={styles.middleOverlayLoading}>
            <Spin size="large" />
            <span className={styles.middleOverlayText}>正在加载 Draw.io 图...</span>
          </div>
        </div>
      </DrawioLayoutConfig>
    );
  }

  if (!data) {
    return (
      <DrawioLayoutConfig resourceId={resourceId}>
        <div className={styles.middleOverlay}>
          <ResultState status="warning" title="Draw.io 图信息为空" />
        </div>
      </DrawioLayoutConfig>
    );
  }

  const resourceType = data.noteInfoDisplay.resourceInfo?.resourceType?.trim().toLowerCase();
  if (resourceType !== RESOURCE_EDITOR_TYPE.DRAWIO) {
    return (
      <DrawioLayoutConfig resourceId={resourceId}>
        <div className={styles.middleOverlay}>
          <ResultState status="warning" title="当前资源不是 Draw.io 图" />
        </div>
      </DrawioLayoutConfig>
    );
  }

  return <DrawioViewConnected resourceId={resourceId} data={data} />;
}

export default DrawioView;
