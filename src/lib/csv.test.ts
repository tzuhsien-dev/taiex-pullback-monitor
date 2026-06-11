import { describe, expect, it } from 'vitest';
import { parseMarketCsv } from './csv';

describe('parseMarketCsv', () => {
  it('supports BOM, quoted values and keeps the last duplicate date', () => {
    const result = parseMarketCsv(
      '\uFEFFdate,index\n2026-01-02,"18,000.5"\n2026-01-02,18100\n2026-01-05,18200\n',
    );

    expect(result).toEqual([
      { date: '2026-01-02', index: 18100 },
      { date: '2026-01-05', index: 18200 },
    ]);
  });

  it('rejects invalid dates and non-positive values', () => {
    expect(() => parseMarketCsv('date,index\n2026-02-30,100')).toThrow('日期格式');
    expect(() => parseMarketCsv('date,index\n2026-01-02,0')).toThrow('正數');
  });

  it('requires the documented headers', () => {
    expect(() => parseMarketCsv('day,value\n2026-01-02,100')).toThrow('date,index');
  });
});
