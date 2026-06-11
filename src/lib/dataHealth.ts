import type { DataHealth, DataSource, MarketMetadata } from '../types';

const getTaipeiDateParts = (date: Date) => {
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

const previousWeekday = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  do {
    date.setUTCDate(date.getUTCDate() - 1);
  } while (date.getUTCDay() === 0 || date.getUTCDay() === 6);
  return date.toISOString().slice(0, 10);
};

const expectedLatestDate = (now: Date) => {
  const taipei = getTaipeiDateParts(now);
  const date = new Date(`${taipei.date}T00:00:00Z`);
  const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;

  if (isWeekend || taipei.hour < 19) return previousWeekday(taipei.date);
  return taipei.date;
};

const weekdayLag = (latestDate: string, expectedDate: string) => {
  let lag = 0;
  const cursor = new Date(`${latestDate}T00:00:00Z`);
  const end = new Date(`${expectedDate}T00:00:00Z`);

  while (cursor < end && lag <= 10) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6) lag += 1;
  }
  return lag;
};

export const getDataHealth = (
  source: DataSource,
  metadata: MarketMetadata | null,
  latestDate: string,
  loadError?: string,
  now = new Date(),
): DataHealth => {
  if (source === 'sample') {
    return {
      status: 'fallback',
      label: '目前不是 TWSE 真實資料',
      detail: loadError ? `靜態資料讀取失敗：${loadError}` : '靜態資料讀取失敗，已改用內建範例資料。',
    };
  }

  if (source === 'csv') {
    return {
      status: 'healthy',
      label: '使用 CSV 資料',
      detail: `目前使用上傳資料，最新日期 ${latestDate}。`,
    };
  }

  if (!metadata) {
    return {
      status: 'fallback',
      label: '資料缺少 metadata',
      detail: source === 'storage' ? '請清除本地資料後重新更新。' : '無法確認 TWSE 資料更新時間。',
    };
  }

  const expected = expectedLatestDate(now);
  const lag = weekdayLag(latestDate, expected);
  if (lag > 2) {
    return {
      status: 'stale',
      label: '資料可能過期',
      detail: `最新交易日為 ${latestDate}，目前預期至少接近 ${expected}；休市日可能造成日期差異。`,
    };
  }

  return {
    status: 'healthy',
    label: source === 'storage' ? '本地手動更新資料' : '內建靜態資料',
    detail: `TWSE 最新日期：加權 ${metadata.priceLatestDate}，報酬 ${metadata.totalReturnLatestDate}`,
  };
};
