import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MarketPoint, PullbackParams, PullbackResult } from '../types';
import { calculateHistoricalPullbackDistribution, formatNumber, formatPercent } from '../lib/calculations';

function HistoryStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-panelSoft px-3 py-2.5 sm:p-4">
      <div className="text-xs text-slate-400 sm:text-sm">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white sm:mt-2 sm:text-2xl">{value}</div>
      {detail ? <div className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{detail}</div> : null}
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
      <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-xl shadow-black/20 sm:p-5">
        <h2 className="text-base font-semibold text-white sm:text-lg">歷史脈絡</h2>
        <p className="mt-2 text-xs leading-5 text-slate-400 sm:text-sm">
          資料筆數少於目前觀察期 {params.lookbackDays} 日，無法計算歷史分布。請降低觀察期或上傳更多 CSV 資料。
        </p>
      </section>
    );
  }

  const firstSampleDate = distribution.samples[0]?.date;
  const lastSampleDate = distribution.samples[distribution.samples.length - 1]?.date;
  const periodText = firstSampleDate && lastSampleDate ? `${firstSampleDate} 至 ${lastSampleDate}` : '無期間資料';

  return (
    <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-xl shadow-black/20 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white sm:text-lg">歷史脈絡</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            統計期間 {periodText}，以目前高低點模式逐日計算回落幅度。
          </p>
        </div>
        <div className="text-xs leading-5 text-slate-400 lg:text-right">
          樣本 {formatNumber(distribution.sampleCount, 0)} 日 · 平均回落 {formatPercent(distribution.averageDepth)} · 目前回落 {formatPercent(distribution.currentDepth)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <HistoryStat label="歷史分位" value={formatPercent(distribution.percentile)} detail="越高越深" />
        <HistoryStat label="最大回落" value={formatPercent(distribution.maxDepth)} />
        <HistoryStat
          label="達門檻天數"
          value={formatNumber(distribution.thresholdHitCount, 0)}
          detail={`${formatPercent(distribution.thresholdHitRate)} 達標`}
        />
      </div>

      <div className="mt-4 h-[180px] w-full sm:mt-5 sm:h-[280px]">
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
