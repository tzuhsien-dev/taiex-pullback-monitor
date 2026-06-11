import { sortMarketData, validateMarketData } from './calculations';
import { readStoredMarketData, writeStoredMarketData } from './storage';
import type { IndexType, MarketMetadata, MarketPoint, StoredMarketData } from '../types';

type TwsePayload = {
  stat?: string;
  title?: string;
  fields?: string[];
  data?: string[][];
};

type UpdateOutcome =
  | {
      status: 'updated';
      stored: StoredMarketData;
      message: string;
    }
  | {
      status: 'skipped';
      stored: StoredMarketData | null;
      message: string;
    };

export type TwseUpdateProgress = {
  completed: number;
  total: number;
  label: string;
};

const endpoints: Record<IndexType, string> = {
  price: 'https://www.twse.com.tw/indicesReport/MI_5MINS_HIST',
  totalReturn: 'https://www.twse.com.tw/indicesReport/MFI94U',
};

const indexLabel: Record<IndexType, string> = {
  price: '加權指數',
  totalReturn: '加權報酬指數',
};

const maxTradingDays = 1000;
const monthsBack = 60;
const requestDelayMs = 180;
const maxFetchAttempts = 4;
const eveningRefreshHour = 19;
const requestTimeoutMs = 15_000;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('更新已取消。', 'AbortError'));
      return;
    }

    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('更新已取消。', 'AbortError'));
    };
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', handleAbort, { once: true });
  });

const taipeiDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
  };
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  return next;
};

const toMonthParam = (date: Date) => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}01`;

const parseNumber = (value: string, context: string) => {
  const parsed = Number(value.replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`${context}: 無法解析數字「${value}」`);
  }
  return parsed;
};

const parseTwseDate = (value: string, context: string) => {
  const parts = value.trim().split(/[/-]/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`${context}: 無法解析日期「${value}」`);
  }

  const [year, month, day] = parts;
  const fullYear = year < 1911 ? year + 1911 : year;
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const findFieldIndex = (fields: string[], candidates: string[]) =>
  fields.findIndex((field) => candidates.some((candidate) => field.replace(/\s/g, '').includes(candidate)));

const fetchMonth = async (indexType: IndexType, month: Date, signal?: AbortSignal) => {
  const monthParam = toMonthParam(month);
  const url = `${endpoints[indexType]}?response=json&date=${monthParam}`;

  for (let attempt = 1; attempt <= maxFetchAttempts; attempt += 1) {
    signal?.throwIfAborted();
    const timeoutController = new AbortController();
    const timeoutId = window.setTimeout(() => timeoutController.abort(), requestTimeoutMs);
    const abortFromParent = () => timeoutController.abort();
    signal?.addEventListener('abort', abortFromParent, { once: true });

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        signal: timeoutController.signal,
      });
    } catch (error) {
      if (signal?.aborted) throw new DOMException('更新已取消。', 'AbortError');
      if (attempt === maxFetchAttempts) {
        throw new Error(`${indexLabel[indexType]} ${monthParam}: TWSE 連線逾時或失敗`, { cause: error });
      }
      await sleep(requestDelayMs * attempt, signal);
      continue;
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortFromParent);
    }

    if (!response.ok) {
      if (attempt === maxFetchAttempts) {
        throw new Error(`${indexLabel[indexType]} ${monthParam}: TWSE request failed ${response.status}`);
      }
      await sleep(requestDelayMs * attempt, signal);
      continue;
    }

    const payload = (await response.json()) as TwsePayload;
    if (payload.stat !== 'OK') {
      if (attempt === maxFetchAttempts) {
        throw new Error(`${indexLabel[indexType]} ${monthParam}: TWSE stat is not OK (${payload.stat ?? 'missing stat'})`);
      }
      await sleep(requestDelayMs * attempt, signal);
      continue;
    }

    if (!Array.isArray(payload.fields) || !Array.isArray(payload.data)) {
      throw new Error(`${indexLabel[indexType]} ${monthParam}: TWSE response format changed, missing fields/data`);
    }

    return payload;
  }

  throw new Error(`${indexLabel[indexType]} ${monthParam}: TWSE request failed after ${maxFetchAttempts} attempts`);
};

const parsePayload = (payload: TwsePayload, indexType: IndexType, month: Date) => {
  const fields = payload.fields ?? [];
  const dateIndex = findFieldIndex(fields, ['日期']);
  const valueIndex = indexType === 'price' ? findFieldIndex(fields, ['收盤指數']) : findFieldIndex(fields, ['發行量加權股價報酬指數']);
  const monthParam = toMonthParam(month);

  if (dateIndex === -1) {
    throw new Error(`${indexLabel[indexType]} ${monthParam}: TWSE response format changed, missing 日期 field`);
  }

  if (valueIndex === -1) {
    const expected = indexType === 'price' ? '收盤指數' : '發行量加權股價報酬指數';
    throw new Error(`${indexLabel[indexType]} ${monthParam}: TWSE response format changed, missing ${expected} field`);
  }

  return (payload.data ?? []).map((row, rowIndex) => ({
    date: parseTwseDate(row[dateIndex] ?? '', `${indexLabel[indexType]} ${monthParam} row ${rowIndex + 1}`),
    index: parseNumber(row[valueIndex] ?? '', `${indexLabel[indexType]} ${monthParam} row ${rowIndex + 1}`),
  }));
};

const mergeAndTrim = (existing: MarketPoint[], fetched: MarketPoint[]) => {
  const unique = new Map([...existing, ...fetched].map((point) => [point.date, point]));
  return sortMarketData(validateMarketData([...unique.values()])).slice(-maxTradingDays);
};

const getRefreshMonthCount = (existing: MarketPoint[]) => (existing.length < maxTradingDays / 2 ? monthsBack : 2);

const fetchRecentMonths = async (
  indexType: IndexType,
  existing: MarketPoint[],
  progress: {
    completed: number;
    total: number;
    onProgress?: (progress: TwseUpdateProgress) => void;
  },
  signal?: AbortSignal,
) => {
  const now = new Date();
  const monthCount = getRefreshMonthCount(existing);
  const months = Array.from({ length: monthCount }, (_, index) => addMonths(now, index - monthCount + 1));
  const fetched: MarketPoint[] = [];

  for (const month of months) {
    signal?.throwIfAborted();
    progress.onProgress?.({
      completed: progress.completed,
      total: progress.total,
      label: `讀取 ${indexLabel[indexType]} ${toMonthParam(month).slice(0, 6)}`,
    });
    const payload = await fetchMonth(indexType, month, signal);
    fetched.push(...parsePayload(payload, indexType, month));
    progress.completed += 1;
    progress.onProgress?.({
      completed: progress.completed,
      total: progress.total,
      label: `完成 ${indexLabel[indexType]} ${toMonthParam(month).slice(0, 6)}`,
    });
    await sleep(requestDelayMs, signal);
  }

  return mergeAndTrim(existing, fetched);
};

const buildMetadata = (price: MarketPoint[], totalReturn: MarketPoint[]): MarketMetadata => {
  const lastUpdated = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(new Date())
    .replace(' ', 'T');

  return {
    lastUpdated: `${lastUpdated}+08:00`,
    source: 'TWSE',
    status: 'ok',
    generatedBy: 'browser manual update',
    priceDataCount: price.length,
    totalReturnDataCount: totalReturn.length,
    priceLatestDate: price[price.length - 1]?.date ?? '',
    totalReturnLatestDate: totalReturn[totalReturn.length - 1]?.date ?? '',
  };
};

export const updateTwseDataInStorage = async (
  onProgress?: (progress: TwseUpdateProgress) => void,
  seedData?: {
    price: MarketPoint[];
    totalReturn: MarketPoint[];
  },
  signal?: AbortSignal,
): Promise<UpdateOutcome> => {
  signal?.throwIfAborted();
  const stored = readStoredMarketData();
  const { date: today, hour } = taipeiDateParts();
  const hasTodayData = stored?.metadata.priceLatestDate === today && stored.metadata.totalReturnLatestDate === today;
  const checkedToday = stored?.lastCheckedAt.slice(0, 10) === today;

  if (hasTodayData) {
    return {
      status: 'skipped',
      stored,
      message: '本地資料已是今日最新資料，未重新連線 TWSE。',
    };
  }

  if (stored && checkedToday && hour < eveningRefreshHour) {
    return {
      status: 'skipped',
      stored,
      message: '今日已檢查過 TWSE，晚間 19:00 後可再次檢查收盤資料。',
    };
  }

  if (stored?.noTodayDataDate === today && hour >= eveningRefreshHour) {
    return {
      status: 'skipped',
      stored,
      message: '今日已在晚間檢查過 TWSE，尚無今日資料，未重複查詢。',
    };
  }

  const existingPrice = stored?.price ?? seedData?.price ?? [];
  const existingTotalReturn = stored?.totalReturn ?? seedData?.totalReturn ?? [];
  const progress = {
    completed: 0,
    total: getRefreshMonthCount(existingPrice) + getRefreshMonthCount(existingTotalReturn),
    onProgress,
  };
  const price = await fetchRecentMonths('price', existingPrice, progress, signal);
  const totalReturn = await fetchRecentMonths('totalReturn', existingTotalReturn, progress, signal);
  const metadata = buildMetadata(price, totalReturn);
  const fetchedToday = metadata.priceLatestDate === today && metadata.totalReturnLatestDate === today;
  const nextStored: StoredMarketData = {
    price,
    totalReturn,
    metadata,
    lastCheckedAt: metadata.lastUpdated,
    noTodayDataDate: !fetchedToday && hour >= eveningRefreshHour ? today : undefined,
  };

  writeStoredMarketData(nextStored);

  return {
    status: 'updated',
    stored: nextStored,
    message: fetchedToday ? '已更新到今日 TWSE 資料。' : '已檢查 TWSE，目前尚無今日資料。',
  };
};
