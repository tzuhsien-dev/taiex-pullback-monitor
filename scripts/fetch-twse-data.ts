import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

type MarketPoint = {
  date: string;
  index: number;
};

type TwsePayload = {
  stat?: string;
  title?: string;
  fields?: string[];
  data?: string[][];
};

const endpoints = {
  price: 'https://www.twse.com.tw/indicesReport/MI_5MINS_HIST',
  totalReturn: 'https://www.twse.com.tw/indicesReport/MFI94U',
};

const outputDir = path.resolve('public/data');
const maxTradingDays = 1000;
const monthsBack = 60;
const minTradingDays = 250;
const requestDelayMs = 180;
const maxFetchAttempts = 4;

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  return next;
};

const toMonthParam = (date: Date) => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}01`;

const indexLabel = {
  price: '加權指數',
  totalReturn: '加權報酬指數',
};

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

const findFieldIndex = (fields: string[], candidates: string[]) => {
  const index = fields.findIndex((field) => candidates.some((candidate) => field.replace(/\s/g, '').includes(candidate)));
  return index;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchMonth = async (endpoint: string, month: Date, kind: 'price' | 'totalReturn') => {
  const url = `${endpoint}?response=json&date=${toMonthParam(month)}`;

  for (let attempt = 1; attempt <= maxFetchAttempts; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'taiex-pullback-monitor/1.0',
      },
    });

    if (!response.ok) {
      if (attempt === maxFetchAttempts) {
        throw new Error(`${indexLabel[kind]} ${toMonthParam(month)}: TWSE request failed ${response.status} ${url}`);
      }

      await sleep(requestDelayMs * attempt);
      continue;
    }

    const payload = (await response.json()) as TwsePayload;

    if (payload.stat !== 'OK') {
      if (attempt === maxFetchAttempts) {
        throw new Error(`${indexLabel[kind]} ${toMonthParam(month)}: TWSE stat is not OK (${payload.stat ?? 'missing stat'})`);
      }

      console.warn(`${indexLabel[kind]} ${toMonthParam(month)}: TWSE stat is not OK (${payload.stat ?? 'missing stat'}), retry ${attempt}/${maxFetchAttempts}`);
      await sleep(requestDelayMs * attempt);
      continue;
    }

    if (!Array.isArray(payload.fields) || !Array.isArray(payload.data)) {
      throw new Error(`${indexLabel[kind]} ${toMonthParam(month)}: TWSE response format changed, missing fields/data`);
    }

    return payload;
  }

  throw new Error(`${indexLabel[kind]} ${toMonthParam(month)}: TWSE request failed after ${maxFetchAttempts} attempts`);
};

const parsePayload = (payload: TwsePayload, kind: 'price' | 'totalReturn', month: Date) => {
  const fields = payload.fields ?? [];
  const dateIndex = findFieldIndex(fields, ['日期']);
  const valueIndex =
    kind === 'price'
      ? findFieldIndex(fields, ['收盤指數'])
      : findFieldIndex(fields, ['發行量加權股價報酬指數']);

  if (dateIndex === -1) {
    throw new Error(`${indexLabel[kind]} ${toMonthParam(month)}: TWSE response format changed, missing 日期 field in ${payload.title ?? 'unknown title'}`);
  }

  if (valueIndex === -1) {
    const expected = kind === 'price' ? '收盤指數' : '發行量加權股價報酬指數';
    throw new Error(`${indexLabel[kind]} ${toMonthParam(month)}: TWSE response format changed, missing ${expected} field in ${payload.title ?? 'unknown title'}`);
  }

  return (payload.data ?? []).map((row, rowIndex) => ({
    date: parseTwseDate(row[dateIndex] ?? '', `${indexLabel[kind]} ${toMonthParam(month)} row ${rowIndex + 1}`),
    index: parseNumber(row[valueIndex] ?? '', `${indexLabel[kind]} ${toMonthParam(month)} row ${rowIndex + 1}`),
  }));
};

const validateIndexData = (kind: 'price' | 'totalReturn', points: MarketPoint[]) => {
  if (points.length < minTradingDays) {
    throw new Error(`${indexLabel[kind]}: 資料筆數不足，至少需要 ${minTradingDays} 筆，目前 ${points.length} 筆`);
  }

  if (points.length > maxTradingDays) {
    throw new Error(`${indexLabel[kind]}: 資料筆數超過 ${maxTradingDays} 筆，目前 ${points.length} 筆`);
  }

  const seenDates = new Set<string>();

  points.forEach((point, index) => {
    if (!point.date || Number.isNaN(new Date(point.date).getTime())) {
      throw new Error(`${indexLabel[kind]}: 第 ${index + 1} 筆日期不合法：${point.date}`);
    }

    if (!Number.isFinite(point.index) || point.index <= 0) {
      throw new Error(`${indexLabel[kind]}: 第 ${index + 1} 筆 index 不合法：${point.index}`);
    }

    if (seenDates.has(point.date)) {
      throw new Error(`${indexLabel[kind]}: 日期重複：${point.date}`);
    }
    seenDates.add(point.date);

    if (index > 0 && new Date(points[index - 1].date).getTime() >= new Date(point.date).getTime()) {
      throw new Error(`${indexLabel[kind]}: 日期未依舊到新排序：${points[index - 1].date} -> ${point.date}`);
    }
  });

  const latest = points[points.length - 1];
  const latestAgeDays = (Date.now() - new Date(`${latest.date}T00:00:00+08:00`).getTime()) / 86_400_000;

  if (latestAgeDays > 14) {
    throw new Error(`${indexLabel[kind]}: 最新資料日期 ${latest.date} 距今超過 14 天，可能抓取失敗`);
  }
};

const fetchIndexData = async (kind: 'price' | 'totalReturn') => {
  const now = new Date();
  const months = Array.from({ length: monthsBack }, (_, index) => addMonths(now, index - monthsBack + 1));
  const points: MarketPoint[] = [];

  for (const month of months) {
    const payload = await fetchMonth(endpoints[kind], month, kind);
    points.push(...parsePayload(payload, kind, month));
    await sleep(requestDelayMs);
  }

  const unique = new Map(points.map((point) => [point.date, point]));
  const sorted = [...unique.values()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const trimmed = sorted.slice(-maxTradingDays);

  if (trimmed.length === 0) {
    throw new Error(`${kind} data is empty after parsing TWSE responses.`);
  }

  validateIndexData(kind, trimmed);

  return trimmed;
};

const writeJson = async (filename: string, value: unknown) => {
  await writeFile(path.join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
};

const main = async () => {
  await mkdir(outputDir, { recursive: true });

  const priceData = await fetchIndexData('price');
  const totalReturnData = await fetchIndexData('totalReturn');
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

  await writeJson('taiex-price.json', priceData);
  await writeJson('taiex-total-return.json', totalReturnData);
  await writeJson('metadata.json', {
    lastUpdated: `${lastUpdated}+08:00`,
    source: 'TWSE',
    status: 'ok',
    generatedBy: 'scripts/fetch-twse-data.ts',
    priceDataCount: priceData.length,
    totalReturnDataCount: totalReturnData.length,
    priceLatestDate: priceData[priceData.length - 1].date,
    totalReturnLatestDate: totalReturnData[totalReturnData.length - 1].date,
  });

  console.log(`Wrote ${priceData.length} price points and ${totalReturnData.length} total-return points.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
