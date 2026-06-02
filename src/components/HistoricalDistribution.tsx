import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MarketPoint, PullbackParams, PullbackResult } from '../types';
import { calculateHistoricalPullbackDistribution, formatNumber, formatPercent } from '../lib/calculations';

function DistributionMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-panelSoft p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}
    </div>
  );
}

export function HistoricalDistribution({
  points,
  params,
  result,
}: {
  points: MarketPoint[];
  params: PullbackParams;
  result: PullbackResult;
}) {
  const distribution = calculateHistoricalPullbackDistribution(points, params, result);

  if (!distribution) {
    return (
      <section className="rounded-lg border border-slate-800 bg-panel p-5 shadow-xl shadow-black/20">
        <h2 className="text-lg font-semibold text-white">歷史脈絡</h2>
        <p className="mt-2 text-sm text-slate-400">
          資料筆數少於目前觀察期 {params.lookbackDays} 日，無法計算歷史分布。請降低觀察期或上傳更多 CSV 資料。
        </p>
      </section>
    );
  }

  const firstSampleDate = distribution.samples[0]?.date;
  const lastSampleDate = distribution.samples[distribution.samples.length - 1]?.date;
  const periodText = firstSampleDate && lastSampleDate ? `${firstSampleDate} 至 ${lastSampleDate}` : '無期間資料';

  return (
    <section className="rounded-lg border border-slate-800 bg-panel p-5 shadow-xl shadow-black/20">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">歷史脈絡</h2>
          <p className="mt-1 text-sm text-slate-500">
            統計期間 {periodText}，以目前高低點模式逐日計算回落幅度。
          </p>
        </div>
        <div className="text-sm text-slate-400 lg:text-right">
          目前回落 {formatPercent(distribution.currentDepth)}，位於歷史第 {formatPercent(distribution.percentile)} 分位
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <DistributionMetric label="可計算樣本數" value={formatNumber(distribution.sampleCount, 0)} detail="交易日" />
        <DistributionMetric label="目前回落幅度" value={`回落 ${formatPercent(distribution.currentDepth)}`} detail={result.latestDate} />
        <DistributionMetric label="歷史最大回落" value={formatPercent(distribution.maxDepth)} />
        <DistributionMetric label="歷史平均回落" value={formatPercent(distribution.averageDepth)} />
        <DistributionMetric label="目前歷史分位" value={formatPercent(distribution.percentile)} detail="越高代表回落越深" />
        <DistributionMetric
          label="達門檻天數"
          value={formatNumber(distribution.thresholdHitCount, 0)}
          detail={`${formatPercent(distribution.thresholdHitRate)} 的樣本達 ${formatPercent(params.pullbackThreshold)}`}
        />
      </div>

      <div className="mt-5 h-[300px] w-full">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={distribution.bins} margin={{ top: 12, right: 10, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#26364f" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={(value) => formatNumber(Number(value), 0)} width={48} />
            <Tooltip
              contentStyle={{
                background: '#111c2e',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#e2e8f0',
              }}
              formatter={(value: number) => [`${formatNumber(value, 0)} 天`, '樣本數']}
              labelFormatter={(label) => `回落區間 ${label}`}
              labelStyle={{ color: '#bae6fd' }}
            />
            <Bar dataKey="count" name="樣本數" radius={[6, 6, 0, 0]}>
              {distribution.bins.map((bin) => (
                <Cell
                  key={bin.label}
                  fill={bin.containsCurrent ? '#22d3ee' : bin.reachedThreshold ? '#34d399' : '#475569'}
                  stroke={bin.containsCurrent ? '#ffffff' : 'transparent'}
                  strokeWidth={bin.containsCurrent ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-cyan-300" />
          目前所在區間
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-emerald-400" />
          達到目前回落門檻的區間
        </span>
      </div>
    </section>
  );
}
