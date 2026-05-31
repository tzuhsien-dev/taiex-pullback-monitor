export type MarketPoint = {
  date: string;
  index: number;
};

export type IndexType = 'price' | 'totalReturn';

export type DataSource = 'actions' | 'csv' | 'sample';

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

export type DataHealthStatus = 'healthy' | 'stale' | 'fallback';

export type DataHealth = {
  status: DataHealthStatus;
  label: string;
  detail: string;
};

export type PullbackParams = {
  lookbackDays: number;
  pullbackThreshold: number;
  nearThreshold: number;
};

export type PullbackStatus = 'triggered' | 'near' | 'normal';

export type PullbackResult = {
  latestDate: string;
  currentIndex: number;
  rollingHigh: number;
  rollingHighDate: string;
  rollingLow: number;
  rollingLowDate: string;
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
