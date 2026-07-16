import type { Model } from '@/components/ChatPanel/index.type';
import { Spin } from '@/components/Feedback';
import ProviderLogo from '@/components/Icons/ProviderLogo';
import type { WisePenUIMessage } from '@/domains/Chat';
import { Button, toast } from '@heroui/react';
import { useInterval } from 'ahooks';
import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import clsx from 'clsx';
import { Check, Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import inputStyles from '../../ChatInput/style.module.less';
import styles from './AiMessage.module.less';
import MessageContent from './MessageContent';
import ThinkingBlock from './ThinkingBlock';
import ToolCallBlock from './ToolCallBlock';

const LOADING_HINTS = ['正在生成回复...', '请稍等片刻...', '正在组织答案...'];
const LOADING_HINT_SWITCH_MS = 2000;
const MESSAGE_ACTION_ICON_SIZE = 17;

interface AiMessageProps {
  message: WisePenUIMessage;
  model: Model | null;
  streaming: boolean;
}

function AiMessage({ message, model, streaming }: AiMessageProps) {
  const [copied, setCopied] = useState(false);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);
  const textContent = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('');
  const hasRenderablePart = message.parts.some(
    (part) => isTextUIPart(part) || isReasoningUIPart(part) || isToolUIPart(part)
  );
  const showLoadingIndicator = streaming && !hasRenderablePart;
  const displayProvider = model?.provider || 'openai';
  const displayModelName = model?.name || 'AI 助手';

  useInterval(
    () => {
      setLoadingHintIndex((prev) => (prev + 1) % LOADING_HINTS.length);
    },
    showLoadingIndicator ? LOADING_HINT_SWITCH_MS : undefined
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      toast.success('复制成功');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.danger('复制失败');
    }
  };

  return (
    <div className={styles.aiRow}>
      <div className={styles.contentCol}>
        <div className={styles.modelMeta}>
          <ProviderLogo provider={displayProvider} size={16} className={styles.modelLogo} />
          <span className={styles.modelName}>{displayModelName}</span>
        </div>

        {message.parts.map((part, index) => {
          const key = isToolUIPart(part) ? part.toolCallId : `${part.type}-${index}`;
          if (isTextUIPart(part)) {
            return (
              <div key={key} className={styles.bubble}>
                <MessageContent content={part.text} renderAsMarkdown />
              </div>
            );
          }
          if (isReasoningUIPart(part)) {
            return (
              <ThinkingBlock key={key} content={part.text} loading={part.state === 'streaming'} />
            );
          }
          if (isToolUIPart(part)) return <ToolCallBlock key={key} part={part} />;
          if (part.type === 'step-start') return null;
          return null;
        })}

        {showLoadingIndicator ? (
          <span className={styles.loadingHint}>
            <span className={styles.loadingHintIcon} aria-hidden="true">
              <Spin size="small" />
            </span>
            <span key={loadingHintIndex} className={styles.loadingHintText}>
              {LOADING_HINTS[loadingHintIndex]}
            </span>
          </span>
        ) : null}

        {!streaming && textContent ? (
          <div className={styles.actions}>
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              className={clsx(
                inputStyles.toolbarCircleBtn,
                styles.actionBtn,
                copied && styles.actionBtnCopied
              )}
              onPress={handleCopy}
              aria-label="复制"
            >
              {copied ? (
                <Check size={MESSAGE_ACTION_ICON_SIZE} />
              ) : (
                <Copy size={MESSAGE_ACTION_ICON_SIZE} />
              )}
            </Button>
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              className={clsx(inputStyles.toolbarCircleBtn, styles.actionBtn)}
              aria-label="点赞"
            >
              <ThumbsUp size={MESSAGE_ACTION_ICON_SIZE} />
            </Button>
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              className={clsx(inputStyles.toolbarCircleBtn, styles.actionBtn)}
              aria-label="点踩"
            >
              <ThumbsDown size={MESSAGE_ACTION_ICON_SIZE} />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AiMessage;
