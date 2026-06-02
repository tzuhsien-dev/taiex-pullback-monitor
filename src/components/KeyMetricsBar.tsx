import { Database, Gauge } from 'lucide-react';
import type { IndexType, PullbackResult } from '../types';
import { formatNumber, formatPercent, formatSignedPercent } from '../lib/calculations';

const indexLabel: Record<IndexType, string> = {
  price: '加權指數',
  totalReturn: '加權報酬指數',
};

const modeLabel = {
  rolling: '固定期間',
  zigzag: 'ZigZag',
  volatilityAdjustedZigZag: '波動 ZigZag',
};

const highMetricLabel = {
  rolling: 'N 日高點',
  zigzag: '追蹤高點',
  volatilityAdjustedZigZag: '追蹤高點',
};

const lowMetricLabel = {
  rolling: 'N 日低點',
  zigzag: '追蹤低點',
  volatilityAdjustedZigZag: '追蹤低點',
};

function MetricItem({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate text-base font-semibold text-white sm:text-lg">{value}</div>
      {detail ? <div className="mt-0.5 truncate text-xs text-slate-500">{detail}</div> : null}
    </div>
  );
}

export function KeyMetricsBar({
  result,
  indexType,
}: {
  result: PullbackResult;
  indexType: IndexType;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-panel/80 p-4 shadow-xl shadow-black/10">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-5">
        <MetricItem label="目前指數" value={formatNumber(result.currentIndex)} detail={result.latestDate} />
        <MetricItem label={highMetricLabel[result.highLowMode]} value={formatNumber(result.rollingHigh)} detail={result.rollingHighDate} />
        <MetricItem label={lowMetricLabel[result.highLowMode]} value={formatNumber(result.rollingLow)} detail={result.rollingLowDate} />
        <MetricItem label="高點回落" value={`回落 ${formatPercent(result.pullback)}`} />
        <MetricItem label="低點反彈" value={formatSignedPercent(result.reboundFromLow)} />
      </div>
    </section>
  );
}
