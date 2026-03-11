import React from 'react';
import { Link } from 'react-router-dom';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { RiArrowLeftLine } from 'react-icons/ri';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

import styles from './style.module.less';

const Editor: React.FC = () => {
  const editor = useCreateBlockNote({
    trailingBlock: false,
  });

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <Link to="/app/drive" className={styles.backLink}>
          <RiArrowLeftLine size={18} />
          <span>返回云盘</span>
        </Link>
      </header>
      <div className={styles.editorWrapper}>
        <BlockNoteView editor={editor} theme="light" />
      </div>
    </div>
  );
};

export default Editor;
