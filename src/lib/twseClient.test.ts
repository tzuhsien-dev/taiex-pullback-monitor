import { describe, expect, it } from 'vitest';
import { buildHistoryMonthPlan, getTwseRequestDate } from './twseClient';

describe('TWSE full history planning', () => {
  it('uses the official first available date for the price index', () => {
    expect(getTwseRequestDate('price', '19990101')).toBe('19990105');
    expect(getTwseRequestDate('price', '19990201')).toBe('19990201');
    expect(getTwseRequestDate('totalReturn', '20030101')).toBe('20030101');
  });

  it('plans every available month for both indices', () => {
    const tasks = buildHistoryMonthPlan(new Set(), '202606');
    expect(tasks).toHaveLength(612);
    expect(tasks[0]).toEqual({ indexType: 'price', month: '199901' });
    expect(tasks.at(-1)).toEqual({ indexType: 'totalReturn', month: '202606' });
  });

  it('skips completed months but always refreshes the current month', () => {
    const completed = new Set([
      'price:199901',
      'price:202606',
      'totalReturn:200301',
      'totalReturn:202606',
    ]);
    const tasks = buildHistoryMonthPlan(completed, '202606');

    expect(tasks).toHaveLength(610);
    expect(tasks).toContainEqual({ indexType: 'price', month: '202606' });
    expect(tasks).toContainEqual({ indexType: 'totalReturn', month: '202606' });
    expect(tasks).not.toContainEqual({ indexType: 'price', month: '199901' });
  });
});
