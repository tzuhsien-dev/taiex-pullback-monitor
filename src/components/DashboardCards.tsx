import { Activity, AlertTriangle, CalendarClock, CheckCircle2, Gauge, LineChart, TrendingDown, TrendingUp } from 'lucide-react';
import type { DataHealth, DataSource, IndexType, MarketMetadata, PullbackParams, PullbackResult } from '../types';
import { formatNumber, formatPercent, formatSignedPercent } from '../lib/calculations';
import { DataSourceBadge } from './DataSourceBadge';
import { StatusBadge } from './StatusBadge';

const indexLabel: Record<IndexType, string> = {
  price: '加權指數',
  totalReturn: '加權報酬指數',
};

function MetricCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const toneClass = {
    neutral: 'text-slate-100',
    success: 'text-emerald-300',
    warning: 'text-amber-300',
    danger: 'text-red-300',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-panelSoft p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className={`mt-2 break-words text-2xl font-semibold ${toneClass}`}>{value}</div>
      {detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}
    </div>
  );
}

export function DashboardCards({
  result,
  params,
  indexType,
  metadata,
  source,
  dataHealth,
}: {
  result: PullbackResult;
  params: PullbackParams;
  indexType: IndexType;
  metadata: MarketMetadata | null;
  source: DataSource;
  dataHealth: DataHealth;
}) {
  const pullbackTone = result.status === 'triggered' ? 'success' : result.status === 'near' ? 'warning' : 'neutral';
  const distanceTone = result.distanceToThresholdPoints <= 0 ? 'success' : result.status === 'near' ? 'warning' : 'neutral';
  const healthClass =
    dataHealth.status === 'healthy'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
      : dataHealth.status === 'stale'
        ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
        : 'border-red-400/30 bg-red-400/10 text-red-100';
  const HealthIcon = dataHealth.status === 'healthy' ? CheckCircle2 : AlertTriangle;

  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-slate-800 bg-panel p-5 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <DataSourceBadge source={source} />
              <StatusBadge status={result.status} text={result.statusText} />
              <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm font-semibold ${healthClass}`}>
                <HealthIcon className="h-4 w-4" />
                {dataHealth.label}
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-white">近期高點回落監控</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              以最近 {params.lookbackDays} 筆交易日資料計算相對高點，觀察目前指數是否已回落 {formatPercent(params.pullbackThreshold)}。
            </p>
          </div>
          <div className="grid gap-2 text-sm text-slate-400">
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-cyan-300" />
              最新資料日期 {result.latestDate}
            </span>
            <span className="inline-flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              最後更新 {metadata?.lastUpdated ?? '無更新時間'}
            </span>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              {dataHealth.detail}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="指數類型" value={indexLabel[indexType]} />
        <MetricCard
          label="資料健康狀態"
          value={dataHealth.label}
          detail={dataHealth.detail}
          tone={dataHealth.status === 'healthy' ? 'success' : dataHealth.status === 'stale' ? 'warning' : 'danger'}
        />
        <MetricCard label="目前指數" value={formatNumber(result.currentIndex)} detail={result.latestDate} />
        <MetricCard label="觀察期 N 日" value={`${params.lookbackDays}`} />
        <MetricCard label="最終狀態" value={result.statusText} tone={pullbackTone} />
        <MetricCard label="近期高點" value={formatNumber(result.rollingHigh)} detail={result.rollingHighDate} />
        <MetricCard label="近期低點" value={formatNumber(result.rollingLow)} detail={result.rollingLowDate} />
        <MetricCard label="從近期高點回落" value={`回落 ${formatPercent(result.pullback)}`} tone={pullbackTone} />
        <MetricCard label="從近期低點反彈" value={formatSignedPercent(result.reboundFromLow)} tone="success" />
        <MetricCard label="回落門檻" value={formatPercent(params.pullbackThreshold)} />
        <MetricCard label="門檻點位" value={formatNumber(result.thresholdIndex)} />
        <MetricCard
          label="資料最後更新時間"
          value={metadata?.lastUpdated ?? '無'}
          detail={metadata?.generatedBy ?? '目前不是 TWSE 真實資料'}
          tone={dataHealth.status === 'healthy' ? 'success' : dataHealth.status === 'stale' ? 'warning' : 'danger'}
        />
        <MetricCard
          label="距離門檻還差"
          value={`${formatNumber(result.distanceToThresholdPoints)} 點`}
          detail={formatSignedPercent(result.distanceToThresholdPercent)}
          tone={distanceTone}
        />
        <div className="rounded-lg border border-slate-800 bg-panelSoft p-4">
          <div className="mb-3 text-sm text-slate-400">快速摘要</div>
          <div className="grid gap-2 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-300" />
              門檻點位 {formatNumber(result.thresholdIndex)}
            </span>
            <span className="inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
              回落 {formatPercent(result.pullback)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Gauge className="h-4 w-4 text-amber-300" />
              接近提示 {formatPercent(params.nearThreshold)}
            </span>
            <span className="inline-flex items-center gap-2">
              <LineChart className="h-4 w-4 text-cyan-300" />
              資料筆數 {result.lookbackData.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
