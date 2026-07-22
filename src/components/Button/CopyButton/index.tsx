import AppIconButton from '@/components/Button/AppIconButton';
import { copyText } from '@/utils/browser/copyText';
import { toast } from '@heroui/react';
import clsx from 'clsx';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import type { CopyButtonProps } from './index.type';
import styles from './style.module.less';

const ICON_SIZE = 17;

function CopyButton({ text, label = '复制', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!(await copyText(text))) {
      toast.danger('复制失败');
      return;
    }

    toast.success('复制成功');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AppIconButton
      icon={copied ? <Check size={ICON_SIZE} /> : <Copy size={ICON_SIZE} />}
      label={copied ? '已复制' : label}
      className={clsx(styles.copyButton, copied && styles.copyButtonCopied, className)}
      onPress={() => void handleCopy()}
    />
  );
}

export default CopyButton;
