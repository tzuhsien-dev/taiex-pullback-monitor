import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PullbackResult } from '../types';
import { buildChartData, formatNumber, formatPercent } from '../lib/calculations';

const lowLineLabel = {
  rolling: 'N 日低點',
  zigzag: '追蹤波段低點',
  volatilityAdjustedZigZag: '追蹤波段低點',
};

const highLineLabel = {
  rolling: 'N 日高點',
  zigzag: '追蹤波段高點',
  volatilityAdjustedZigZag: '追蹤波段高點',
};

function useCompactChart() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const update = () => setIsCompact(query.matches);
    update();
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);

  return isCompact;
}

export function IndexChart({ result }: { result: PullbackResult }) {
  const isCompact = useCompactChart();
  const data = buildChartData(result);
  const latestPoint = data[data.length - 1];
  const highPoint = data.find((point) => point.date === result.rollingHighDate && point.index === result.rollingHigh);
  const lowPoint = data.find((point) => point.date === result.rollingLowDate && point.index === result.rollingLow);
  const lastConfirmedHigh = [...result.confirmedPivots].reverse().find((point) => point.type === 'high');
  const lastConfirmedLow = [...result.confirmedPivots].reverse().find((point) => point.type === 'low');
  const confirmedHighPoint = result.highLowMode !== 'rolling' && lastConfirmedHigh?.date !== result.rollingHighDate ? lastConfirmedHigh : null;
  const confirmedLowPoint = result.highLowMode !== 'rolling' && lastConfirmedLow?.date !== result.rollingLowDate ? lastConfirmedLow : null;

  return (
    <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">指數走勢與回落門檻</h2>
          <p className="mt-1 text-sm text-slate-500">近 {result.lookbackData.length} 筆資料，追蹤高點與回落門檻</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-400 lg:justify-end lg:text-right">
          <span>目前回落 {formatPercent(result.pullback)}</span>
          <span>門檻點位 {formatNumber(result.thresholdIndex)}</span>
        </div>
      </div>

      <div className="h-[300px] w-full sm:h-[440px]">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data} margin={isCompact ? { top: 18, right: 8, bottom: 0, left: 0 } : { top: 24, right: 28, bottom: 4, left: 2 }}>
            <CartesianGrid stroke="#26364f" strokeDasharray="3 3" />
            <XAxis dataKey="date" minTickGap={isCompact ? 58 : 30} stroke="#94a3b8" tick={{ fontSize: isCompact ? 10 : 12 }} tickFormatter={(value) => String(value).slice(5)} />
            <YAxis
              domain={['dataMin - 250', 'dataMax + 250']}
              hide={isCompact}
              stroke="#94a3b8"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatNumber(Number(value), 0)}
              width={70}
            />
            <Tooltip
              contentStyle={{
                background: '#111c2e',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#e2e8f0',
              }}
              formatter={(value: number, name) => [formatNumber(value), name]}
              labelStyle={{ color: '#bae6fd' }}
            />
            <Line dataKey="index" dot={false} name="指數" stroke="#22d3ee" strokeWidth={3} type="monotone" />
            <Line dataKey="rollingHigh" dot={false} name={highLineLabel[result.highLowMode]} stroke="#a78bfa" strokeDasharray="7 5" strokeWidth={2} type="monotone" />
            <Line dataKey="thresholdIndex" dot={false} name="回落門檻線" stroke="#34d399" strokeDasharray="5 5" strokeWidth={2} type="monotone" />
            <Line dataKey="rollingLow" dot={false} name={lowLineLabel[result.highLowMode]} stroke="#facc15" strokeDasharray="4 4" strokeWidth={2} type="monotone" />
            {!isCompact && highPoint ? (
              <ReferenceDot fill="#a78bfa" r={6} stroke="#ffffff" x={highPoint.date} y={highPoint.index} />
            ) : null}
            {!isCompact && lowPoint ? (
              <ReferenceDot fill="#facc15" r={6} stroke="#ffffff" x={lowPoint.date} y={lowPoint.index} />
            ) : null}
            {!isCompact && confirmedHighPoint ? (
              <ReferenceDot fill="#6d5dfc" r={4} stroke="#ddd6fe" x={confirmedHighPoint.date} y={confirmedHighPoint.index} />
            ) : null}
            {!isCompact && confirmedLowPoint ? (
              <ReferenceDot fill="#ca8a04" r={4} stroke="#fef3c7" x={confirmedLowPoint.date} y={confirmedLowPoint.index} />
            ) : null}
            {latestPoint ? (
              <ReferenceDot fill="#22d3ee" r={7} stroke="#ffffff" x={latestPoint.date} y={latestPoint.index} />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
