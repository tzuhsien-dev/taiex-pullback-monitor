import { sampleData, sortMarketData, validateMarketData } from './calculations';
import type { IndexType, LoadedMarketData, MarketMetadata, MarketPoint } from '../types';

const dataPathByIndexType: Record<IndexType, string> = {
  price: 'data/taiex-price.json',
  totalReturn: 'data/taiex-total-return.json',
};

const metadataPath = 'data/metadata.json';

const getAssetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

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
    typeof metadata.priceDataCount === 'number' &&
    typeof metadata.totalReturnDataCount === 'number'
  );
};

const fetchJson = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} 回應 ${response.status}`);
  return response.json() as Promise<unknown>;
};

export const loadMarketData = async (indexType: IndexType): Promise<LoadedMarketData> => {
  try {
    const [pointsPayload, metadataPayload] = await Promise.all([
      fetchJson(getAssetUrl(dataPathByIndexType[indexType])),
      fetchJson(getAssetUrl(metadataPath)),
    ]);

    if (!Array.isArray(pointsPayload) || !pointsPayload.every(isMarketPoint)) {
      throw new Error('指數 JSON 格式不符合 { date, index } 陣列。');
    }

    if (!isMetadata(metadataPayload)) {
      throw new Error('metadata.json 格式不正確。');
    }

    const points = sortMarketData(validateMarketData(pointsPayload));
    if (points.length === 0) throw new Error('指數 JSON 沒有可用資料。');

    return {
      points,
      metadata: metadataPayload,
      source: 'actions',
    };
  } catch (error) {
    return {
      points: sampleData,
      metadata: null,
      source: 'sample',
      error: error instanceof Error ? error.message : '靜態資料讀取失敗。',
    };
  }
};
