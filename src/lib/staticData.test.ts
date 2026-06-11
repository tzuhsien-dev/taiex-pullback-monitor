import { describe, expect, it } from 'vitest';
import metadata from '../../public/data/metadata.json';
import price from '../../public/data/taiex-price.json';
import totalReturn from '../../public/data/taiex-total-return.json';

const expectValidSeries = (
  points: Array<{ date: string; index: number }>,
  expectedFirstDate: string,
  expectedCount: number,
  expectedLatestDate: string,
) => {
  expect(points.length).toBe(expectedCount);
  expect(points[0]?.date).toBe(expectedFirstDate);
  expect(points.at(-1)?.date).toBe(expectedLatestDate);
  expect(new Set(points.map((point) => point.date)).size).toBe(points.length);
  expect(points.every((point) => Number.isFinite(point.index) && point.index > 0)).toBe(true);
  expect(points.every((point, index) => index === 0 || points[index - 1].date < point.date)).toBe(true);
};

describe('static TWSE history', () => {
  it('matches metadata and contains the full official ranges', () => {
    expectValidSeries(price, '1999-01-05', metadata.priceDataCount, metadata.priceLatestDate);
    expectValidSeries(
      totalReturn,
      '2003-01-02',
      metadata.totalReturnDataCount,
      metadata.totalReturnLatestDate,
    );
    expect(metadata.generatedBy).toBe('npm run data:refresh');
  });
});
