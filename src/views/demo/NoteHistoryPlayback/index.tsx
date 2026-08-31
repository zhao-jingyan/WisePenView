import { AppIconButton } from '@/components/Button';
import CustomBlockNote from '@/components/Note/CustomBlockNote';
import { useNoteSession } from '@/domains/Note';
import { Slider } from '@heroui/react';
import { useInterval } from 'ahooks';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { NOTE_HISTORY_MOCK, NOTE_HISTORY_STATES, type HistoryContentSource } from './historyModel';
import styles from './style.module.less';

const PLAYBACK_INTERVAL = 550;
const LAST_VERSION_INDEX = NOTE_HISTORY_STATES.length - 1;
const EDITOR_PORTALS = {
  aiBulkActions: null,
  aiDiffControls: null,
  findBar: null,
};

function toScalar(value: number | number[]): number {
  return Array.isArray(value) ? (value[0] ?? 0) : value;
}

function getSourceLabel(source: HistoryContentSource | null): string {
  if (source === 'human') return '林予安 · 人工编辑';
  if (source === 'ai') return 'AI 助手 · 内容生成';
  return '尚未开始编辑';
}

function getSourceIcon(source: HistoryContentSource | null) {
  if (source === 'human') return <UserRound size={16} aria-hidden="true" />;
  if (source === 'ai') return <Sparkles size={16} aria-hidden="true" />;
  return <FileText size={16} aria-hidden="true" />;
}

function getPercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function NoteHistoryPlayback() {
  const [versionIndex, setVersionIndex] = useState(LAST_VERSION_INDEX);
  const [isPlaying, setIsPlaying] = useState(false);
  const { doc, provider } = useNoteSession('demo-note-history-playback', {
    localOnly: true,
  });
  const currentState = NOTE_HISTORY_STATES[versionIndex];
  const humanPercentage = getPercentage(
    currentState.humanCharacterCount,
    currentState.characterCount
  );
  const aiPercentage = getPercentage(currentState.aiCharacterCount, currentState.characterCount);

  useInterval(
    () => {
      if (versionIndex >= LAST_VERSION_INDEX) {
        setIsPlaying(false);
        return;
      }
      setVersionIndex((currentIndex) => Math.min(LAST_VERSION_INDEX, currentIndex + 1));
    },
    isPlaying ? PLAYBACK_INTERVAL : undefined
  );

  const handleTogglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (versionIndex === LAST_VERSION_INDEX) {
      setVersionIndex(0);
    }
    setIsPlaying(true);
  };

  const handleVersionChange = (value: number | number[]) => {
    setIsPlaying(false);
    setVersionIndex(Math.round(toScalar(value)));
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    setVersionIndex((currentIndex) => Math.max(0, currentIndex - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setVersionIndex((currentIndex) => Math.min(LAST_VERSION_INDEX, currentIndex + 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setVersionIndex(0);
  };

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <FileText size={18} aria-hidden="true" />
          </div>
          <div>
            <div className={styles.eyebrow}>WISEPEN LAB</div>
            <div className={styles.pageTitle}>笔记创作回放</div>
          </div>
        </div>
      </header>

      <section className={styles.workspace} aria-label="笔记版本历史">
        <div className={styles.documentHeader}>
          <div className={styles.documentIdentity}>
            <h1>{NOTE_HISTORY_MOCK.title}</h1>
            <div className={styles.documentMeta}>
              <span>{NOTE_HISTORY_MOCK.owner}</span>
              <span aria-hidden="true">·</span>
              <span>{NOTE_HISTORY_MOCK.startedAt}</span>
              <span aria-hidden="true">·</span>
              <span>{NOTE_HISTORY_STATES.length} 个版本</span>
            </div>
          </div>
          <div className={styles.summaryAndLegend}>
            <div className={styles.documentStats} aria-label="当前版本内容占比">
              <span>{currentState.characterCount} 字</span>
              <span>人工 {humanPercentage}%</span>
              <span>AI {aiPercentage}%</span>
            </div>
            <div className={styles.legend}>
              <span className={styles.humanLegend}>
                <UserRound size={14} aria-hidden="true" />
                人工写作
              </span>
              <span className={styles.aiLegend}>
                <Bot size={14} aria-hidden="true" />
                AI 写作
              </span>
            </div>
          </div>
        </div>

        <div className={styles.editorFrame}>
          <CustomBlockNote
            resourceId="demo-note-history-playback"
            collaboration={{
              doc,
              provider,
              user: { name: '版本回放', color: 'var(--accent)' },
              ready: true,
            }}
            state={{ readOnly: true, blockLocalDocWrites: false }}
            aiDiffPreview={currentState.preview}
            portalContainers={EDITOR_PORTALS}
            onAskAi={() => undefined}
          />
        </div>

        <div className={styles.timelinePanel}>
          <div className={styles.versionSummary}>
            <div
              className={styles.actorIcon}
              data-source={currentState.actor ?? 'idle'}
              aria-hidden="true"
            >
              {getSourceIcon(currentState.actor)}
            </div>
            <div className={styles.versionText}>
              <div className={styles.versionTitleRow}>
                <strong>{currentState.summary}</strong>
                <span>
                  版本 {versionIndex + 1} / {NOTE_HISTORY_STATES.length}
                </span>
              </div>
              <div className={styles.versionByline}>
                <span>{currentState.time}</span>
                <span aria-hidden="true">·</span>
                <span>{getSourceLabel(currentState.actor)}</span>
              </div>
            </div>
            <div className={styles.deltaStats} aria-label="当前版本变更字数">
              <span className={styles.insertions}>+{currentState.insertedCharacters}</span>
              <span className={styles.deletions}>-{currentState.deletedCharacters}</span>
            </div>
          </div>

          <div className={styles.playbackRow}>
            <div className={styles.playbackControls}>
              <AppIconButton
                size="sm"
                label="回到开头"
                icon={<RotateCcw size={16} aria-hidden="true" />}
                isDisabled={versionIndex === 0}
                tooltip={{ placement: 'top' }}
                onPress={handleReset}
              />
              <AppIconButton
                size="sm"
                label="上一个版本"
                icon={<ChevronLeft size={17} aria-hidden="true" />}
                isDisabled={versionIndex === 0}
                tooltip={{ placement: 'top' }}
                onPress={handleStepBackward}
              />
              <AppIconButton
                className={styles.playButton}
                variant="primary"
                label={isPlaying ? '暂停回放' : '播放版本'}
                icon={
                  isPlaying ? (
                    <Pause size={17} fill="currentColor" aria-hidden="true" />
                  ) : (
                    <Play size={17} fill="currentColor" aria-hidden="true" />
                  )
                }
                tooltip={{ placement: 'top' }}
                onPress={handleTogglePlayback}
              />
              <AppIconButton
                size="sm"
                label="下一个版本"
                icon={<ChevronRight size={17} aria-hidden="true" />}
                isDisabled={versionIndex === LAST_VERSION_INDEX}
                tooltip={{ placement: 'top' }}
                onPress={handleStepForward}
              />
            </div>

            <div className={styles.sliderWrap}>
              <Slider
                className={styles.timelineSlider}
                aria-label="版本时间轴"
                minValue={0}
                maxValue={LAST_VERSION_INDEX}
                step={1}
                value={versionIndex}
                onChange={handleVersionChange}
              >
                <Slider.Track className={styles.sliderTrack}>
                  <Slider.Fill className={styles.sliderFill} />
                  <Slider.Thumb className={styles.sliderThumb} />
                </Slider.Track>
                <Slider.Marks className={styles.sliderMarks} aria-hidden="true">
                  {NOTE_HISTORY_STATES.map((state, index) => (
                    <span
                      key={state.id}
                      className={index <= versionIndex ? styles.markPassed : styles.markPending}
                    />
                  ))}
                </Slider.Marks>
              </Slider>
              <div className={styles.timelineLabels} aria-hidden="true">
                <span>{NOTE_HISTORY_STATES[0].time}</span>
                <span>{currentState.time}</span>
                <span>{NOTE_HISTORY_STATES[LAST_VERSION_INDEX].time}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default NoteHistoryPlayback;
