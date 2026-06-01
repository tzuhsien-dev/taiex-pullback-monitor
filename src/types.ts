export type MarketPoint = {
  date: string;
  index: number;
};

export type IndexType = 'price' | 'totalReturn';

export type DataSource = 'static' | 'storage' | 'csv' | 'sample';

export type MarketMetadata = {
  lastUpdated: string;
  source: string;
  status: 'ok';
  generatedBy: string;
  priceDataCount: number;
  totalReturnDataCount: number;
  priceLatestDate: string;
  totalReturnLatestDate: string;
};

export type LoadedMarketData = {
  points: MarketPoint[];
  metadata: MarketMetadata | null;
  source: DataSource;
  error?: string;
};

export type StoredMarketData = {
  price: MarketPoint[];
  totalReturn: MarketPoint[];
  metadata: MarketMetadata;
  lastCheckedAt: string;
  noTodayDataDate?: string;
};

export type DataHealthStatus = 'healthy' | 'stale' | 'fallback';

export type DataHealth = {
  status: DataHealthStatus;
  label: string;
  detail: string;
};

export type PullbackParams = {
  highLowMode: HighLowMode;
  lookbackDays: number;
  pullbackThreshold: number;
  nearThreshold: number;
  pivotThreshold: number;
  volLookback: number;
  volatilityMultiplier: number;
  minThreshold: number;
  maxThreshold: number;
};

export type HighLowMode = 'rolling' | 'zigzag' | 'volatilityAdjustedZigZag';

export type PullbackStatus = 'triggered' | 'near' | 'normal';

export type PivotPoint = MarketPoint & {
  type: 'high' | 'low';
};

export type PullbackResult = {
  latestDate: string;
  currentIndex: number;
  highLowMode: HighLowMode;
  pivotThresholdUsed: number | null;
  rollingHigh: number;
  rollingHighDate: string;
  rollingLow: number;
  rollingLowDate: string;
  confirmedPivots: PivotPoint[];
  pullback: number;
  reboundFromLow: number;
  thresholdIndex: number;
  distanceToThresholdPoints: number;
  distanceToThresholdPercent: number;
  status: PullbackStatus;
  statusText: string;
  lookbackData: MarketPoint[];
};

export type ChartPoint = MarketPoint & {
  rollingHigh?: number;
  rollingLow?: number;
  thresholdIndex?: number;
};

export type HistoricalPullbackPoint = MarketPoint & {
  rollingHigh: number;
  pullback: number;
  pullbackDepth: number;
  reachedThreshold: boolean;
};

export type HistoricalPullbackBin = {
  label: string;
  min: number;
  max: number | null;
  count: number;
  reachedThreshold: boolean;
  containsCurrent: boolean;
};

export type HistoricalPullbackDistribution = {
  samples: HistoricalPullbackPoint[];
  bins: HistoricalPullbackBin[];
  sampleCount: number;
  currentDepth: number;
  maxDepth: number;
  averageDepth: number;
  percentile: number;
  thresholdHitCount: number;
  thresholdHitRate: number;
};
