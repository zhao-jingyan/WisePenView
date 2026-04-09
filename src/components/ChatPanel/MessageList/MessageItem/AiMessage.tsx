import React from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { Button } from 'antd';
import { LogoFactory } from '../../ModelSelector';
import MessageContent from './MessageContent';
import ThinkingBlock from './ThinkingBlock';
import styles from './AiMessage.module.less';
import type { Message } from '@/components/ChatPanel/index.type';
import { useAppMessage } from '@/hooks/useAppMessage';

const AiMessage: React.FC<{ message: Message }> = ({ message }) => {
  const hasReasoning = message.reasoningContent !== undefined;
  const messageApi = useAppMessage();
  const [copied, setCopied] = React.useState(false);
  const displayProvider = message.meta?.provider || 'openai';
  const displayModelName = message.meta?.modelName || message.meta?.modelId || 'AI 助手';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '');
      messageApi.success('复制成功');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      messageApi.error('复制失败');
    }
  };

  return (
    <div className={styles.aiRow}>
      {/* 头像 */}
      <div className={styles.avatarCol}>
        <LogoFactory provider={displayProvider} size={28} />
      </div>

      {/* 内容 */}
      <div className={styles.contentCol}>
        <div className={styles.modelMeta}>
          <span className={styles.modelName}>{displayModelName}</span>
        </div>
        {/* 思考过程块 */}
        {hasReasoning && (
          <ThinkingBlock
            content={message.reasoningContent || ''}
            duration={message.meta?.usage?.totalTime}
            // 如果消息还在 loading 且正文没开始，说明正在思考中
            loading={message.loading && !message.content}
          />
        )}
        {/* 正文内容 */}
        {/* 只有当正文有内容，或者没有思考过程时（避免空白占位），才渲染正文 */}
        {(message.content || !hasReasoning) && (
          <div className={styles.bubble}>
            <MessageContent content={message.content} renderAsMarkdown />
          </div>
        )}

        {/* 底部操作栏 (非 Loading 时显示) */}
        {!message.loading && (
          <div className={styles.actions}>
            {/* 系统当前不支持点赞 */}
            {/* <Button type="text" shape="circle" size="small" className={styles.actionBtn}>
              <LuThumbsUp size={14} />
            </Button> */}
            {/* 系统当前不支持点踩 */}
            {/* <Button type="text" shape="circle" size="small" className={styles.actionBtn}>
              <LuThumbsDown size={14} />
            </Button> */}
            {/* 系统当前不支持重新生成 */}
            {/* <Button type="text" shape="circle" size="small" className={styles.actionBtn}>
              <LuRotateCw size={14} />
            </Button> */}
            <Button
              type="text"
              shape="circle"
              size="small"
              className={`${styles.actionBtn} ${copied ? styles.actionBtnCopied : ''}`}
              icon={copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
              onClick={handleCopy}
              title="复制"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AiMessage;
