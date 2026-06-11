import { sortMarketData, validateMarketData } from './calculations';
import type {
  HighLowMode,
  IndexType,
  MarketMetadata,
  MarketPoint,
  PullbackParams,
  StoredMarketData,
  StoredPreferences,
} from '../types';

const storageKey = 'taiex-pullback-monitor:twse-data:v1';
const preferencesStorageKey = 'taiex-pullback-monitor:preferences:v1';

const isMarketPoint = (value: unknown): value is MarketPoint => {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<MarketPoint>;
  return typeof point.date === 'string' && typeof point.index === 'number' && Number.isFinite(point.index);
};

const isMetadata = (value: unknown): value is MarketMetadata => {
  if (!value || typeof value !== 'object') return false;
  const metadata = value as Partial<MarketMetadata>;

  return (
    typeof metadata.lastUpdated === 'string' &&
    typeof metadata.source === 'string' &&
    metadata.status === 'ok' &&
    typeof metadata.generatedBy === 'string' &&
    typeof metadata.priceDataCount === 'number' &&
    typeof metadata.totalReturnDataCount === 'number' &&
    typeof metadata.priceLatestDate === 'string' &&
    typeof metadata.totalReturnLatestDate === 'string'
  );
};

const isStoredMarketData = (value: unknown): value is StoredMarketData => {
  if (!value || typeof value !== 'object') return false;
  const stored = value as Partial<StoredMarketData>;

  return (
    Array.isArray(stored.price) &&
    stored.price.every(isMarketPoint) &&
    Array.isArray(stored.totalReturn) &&
    stored.totalReturn.every(isMarketPoint) &&
    isMetadata(stored.metadata) &&
    typeof stored.lastCheckedAt === 'string' &&
    (typeof stored.noTodayDataDate === 'undefined' || typeof stored.noTodayDataDate === 'string')
  );
};

export const readStoredMarketData = () => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredMarketData(parsed)) return null;

    return {
      ...parsed,
      price: sortMarketData(validateMarketData(parsed.price)),
      totalReturn: sortMarketData(validateMarketData(parsed.totalReturn)),
    };
  } catch {
    return null;
  }
};

export const writeStoredMarketData = (stored: StoredMarketData) => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch {
    throw new Error('無法儲存 TWSE 資料，瀏覽器儲存空間可能已滿或被停用。');
  }
};

export const clearStoredMarketData = () => {
  window.localStorage.removeItem(storageKey);
};

const highLowModes = new Set<HighLowMode>(['rolling', 'zigzag', 'volatilityAdjustedZigZag']);
const indexTypes = new Set<IndexType>(['price', 'totalReturn']);

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isPullbackParams = (value: unknown): value is PullbackParams => {
  if (!value || typeof value !== 'object') return false;
  const params = value as Partial<PullbackParams>;

  return (
    typeof params.highLowMode === 'string' &&
    highLowModes.has(params.highLowMode as HighLowMode) &&
    isFiniteNumber(params.lookbackDays) &&
    isFiniteNumber(params.pullbackThreshold) &&
    isFiniteNumber(params.pivotThreshold) &&
    isFiniteNumber(params.volLookback) &&
    isFiniteNumber(params.volatilityMultiplier) &&
    isFiniteNumber(params.minThreshold) &&
    isFiniteNumber(params.maxThreshold)
  );
};

export const readStoredPreferences = (): StoredPreferences | null => {
  try {
    const raw = window.localStorage.getItem(preferencesStorageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredPreferences>;

    if (
      typeof value.indexType !== 'string' ||
      !indexTypes.has(value.indexType as IndexType) ||
      !isPullbackParams(value.params)
    ) {
      return null;
    }

    return value as StoredPreferences;
  } catch {
    return null;
  }
};

export const writeStoredPreferences = (preferences: StoredPreferences) => {
  try {
    window.localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
  } catch {
    // Preferences are optional; calculation and data updates should continue.
  }
};
