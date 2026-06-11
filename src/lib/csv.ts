import Papa from 'papaparse';
import type { MarketPoint } from '../types';
import { sortMarketData, validateMarketData } from './calculations';

export const parseMarketCsv = (content: string): MarketPoint[] => {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    const row = typeof firstError.row === 'number' ? `第 ${firstError.row + 2} 列` : 'CSV';
    throw new Error(`${row}無法解析：${firstError.message}`);
  }

  if (!parsed.meta.fields?.includes('date') || !parsed.meta.fields.includes('index')) {
    throw new Error('CSV 欄位必須包含 date,index。');
  }

  const points = parsed.data.map((row, rowIndex) => {
    const date = row.date?.trim();
    const index = Number(row.index?.replace(/,/g, '').trim());

    if (!date || !Number.isFinite(index) || index <= 0) {
      throw new Error(`第 ${rowIndex + 2} 列格式不正確，date 必須有效且 index 必須為正數。`);
    }

    return { date, index };
  });

  const validPoints = sortMarketData(validateMarketData(points));
  if (validPoints.length !== new Set(points.map((point) => point.date)).size) {
    throw new Error('CSV 含有無效日期，日期格式必須為 YYYY-MM-DD。');
  }
  if (validPoints.length === 0) {
    throw new Error('CSV 至少需要一筆可用資料。');
  }

  return validPoints;
};
