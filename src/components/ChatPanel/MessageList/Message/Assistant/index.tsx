import CopyButton from '@/components/Button/CopyButton';
import type { Model } from '@/components/ChatPanel/index.type';
import { Spin } from '@/components/Feedback';
import ProviderLogo from '@/components/Icons/ProviderLogo';
import type { WisePenUIMessage } from '@/domains/Chat';
import { useInterval } from 'ahooks';
import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import { useState } from 'react';
import MessageContent from '../Content';
import ReasoningBlock from './ReasoningBlock';
import ToolCallBlock from './ToolCallBlock';
import styles from './style.module.less';

const LOADING_HINTS = ['正在生成回复...', '请稍等片刻...', '正在组织答案...'];
const LOADING_HINT_SWITCH_MS = 2000;

interface AssistantMessageProps {
  message: WisePenUIMessage;
  model: Model | null;
  streaming: boolean;
}

function AssistantMessage({ message, model, streaming }: AssistantMessageProps) {
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
    () => setLoadingHintIndex((index) => (index + 1) % LOADING_HINTS.length),
    showLoadingIndicator ? LOADING_HINT_SWITCH_MS : undefined
  );

  return (
    <div className={styles.row}>
      <div className={styles.content}>
        <div className={styles.modelMeta}>
          <ProviderLogo provider={displayProvider} size={16} className={styles.modelLogo} />
          <span className={styles.modelName}>{displayModelName}</span>
        </div>

        {message.parts.map((part, index) => {
          const key = isToolUIPart(part) ? part.toolCallId : `${part.type}-${index}`;
          if (isTextUIPart(part)) {
            return (
              <div key={key} className={styles.text}>
                <MessageContent
                  content={part.text}
                  markdown
                  streaming={streaming && part.state !== 'done'}
                />
              </div>
            );
          }
          if (isReasoningUIPart(part)) {
            return (
              <ReasoningBlock key={key} content={part.text} loading={part.state === 'streaming'} />
            );
          }
          if (isToolUIPart(part)) return <ToolCallBlock key={key} part={part} />;
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
            <CopyButton text={textContent} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AssistantMessage;
