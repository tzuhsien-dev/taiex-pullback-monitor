import { describe, expect, it } from 'vitest';
import { getDataHealth } from './dataHealth';
import type { MarketMetadata } from '../types';

const metadata: MarketMetadata = {
  lastUpdated: '2026-06-11T20:00:00+08:00',
  source: 'TWSE',
  status: 'ok',
  generatedBy: 'test',
  priceDataCount: 100,
  totalReturnDataCount: 100,
  priceLatestDate: '2026-06-11',
  totalReturnLatestDate: '2026-06-11',
};

describe('getDataHealth', () => {
  it('uses the previous weekday before the evening refresh time', () => {
    const health = getDataHealth('static', metadata, '2026-06-10', undefined, new Date('2026-06-11T08:00:00Z'));
    expect(health.status).toBe('healthy');
  });

  it('marks data stale after more than two expected weekdays', () => {
    const health = getDataHealth('static', metadata, '2026-06-08', undefined, new Date('2026-06-11T12:00:00Z'));
    expect(health.status).toBe('stale');
  });

  it('surfaces the static load failure reason', () => {
    const health = getDataHealth('sample', null, '2025-01-01', 'metadata.json 回應 404');
    expect(health.detail).toContain('404');
  });
});
