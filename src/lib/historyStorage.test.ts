import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearHistoryStorage,
  getCompletedHistoryMonths,
  getHistoryPoints,
  getHistoryStorageSummary,
  putHistoryMonth,
  readHistoryMarketData,
  writeHistoryMetadata,
} from './historyStorage';
import type { MarketMetadata } from '../types';

const metadata: MarketMetadata = {
  lastUpdated: '2026-06-11T20:00:00+08:00',
  source: 'TWSE',
  status: 'ok',
  generatedBy: 'test',
  priceDataCount: 2,
  totalReturnDataCount: 1,
  priceLatestDate: '2026-02-02',
  totalReturnLatestDate: '2026-01-02',
};

describe('historyStorage', () => {
  beforeEach(async () => {
    await clearHistoryStorage();
  });

  it('stores months atomically and replaces stale points from the same month', async () => {
    await putHistoryMonth('price', '202601', [
      { date: '2026-01-02', index: 100 },
      { date: '2026-01-05', index: 101 },
    ]);
    await putHistoryMonth('price', '202601', [
      { date: '2026-01-02', index: 102 },
    ]);

    expect(await getHistoryPoints('price')).toEqual([{ date: '2026-01-02', index: 102 }]);
    expect(await getCompletedHistoryMonths()).toEqual(new Set(['price:202601']));
  });

  it('rebuilds full market data and reports its local range', async () => {
    await putHistoryMonth('price', '202601', [{ date: '2026-01-02', index: 100 }]);
    await putHistoryMonth('price', '202602', [{ date: '2026-02-02', index: 110 }]);
    await putHistoryMonth('totalReturn', '202601', [{ date: '2026-01-02', index: 200 }]);
    await writeHistoryMetadata(metadata);

    const stored = await readHistoryMarketData();
    expect(stored?.price).toHaveLength(2);
    expect(stored?.totalReturn).toHaveLength(1);

    expect(await getHistoryStorageSummary()).toMatchObject({
      price: {
        count: 2,
        earliestDate: '2026-01-02',
        latestDate: '2026-02-02',
      },
      totalReturn: {
        count: 1,
        earliestDate: '2026-01-02',
        latestDate: '2026-01-02',
      },
      completedMonths: 3,
      lastSyncedAt: metadata.lastUpdated,
    });
  });

  it('clears points, month markers and metadata together', async () => {
    await putHistoryMonth('price', '202601', [{ date: '2026-01-02', index: 100 }]);
    await writeHistoryMetadata(metadata);
    await clearHistoryStorage();

    expect(await getHistoryPoints('price')).toEqual([]);
    expect((await getCompletedHistoryMonths()).size).toBe(0);
    expect(await readHistoryMarketData()).toBeNull();
  });
});
