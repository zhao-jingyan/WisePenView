import { DataTable, type DataTableColumn } from '@/components/Table';
import { WALLET_TRANSACTION_KIND, type WalletTransactionRecord } from '@/domains/Wallet';
import { formatCompactNumber } from '@/utils/format/formatNumber';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { Chip } from '@heroui/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo } from 'react';
import styles from './style.module.less';
import { isInflowKind, normalizeMaskDisplayText, TX_TABS, type TxTabKey } from './walletHelpers';

type WalletTransactionRow = WalletTransactionRecord & { key: string };

interface WalletTransactionTableProps {
  activeTab: TxTabKey;
  records: WalletTransactionRecord[];
  loading: boolean;
  flashFirstRow: boolean;
  showOperatorColumn: boolean;
  current: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onTabChange: (key: TxTabKey) => void;
}

function WalletTransactionTable({
  activeTab,
  records,
  loading,
  flashFirstRow,
  showOperatorColumn,
  current,
  total,
  pageSize,
  onPageChange,
  onTabChange,
}: WalletTransactionTableProps) {
  const dataSource = useMemo(
    () =>
      records.map((r) => ({
        ...r,
        key: String(r.traceId || r.time),
      })),
    [records]
  );

  const columns = useMemo<Array<DataTableColumn<WalletTransactionRow>>>(() => {
    const baseColumns: Array<DataTableColumn<WalletTransactionRow>> = [
      {
        id: 'time',
        label: '时间',
        width: 'lg',
        align: 'start',
        renderCell: (row) => (
          <DataTable.TextCell className={styles.timeCell}>
            {formatTimestampToDateTime(row.time) || '—'}
          </DataTable.TextCell>
        ),
      },
      {
        id: 'type',
        label: '类型',
        width: 'sm',
        align: 'start',
        renderCell: (row) => {
          const inflow = isInflowKind(row.type);
          return (
            <Chip
              className={styles.typeChip}
              color={inflow ? 'success' : 'danger'}
              size="md"
              variant="soft"
            >
              {inflow ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              <Chip.Label>{WALLET_TRANSACTION_KIND.getLabel(row.type)}</Chip.Label>
            </Chip>
          );
        },
      },
      {
        id: 'summary',
        label: '摘要 / 备注',
        width: 'fill',
        align: 'start',
        renderCell: (row) => (
          <div className={styles.summaryBlock}>
            <div className={styles.summaryMain}>{row.title || '—'}</div>
            <div className={styles.summarySub}>
              {row.subTitle ? normalizeMaskDisplayText(row.subTitle) : '—'}
            </div>
          </div>
        ),
      },
      {
        id: 'amount',
        label: '变动金额',
        width: 'md',
        align: 'end',
        renderCell: (row) => {
          const inflow = isInflowKind(row.type);
          const amount = Number(row.amount);
          const prefix = amount > 0 ? '+' : '';
          return (
            <span className={inflow ? styles.amountRecharge : styles.amountSpend}>
              {prefix}
              {formatCompactNumber(amount)}
            </span>
          );
        },
      },
    ];

    if (showOperatorColumn) {
      baseColumns.push({
        id: 'operatorName',
        label: '操作人',
        width: 'md',
        align: 'start',
        renderCell: (row) => (
          <DataTable.TextCell>
            {row.operatorName != null && row.operatorName.length > 0 ? row.operatorName : '—'}
          </DataTable.TextCell>
        ),
      });
    }

    return baseColumns;
  }, [showOperatorColumn]);

  return (
    <DataTable
      ariaLabel="交易明细"
      className={styles.transactionTable}
      items={dataSource}
      rowKey="key"
      columns={columns}
      loading={loading}
      emptyText="暂无交易明细"
      title="交易明细"
      tabs={
        <DataTable.Tabs
          tabs={TX_TABS}
          activeTab={activeTab}
          onChange={onTabChange}
          ariaLabel="交易明细类型"
        />
      }
      pagination={{
        total,
        current,
        pageSize,
        onChange: onPageChange,
      }}
      getRowClassName={(_, ctx) =>
        flashFirstRow && ctx.rowId === dataSource[0]?.key ? styles.rowFlash : undefined
      }
    />
  );
}

export default WalletTransactionTable;
