import { Activity, CheckCircle2, Database, Gauge } from 'lucide-react';
import type { DataHealth, IndexType, MarketMetadata, PullbackResult } from '../types';
import { formatDateTime, formatNumber, formatPercent, formatSignedPercent } from '../lib/calculations';

const indexLabel: Record<IndexType, string> = {
  price: '加權指數',
  totalReturn: '加權報酬指數',
};

const modeLabel = {
  rolling: '固定期間',
  zigzag: 'ZigZag',
  volatilityAdjustedZigZag: '波動 ZigZag',
};

function MetricItem({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold text-white">{value}</div>
      {detail ? <div className="mt-0.5 truncate text-xs text-slate-500">{detail}</div> : null}
    </div>
  );
}

export function KeyMetricsBar({
  result,
  indexType,
  metadata,
  dataHealth,
}: {
  result: PullbackResult;
  indexType: IndexType;
  metadata: MarketMetadata | null;
  dataHealth: DataHealth;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex flex-col gap-2 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-300" />
            {indexLabel[indexType]}
          </span>
          <span className="inline-flex items-center gap-2">
            <Gauge className="h-4 w-4 text-amber-300" />
            {modeLabel[result.highLowMode]}
            {result.pivotThresholdUsed === null ? '' : ` ${formatPercent(result.pivotThresholdUsed)}`}
          </span>
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            {dataHealth.label}
          </span>
        </div>
        <span className="inline-flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-300" />
          更新 {formatDateTime(metadata?.lastUpdated)}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <MetricItem label="目前指數" value={formatNumber(result.currentIndex)} detail={result.latestDate} />
        <MetricItem label="近期高點" value={formatNumber(result.rollingHigh)} detail={result.rollingHighDate} />
        <MetricItem label="近期低點" value={formatNumber(result.rollingLow)} detail={result.rollingLowDate} />
        <MetricItem label="高點回落" value={`回落 ${formatPercent(result.pullback)}`} />
        <MetricItem label="低點反彈" value={formatSignedPercent(result.reboundFromLow)} />
        <MetricItem label="門檻距離" value={`${formatNumber(result.distanceToThresholdPoints)} 點`} detail={formatSignedPercent(result.distanceToThresholdPercent)} />
      </div>
    </section>
  );
}
