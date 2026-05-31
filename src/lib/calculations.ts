import type { ChartPoint, MarketPoint, PullbackParams, PullbackResult, PullbackStatus } from '../types';

export const decimalToPercent = (value: number) => value * 100;

export const formatNumber = (value: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits,
  }).format(value);

export const formatPercent = (value: number, maximumFractionDigits = 2) =>
  `${Math.abs(decimalToPercent(value)).toFixed(maximumFractionDigits)}%`;

export const formatSignedPercent = (value: number, maximumFractionDigits = 2) =>
  `${decimalToPercent(value).toFixed(maximumFractionDigits)}%`;

export const formatDateTime = (value?: string | null) => {
  if (!value) return '無更新時間';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

export const sortMarketData = (points: MarketPoint[]) =>
  [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

export const validateMarketData = (points: MarketPoint[]) =>
  points.filter((point) => point.date && Number.isFinite(point.index) && point.index > 0);

const getExtremePoint = (points: MarketPoint[], mode: 'max' | 'min') => {
  if (points.length === 0) {
    throw new Error('沒有可計算的指數資料。');
  }

  return points.reduce((selected, point) => {
    if (mode === 'max') return point.index > selected.index ? point : selected;
    return point.index < selected.index ? point : selected;
  }, points[0]);
};

export const calculatePullback = (points: MarketPoint[], params: PullbackParams): PullbackResult => {
  const sorted = sortMarketData(validateMarketData(points));

  if (sorted.length === 0) {
    throw new Error('沒有可計算的指數資料。');
  }

  const lookbackData = sorted.slice(Math.max(0, sorted.length - params.lookbackDays));
  const latest = sorted[sorted.length - 1];
  const high = getExtremePoint(lookbackData, 'max');
  const low = getExtremePoint(lookbackData, 'min');
  const pullback = latest.index / high.index - 1;
  const reboundFromLow = latest.index / low.index - 1;
  const thresholdIndex = high.index * (1 - params.pullbackThreshold);
  const distanceToThresholdPoints = latest.index - thresholdIndex;
  const distanceToThresholdPercent = latest.index / thresholdIndex - 1;

  let status: PullbackStatus = 'normal';
  let statusText = '尚未達回落門檻';

  if (pullback <= -params.pullbackThreshold) {
    status = 'triggered';
    statusText = '已達近期高點回落門檻';
  } else if (pullback <= -params.nearThreshold) {
    status = 'near';
    statusText = '接近回落門檻';
  }

  return {
    latestDate: latest.date,
    currentIndex: latest.index,
    rollingHigh: high.index,
    rollingHighDate: high.date,
    rollingLow: low.index,
    rollingLowDate: low.date,
    pullback,
    reboundFromLow,
    thresholdIndex,
    distanceToThresholdPoints,
    distanceToThresholdPercent,
    status,
    statusText,
    lookbackData,
  };
};

export const buildChartData = (result: PullbackResult): ChartPoint[] =>
  result.lookbackData.map((point) => ({
    ...point,
    rollingHigh: result.rollingHigh,
    rollingLow: result.rollingLow,
    thresholdIndex: result.thresholdIndex,
  }));

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const sampleData: MarketPoint[] = [
  ...Array.from({ length: 42 }, (_, index) => ({
    date: addDays(new Date(Date.UTC(2025, 0, 2)), index).toISOString().slice(0, 10),
    index: 22200 + index * 43,
  })),
  { date: '2025-02-20', index: 24000 },
  { date: '2025-02-21', index: 23650 },
  { date: '2025-02-24', index: 23200 },
  { date: '2025-02-25', index: 22880 },
  { date: '2025-02-26', index: 22420 },
  { date: '2025-02-27', index: 22050 },
  { date: '2025-02-28', index: 21600 },
];
