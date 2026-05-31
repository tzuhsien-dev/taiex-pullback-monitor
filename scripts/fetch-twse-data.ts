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

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  return next;
};

const toMonthParam = (date: Date) => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}01`;

const parseNumber = (value: string) => {
  const parsed = Number(value.replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`無法解析數字：${value}`);
  }
  return parsed;
};

const parseTwseDate = (value: string) => {
  const parts = value.trim().split(/[/-]/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`無法解析日期：${value}`);
  }

  const [year, month, day] = parts;
  const fullYear = year < 1911 ? year + 1911 : year;
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const findFieldIndex = (fields: string[], candidates: string[]) => {
  const index = fields.findIndex((field) => candidates.some((candidate) => field.replace(/\s/g, '').includes(candidate)));
  return index;
};

const fetchMonth = async (endpoint: string, month: Date) => {
  const url = `${endpoint}?response=json&date=${toMonthParam(month)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'taiex-pullback-monitor/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`TWSE request failed: ${response.status} ${url}`);
  }

  const payload = (await response.json()) as TwsePayload;

  if (payload.stat !== 'OK') {
    throw new Error(`TWSE stat is not OK for ${url}: ${payload.stat ?? 'missing stat'}`);
  }

  if (!Array.isArray(payload.fields) || !Array.isArray(payload.data)) {
    throw new Error(`TWSE response format changed for ${url}: missing fields/data`);
  }

  return payload;
};

const parsePayload = (payload: TwsePayload, kind: 'price' | 'totalReturn') => {
  const fields = payload.fields ?? [];
  const dateIndex = findFieldIndex(fields, ['日期']);
  const valueIndex =
    kind === 'price'
      ? findFieldIndex(fields, ['收盤指數'])
      : findFieldIndex(fields, ['發行量加權股價報酬指數']);

  if (dateIndex === -1) {
    throw new Error(`TWSE response format changed: missing 日期 field in ${payload.title ?? 'unknown title'}`);
  }

  if (valueIndex === -1) {
    const expected = kind === 'price' ? '收盤指數' : '發行量加權股價報酬指數';
    throw new Error(`TWSE response format changed: missing ${expected} field in ${payload.title ?? 'unknown title'}`);
  }

  return (payload.data ?? []).map((row) => ({
    date: parseTwseDate(row[dateIndex] ?? ''),
    index: parseNumber(row[valueIndex] ?? ''),
  }));
};

const fetchIndexData = async (kind: 'price' | 'totalReturn') => {
  const now = new Date();
  const months = Array.from({ length: monthsBack }, (_, index) => addMonths(now, index - monthsBack + 1));
  const points: MarketPoint[] = [];

  for (const month of months) {
    const payload = await fetchMonth(endpoints[kind], month);
    points.push(...parsePayload(payload, kind));
  }

  const unique = new Map(points.map((point) => [point.date, point]));
  const sorted = [...unique.values()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const trimmed = sorted.slice(-maxTradingDays);

  if (trimmed.length === 0) {
    throw new Error(`${kind} data is empty after parsing TWSE responses.`);
  }

  return trimmed;
};

const writeJson = async (filename: string, value: unknown) => {
  await writeFile(path.join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
};

const main = async () => {
  await mkdir(outputDir, { recursive: true });

  const [priceData, totalReturnData] = await Promise.all([fetchIndexData('price'), fetchIndexData('totalReturn')]);
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
    priceDataCount: priceData.length,
    totalReturnDataCount: totalReturnData.length,
  });

  console.log(`Wrote ${priceData.length} price points and ${totalReturnData.length} total-return points.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
