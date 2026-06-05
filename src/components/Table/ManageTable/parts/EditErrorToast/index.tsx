import { Button } from '@heroui/react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { joinClassNames } from '../../../shared/TableBase/cellAlign';
import type { TableEditErrorToastProps } from './index.type';
import styles from './style.module.less';

function TableEditErrorToast({ message, onDismiss, className }: TableEditErrorToastProps) {
  const { t } = useTranslation('table');

  return (
    <div className={joinClassNames(styles.toast, className)} role="alert">
      <div className={styles.message}>{message}</div>
      {onDismiss ? (
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label={t('aria.dismissError')}
          className={styles.dismissButton}
          onPress={onDismiss}
        >
          <X size={16} />
        </Button>
      ) : null}
    </div>
  );
}

export default TableEditErrorToast;
