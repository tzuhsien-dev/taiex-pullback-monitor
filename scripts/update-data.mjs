import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const dataDirectory = path.resolve('public/data');
const requestDelayMs = 180;
const requestTimeoutMs = 20_000;
const maxAttempts = 5;

const series = {
  price: {
    endpoint: 'https://www.twse.com.tw/indicesReport/MI_5MINS_HIST',
    startMonth: '199901',
    label: '加權指數',
    valueFields: ['收盤指數'],
  },
  totalReturn: {
    endpoint: 'https://www.twse.com.tw/indicesReport/MFI94U',
    startMonth: '200301',
    label: '加權報酬指數',
    valueFields: ['發行量加權股價報酬指數'],
  },
};

const getTaipeiMonth = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}${get('month')}`;
};

const addMonth = (month) => {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(4, 6)) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const listMonths = (startMonth, endMonth) => {
  const months = [];
  for (let month = startMonth; month <= endMonth; month = addMonth(month)) months.push(month);
  return months;
};

const parseNumber = (value, context) => {
  const parsed = Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) throw new Error(`${context}: 無法解析數字「${value}」`);
  return parsed;
};

const parseDate = (value, context) => {
  const parts = String(value).trim().split(/[/-]/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`${context}: 無法解析日期「${value}」`);
  }
  const [year, month, day] = parts;
  const fullYear = year < 1911 ? year + 1911 : year;
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const findFieldIndex = (fields, candidates) =>
  fields.findIndex((field) =>
    candidates.some((candidate) => String(field).replace(/\s/g, '').includes(candidate)),
  );

const requestDate = (key, month) => (key === 'price' && month === '199901' ? '19990105' : `${month}01`);

const fetchMonth = async (key, month) => {
  const config = series[key];
  const url = `${config.endpoint}?response=json&date=${requestDate(key, month)}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      if (payload.stat !== 'OK') throw new Error(`TWSE stat ${payload.stat ?? 'missing'}`);
      if (!Array.isArray(payload.fields) || !Array.isArray(payload.data)) {
        throw new Error('TWSE response missing fields/data');
      }

      const dateIndex = findFieldIndex(payload.fields, ['日期']);
      const valueIndex = findFieldIndex(payload.fields, config.valueFields);
      if (dateIndex === -1 || valueIndex === -1) throw new Error('TWSE response fields changed');

      return payload.data.map((row, index) => ({
        date: parseDate(row[dateIndex], `${config.label} ${month} row ${index + 1}`),
        index: parseNumber(row[valueIndex], `${config.label} ${month} row ${index + 1}`),
      }));
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`${config.label} ${month} 下載失敗`, { cause: error });
      }
      await sleep(requestDelayMs * attempt);
    }
  }

  return [];
};

const downloadSeries = async (key, endMonth) => {
  const config = series[key];
  const months = listMonths(config.startMonth, endMonth);
  const points = [];

  for (const [index, month] of months.entries()) {
    const monthPoints = await fetchMonth(key, month);
    points.push(...monthPoints);
    console.log(`[${config.label}] ${index + 1}/${months.length} ${month} +${monthPoints.length}`);
    await sleep(requestDelayMs);
  }

  return [...new Map(points.map((point) => [point.date, point])).values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
};

const taipeiTimestamp = () => {
  const value = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
  return `${value.replace(' ', 'T')}+08:00`;
};

const writeJsonAtomically = async (filename, value) => {
  const target = path.join(dataDirectory, filename);
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, 'utf8');
  await rename(temporary, target);
};

const main = async () => {
  const endMonth = getTaipeiMonth();
  console.log(`下載完整 TWSE 歷史資料至 ${endMonth}`);
  const [price, totalReturn] = await Promise.all([
    downloadSeries('price', endMonth),
    downloadSeries('totalReturn', endMonth),
  ]);

  if (price.length === 0 || totalReturn.length === 0) throw new Error('下載結果沒有可用資料。');

  const metadata = {
    lastUpdated: taipeiTimestamp(),
    source: 'TWSE',
    status: 'ok',
    generatedBy: 'npm run data:refresh',
    priceDataCount: price.length,
    totalReturnDataCount: totalReturn.length,
    priceLatestDate: price.at(-1).date,
    totalReturnLatestDate: totalReturn.at(-1).date,
  };

  await mkdir(dataDirectory, { recursive: true });
  await Promise.all([
    writeJsonAtomically('taiex-price.json', price),
    writeJsonAtomically('taiex-total-return.json', totalReturn),
    writeJsonAtomically('metadata.json', metadata),
  ]);
  console.log(`完成：加權 ${price.length} 筆，報酬 ${totalReturn.length} 筆`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
