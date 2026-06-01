import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clipboard, ClipboardCheck, Gauge, ShieldAlert } from 'lucide-react';
import type { DataHealth, IndexType, PullbackParams, PullbackResult } from '../types';
import { formatNumber, formatPercent, formatSignedPercent } from '../lib/calculations';

const indexLabel: Record<IndexType, string> = {
  price: '加權指數',
  totalReturn: '加權報酬指數',
};

const copyStatusResetMs = 1800;

function getTone(result: PullbackResult, dataHealth: DataHealth) {
  if (dataHealth.status !== 'healthy') return 'danger';
  if (result.status === 'triggered') return 'success';
  if (result.status === 'near') return 'warning';
  return 'neutral';
}

export function AlertSummary({
  result,
  params,
  indexType,
  dataHealth,
}: {
  result: PullbackResult;
  params: PullbackParams;
  indexType: IndexType;
  dataHealth: DataHealth;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
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

  const shareText = useMemo(
    () =>
      `${indexLabel[indexType]} ${result.latestDate} 收 ${formatNumber(result.currentIndex)}，距 ${params.lookbackDays} 日高點回落 ${formatPercent(
        result.pullback,
      )}，${result.statusText}，門檻點位 ${formatNumber(result.thresholdIndex)}。`,
    [indexType, params.lookbackDays, result],
  );

  const copyShareText = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }

      await navigator.clipboard.writeText(shareText);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    } finally {
      window.setTimeout(() => setCopyState('idle'), copyStatusResetMs);
    }
  };

  return (
    <section className={`rounded-lg border p-5 shadow-xl shadow-black/20 ${toneClass}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-current/20 bg-black/10 px-3 py-1 text-sm font-semibold">
              <Icon className="h-4 w-4" />
              監控提醒
            </span>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/10 px-3 py-1 text-sm font-semibold text-slate-100 transition hover:border-cyan-400 hover:text-cyan-100"
              type="button"
              onClick={copyShareText}
            >
              {copyState === 'copied' ? <ClipboardCheck className="h-4 w-4 text-emerald-300" /> : <Clipboard className="h-4 w-4" />}
              {copyState === 'copied' ? '已複製' : copyState === 'failed' ? '複製失敗' : '複製摘要'}
            </button>
          </div>
          <h2 className="text-2xl font-semibold text-white">{headline}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:w-[560px] lg:max-w-[48%]">
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <div className="text-xs text-slate-400">近期高點</div>
            <div className="mt-1 text-lg font-semibold text-white">{formatNumber(result.rollingHigh)}</div>
            <div className="text-xs text-slate-500">{result.rollingHighDate}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <div className="text-xs text-slate-400">回落門檻點位</div>
            <div className="mt-1 text-lg font-semibold text-white">{formatNumber(result.thresholdIndex)}</div>
            <div className="text-xs text-slate-500">{formatPercent(params.pullbackThreshold)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <div className="text-xs text-slate-400">{hasReachedThreshold ? '已低於門檻' : '距離門檻還差'}</div>
            <div className="mt-1 text-lg font-semibold text-white">{formatNumber(Math.abs(result.distanceToThresholdPoints))} 點</div>
            <div className="text-xs text-slate-500">{formatSignedPercent(result.distanceToThresholdPercent)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
