import { sortMarketData, validateMarketData } from './calculations';
import type { MarketMetadata, MarketPoint, StoredMarketData } from '../types';

const storageKey = 'taiex-pullback-monitor:twse-data:v1';

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
  window.localStorage.setItem(storageKey, JSON.stringify(stored));
};

export const clearStoredMarketData = () => {
  window.localStorage.removeItem(storageKey);
};
