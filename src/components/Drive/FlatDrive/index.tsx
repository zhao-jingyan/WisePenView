import React, { useState } from 'react';
import FileList from './FileList';
import FileFilter from './FileFilter';
import { TAG_QUERY_LOGIC_MODE, RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/services/Resource';
import type { FileFilterValue } from './FileFilter/index.type';
import type { FlatDriveProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_FILTER: FileFilterValue = {
  tagIds: [],
  tagNames: [],
  tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.OR,
  sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
  sortDir: RESOURCE_SORT_DIR.DESC,
};

const FlatDrive: React.FC<FlatDriveProps> = ({ groupId }) => {
  const [filter, setFilter] = useState<FileFilterValue>(DEFAULT_FILTER);

  return (
    <div className={styles.wrapper}>
      <section className={styles.filterSection}>
        <FileFilter groupId={groupId} value={filter} onChange={setFilter} />
      </section>
      <main className={styles.listArea}>
        <FileList groupId={groupId} filter={filter} />
      </main>
    </div>
  );
};

export default FlatDrive;
