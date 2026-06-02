import { AlertTriangle, CheckCircle2, Gauge, ShieldAlert } from 'lucide-react';
import type { DataHealth, PullbackParams, PullbackResult } from '../types';
import { formatNumber, formatPercent, formatSignedPercent } from '../lib/calculations';

function getTone(result: PullbackResult, dataHealth: DataHealth) {
  if (dataHealth.status !== 'healthy') return 'danger';
  if (result.status === 'triggered') return 'success';
  if (result.status === 'near') return 'warning';
  return 'neutral';
}

export function AlertSummary({
  result,
  params,
  dataHealth,
}: {
  result: PullbackResult;
  params: PullbackParams;
  dataHealth: DataHealth;
}) {
  const tone = getTone(result, dataHealth);
  const hasReachedThreshold = result.distanceToThresholdPoints <= 0;
  const headline =
    dataHealth.status !== 'healthy'
      ? dataHealth.label
      : result.status === 'triggered'
        ? '已達回落門檻'
        : result.status === 'near'
          ? '接近回落門檻'
          : `跌到 ${formatNumber(result.thresholdIndex)} 以下才達標`;
  const body =
    dataHealth.status !== 'healthy'
      ? `${dataHealth.detail} 請先確認資料來源，再解讀回落訊號。`
      : result.status === 'triggered'
        ? `目前已低於 ${formatPercent(params.pullbackThreshold)} 回落門檻，適合列入觀察清單。`
        : result.status === 'near'
          ? `目前距近期高點已回落 ${formatPercent(result.pullback)}，正在接近 ${formatPercent(params.pullbackThreshold)} 門檻。`
          : `目前距門檻還差 ${formatNumber(result.distanceToThresholdPoints)} 點，約 ${formatSignedPercent(result.distanceToThresholdPercent)}。`;
  const toneClass = {
    success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
    warning: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    danger: 'border-red-400/30 bg-red-400/10 text-red-100',
    neutral: 'border-slate-700 bg-panel text-slate-100',
  }[tone];
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertTriangle : tone === 'danger' ? ShieldAlert : Gauge;

  return (
    <section className={`rounded-lg border p-4 shadow-xl shadow-black/20 sm:p-5 ${toneClass}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-current/20 bg-black/10 px-3 py-1 text-sm font-semibold">
              <Icon className="h-4 w-4" />
              監控提醒
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-white">{headline}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:w-[380px] lg:max-w-[38%]">
          <div className="rounded-lg border border-white/10 bg-black/10 p-2.5 sm:p-3">
            <div className="text-xs text-slate-400">回落門檻點位</div>
            <div className="mt-1 text-base font-semibold text-white sm:text-lg">{formatNumber(result.thresholdIndex)}</div>
            <div className="text-xs text-slate-500">{formatPercent(params.pullbackThreshold)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-2.5 sm:p-3">
            <div className="text-xs text-slate-400">{hasReachedThreshold ? '已低於門檻' : '距離門檻還差'}</div>
            <div className="mt-1 text-base font-semibold text-white sm:text-lg">{formatNumber(Math.abs(result.distanceToThresholdPoints))} 點</div>
            <div className="text-xs text-slate-500">{formatSignedPercent(result.distanceToThresholdPercent)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
