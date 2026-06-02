import { RefreshCcw, Trash2 } from 'lucide-react';
import type { DataSource, MarketMetadata } from '../types';
import { formatDateTime } from '../lib/calculations';

type UpdateStatus = {
  kind: 'idle' | 'success' | 'error';
  message?: string;
};

type UpdateProgress = {
  completed: number;
  total: number;
  label: string;
} | null;

const sourceLabel: Record<DataSource, string> = {
  static: '靜態資料',
  storage: '本地資料',
  csv: 'CSV 資料',
  sample: '範例資料',
};

export function DataActions({
  source,
  metadata,
  isUpdating,
  updateStatus,
  updateProgress,
  onUpdate,
  onClear,
}: {
  source: DataSource;
  metadata: MarketMetadata | null;
  isUpdating: boolean;
  updateStatus: UpdateStatus;
  updateProgress: UpdateProgress;
  onUpdate: () => void;
  onClear: () => void;
}) {
  const latestDate = metadata
    ? metadata.priceLatestDate === metadata.totalReturnLatestDate
      ? `資料至 ${metadata.priceLatestDate}`
      : `資料至 加權 ${metadata.priceLatestDate} / 報酬 ${metadata.totalReturnLatestDate}`
    : '無資料日期';
  const statusText = `${sourceLabel[source]} · ${latestDate} · 更新 ${formatDateTime(metadata?.lastUpdated)}`;
  const progressPercent = updateProgress ? Math.round((updateProgress.completed / Math.max(updateProgress.total, 1)) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-800/70 bg-panel/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-xs leading-5 text-slate-500">
        <div className="truncate" title={statusText}>{statusText}</div>
        {updateStatus.message ? (
          <div className={updateStatus.kind === 'error' ? 'text-red-300' : updateStatus.kind === 'success' ? 'text-emerald-300' : 'text-slate-400'}>
            {updateStatus.message}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        <button
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          disabled={isUpdating}
          type="button"
          onClick={onUpdate}
        >
          <RefreshCcw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? `更新中 ${progressPercent}%` : '更新最新資料'}
        </button>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-2 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-300/40 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUpdating}
          type="button"
          onClick={onClear}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">清除本地資料</span>
          <span className="sm:hidden">清除</span>
        </button>
      </div>

      {isUpdating && updateProgress ? (
        <div className="sm:basis-full">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs text-cyan-100">
            <span>{updateProgress.label}</span>
            <span>{updateProgress.completed}/{updateProgress.total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
