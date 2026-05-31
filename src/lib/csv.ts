import type { MarketPoint } from '../types';
import { sortMarketData, validateMarketData } from './calculations';

export const parseMarketCsv = (content: string): MarketPoint[] => {
  const rows = content
    .trim()
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    throw new Error('CSV 至少需要標題列與一筆資料。');
  }

  const headers = rows[0].split(',').map((header) => header.trim().toLowerCase());
  const dateIndex = headers.indexOf('date');
  const indexIndex = headers.indexOf('index');

  if (dateIndex === -1 || indexIndex === -1) {
    throw new Error('CSV 欄位必須包含 date,index。');
  }

  const points = rows.slice(1).map((row, rowIndex) => {
    const columns = row.split(',').map((column) => column.trim());
    const date = columns[dateIndex];
    const index = Number(columns[indexIndex]);

    if (!date || Number.isNaN(index)) {
      throw new Error(`第 ${rowIndex + 2} 列格式不正確，請確認 date,index 都有值。`);
    }

    return { date, index };
  });

  const validPoints = sortMarketData(validateMarketData(points));
  if (validPoints.length === 0) {
    throw new Error('CSV 沒有可用資料。');
  }

  return validPoints;
};
