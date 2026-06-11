import { describe, expect, it } from 'vitest';
import {
  buildChartData,
  calculatePullback,
  getNearThreshold,
  validateMarketData,
} from './calculations';
import type { MarketPoint, PullbackParams } from '../types';

const params: PullbackParams = {
  highLowMode: 'rolling',
  lookbackDays: 10,
  pullbackThreshold: 0.1,
  pivotThreshold: 0.05,
  volLookback: 5,
  volatilityMultiplier: 3,
  minThreshold: 0.03,
  maxThreshold: 0.1,
};

const points = (latest: number): MarketPoint[] => [
  { date: '2026-01-02', index: 100 },
  { date: '2026-01-05', index: latest },
];

describe('pullback calculations', () => {
  it('derives the near threshold at 70 percent of the selected threshold', () => {
    expect(getNearThreshold(0.03)).toBeCloseTo(0.021);
    expect(getNearThreshold(0.1)).toBeCloseTo(0.07);
    expect(getNearThreshold(0.2)).toBeCloseTo(0.14);
  });

  it('uses the derived near threshold and preserves exact trigger boundaries', () => {
    expect(calculatePullback(points(93), params).status).toBe('near');
    expect(calculatePullback(points(90), params).status).toBe('triggered');
    expect(calculatePullback(points(94), params).status).toBe('normal');
  });

  it('keeps the last duplicate date and removes invalid records', () => {
    expect(
      validateMarketData([
        { date: '2026-01-02', index: 100 },
        { date: '2026-01-02', index: 101 },
        { date: '2026-02-30', index: 102 },
        { date: '2026-01-03', index: -1 },
      ]),
    ).toEqual([{ date: '2026-01-02', index: 101 }]);
  });

  it('builds the chart from full history but limits threshold lines to the calculation window', () => {
    const history = [
      { date: '2026-01-01', index: 90 },
      { date: '2026-01-02', index: 100 },
      { date: '2026-01-05', index: 93 },
    ];
    const result = calculatePullback(history, { ...params, lookbackDays: 2 });
    const chart = buildChartData(history, result);

    expect(chart).toHaveLength(3);
    expect(chart[0].rollingHigh).toBeUndefined();
    expect(chart[1].rollingHigh).toBe(100);
    expect(chart[2].thresholdIndex).toBe(90);
  });
});
