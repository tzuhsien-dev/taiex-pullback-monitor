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
  static: '內建靜態資料',
  storage: '本地手動更新資料',
  csv: 'CSV 上傳資料',
  sample: '內建範例資料',
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
  const latestDate = metadata ? `加權 ${metadata.priceLatestDate} / 報酬 ${metadata.totalReturnLatestDate}` : '無資料日期';
  const progressPercent = updateProgress ? Math.round((updateProgress.completed / Math.max(updateProgress.total, 1)) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-panel/70 p-3 shadow-xl shadow-black/10 sm:min-w-[360px]">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUpdating}
          type="button"
          onClick={onUpdate}
        >
          <RefreshCcw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? `更新中 ${progressPercent}%` : '更新最新資料'}
        </button>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-ink px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-300 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUpdating}
          type="button"
          onClick={onClear}
        >
          <Trash2 className="h-4 w-4" />
          清除本地資料
        </button>
      </div>
      <div className="text-xs leading-5 text-slate-400">
        <div>資料來源：{sourceLabel[source]}</div>
        <div>最新資料日期：{latestDate}</div>
        <div>最後更新：{formatDateTime(metadata?.lastUpdated)}</div>
        {isUpdating && updateProgress ? (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between gap-3 text-cyan-100">
              <span>{updateProgress.label}</span>
              <span>{updateProgress.completed}/{updateProgress.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        ) : null}
        {updateStatus.message ? (
          <div className={updateStatus.kind === 'error' ? 'text-red-300' : updateStatus.kind === 'success' ? 'text-emerald-300' : 'text-slate-400'}>
            {updateStatus.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
