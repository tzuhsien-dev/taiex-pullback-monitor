import type {
  ChartPoint,
  HistoricalPullbackBin,
  HistoricalPullbackDistribution,
  HistoricalPullbackPoint,
  MarketPoint,
  PullbackParams,
  PullbackResult,
  PullbackStatus,
} from '../types';

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

const distributionBins: Array<Omit<HistoricalPullbackBin, 'count' | 'reachedThreshold' | 'containsCurrent'>> = [
  { label: '0-3%', min: 0, max: 0.03 },
  { label: '3-5%', min: 0.03, max: 0.05 },
  { label: '5-7%', min: 0.05, max: 0.07 },
  { label: '7-10%', min: 0.07, max: 0.1 },
  { label: '10-15%', min: 0.1, max: 0.15 },
  { label: '15%+', min: 0.15, max: null },
];

const isDepthInBin = (depth: number, bin: Omit<HistoricalPullbackBin, 'count' | 'reachedThreshold' | 'containsCurrent'>) =>
  depth >= bin.min && (bin.max === null || depth < bin.max);

export const calculateHistoricalPullbackDistribution = (
  points: MarketPoint[],
  params: PullbackParams,
  currentResult: PullbackResult,
): HistoricalPullbackDistribution | null => {
  const sorted = sortMarketData(validateMarketData(points));

  if (sorted.length < params.lookbackDays) {
    return null;
  }

  const samples: HistoricalPullbackPoint[] = sorted.slice(params.lookbackDays - 1).map((point, index) => {
    const sourceIndex = index + params.lookbackDays - 1;
    const windowPoints = sorted.slice(sourceIndex - params.lookbackDays + 1, sourceIndex + 1);
    const high = getExtremePoint(windowPoints, 'max');
    const pullback = point.index / high.index - 1;
    const pullbackDepth = Math.max(0, -pullback);

    return {
      ...point,
      rollingHigh: high.index,
      pullback,
      pullbackDepth,
      reachedThreshold: pullbackDepth >= params.pullbackThreshold,
    };
  });

  if (samples.length === 0) {
    return null;
  }

  const currentDepth = Math.max(0, -currentResult.pullback);
  const maxDepth = Math.max(...samples.map((sample) => sample.pullbackDepth));
  const averageDepth = samples.reduce((sum, sample) => sum + sample.pullbackDepth, 0) / samples.length;
  const percentile = samples.filter((sample) => sample.pullbackDepth <= currentDepth).length / samples.length;
  const thresholdHitCount = samples.filter((sample) => sample.reachedThreshold).length;
  const thresholdHitRate = thresholdHitCount / samples.length;
  const bins = distributionBins.map((bin) => ({
    ...bin,
    count: samples.filter((sample) => isDepthInBin(sample.pullbackDepth, bin)).length,
    reachedThreshold: bin.max === null ? bin.min >= params.pullbackThreshold : bin.max > params.pullbackThreshold,
    containsCurrent: isDepthInBin(currentDepth, bin),
  }));

  return {
    samples,
    bins,
    sampleCount: samples.length,
    currentDepth,
    maxDepth,
    averageDepth,
    percentile,
    thresholdHitCount,
    thresholdHitRate,
  };
};

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
