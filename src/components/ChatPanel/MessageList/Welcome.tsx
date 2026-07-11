import { BarChart3, Bot, FileText, HelpCircle, List, type LucideIcon } from 'lucide-react';
import styles from './style.module.less';

interface WelcomeProps {
  onPromptClick?: (text: string) => void;
}

const SUGGESTED_PROMPTS: { icon: LucideIcon; label: string; text: string }[] = [
  { icon: FileText, label: '帮我写一份报告', text: '请帮我写一份课程报告的大纲' },
  { icon: List, label: '总结文档内容', text: '请帮我总结这份文档的主要内容' },
  { icon: HelpCircle, label: '解释一个概念', text: '请用通俗易懂的方式解释一下什么是机器学习' },
  { icon: BarChart3, label: '分析一组数据', text: '请帮我分析这组数据并给出改进建议' },
];

function Welcome({ onPromptClick }: WelcomeProps) {
  return (
    <div className={styles.welcomeWrapper}>
      <div className={styles.logoIcon}>
        <Bot aria-hidden="true" />
      </div>

      <div className={styles.title}>你好，我是 AI 助理小 W</div>

      <div className={styles.subtitle}>今天想做点什么？</div>

      <div className={styles.promptSection}>
        <div className={styles.promptChips}>
          {SUGGESTED_PROMPTS.map((prompt) => {
            const PromptIcon = prompt.icon;

            return (
              <button
                key={prompt.text}
                type="button"
                className={styles.promptChip}
                onClick={() => onPromptClick?.(prompt.text)}
              >
                <span className={styles.promptIcon}>
                  <PromptIcon aria-hidden="true" />
                </span>
                <span>{prompt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Welcome;
