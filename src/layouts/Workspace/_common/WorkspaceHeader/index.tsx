import clsx from 'clsx';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { WorkspaceHeaderProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_FALLBACK_TO = '/app/drive';
const DEFAULT_BACK_LABEL = '返回';

function WorkspaceHeader({
  fallbackTo = DEFAULT_FALLBACK_TO,
  backLabel = DEFAULT_BACK_LABEL,
  hideBack = false,
  inlineTitle,
  extra,
  titleBlock,
  className,
}: WorkspaceHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate(fallbackTo, { replace: true });
  };

  return (
    <header className={clsx(styles.root, className)}>
      <div className={styles.bar}>
        <div className={styles.toolbar}>
          {!hideBack && (
            <button type="button" className={styles.backLink} onClick={handleBack}>
              <ArrowLeft size={18} aria-hidden="true" />
              {backLabel}
            </button>
          )}
          <div className={styles.toolbarMiddle}>
            {inlineTitle ? <div className={styles.inlineTitle}>{inlineTitle}</div> : null}
          </div>
          <div className={styles.toolbarEnd}>{extra}</div>
        </div>
      </div>
      {titleBlock ? (
        <div className={styles.titleBlock}>
          <div className={styles.titleBlockInner}>{titleBlock}</div>
        </div>
      ) : null}
    </header>
  );
}

export default WorkspaceHeader;
