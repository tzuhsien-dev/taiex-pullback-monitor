import { sortMarketData, validateMarketData } from './calculations';
import type {
  HistorySeriesSummary,
  HistoryStorageSummary,
  IndexType,
  MarketMetadata,
  MarketPoint,
  StoredMarketData,
} from '../types';

const databaseName = 'taiex-pullback-monitor';
const databaseVersion = 1;
const pointStoreName = 'marketPoints';
const monthStoreName = 'completedMonths';
const metadataStoreName = 'metadata';
const marketMetadataKey = 'marketMetadata';
const lastSyncedAtKey = 'lastSyncedAt';

type StoredPoint = MarketPoint & {
  key: string;
  indexType: IndexType;
  monthKey: string;
};

type CompletedMonth = {
  key: string;
  indexType: IndexType;
  month: string;
  pointCount: number;
  completedAt: string;
};

type MetadataEntry = {
  key: string;
  value: unknown;
};

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('此瀏覽器不支援 IndexedDB，無法儲存完整歷史資料。'));
      return;
    }

    const request = window.indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(pointStoreName)) {
        const pointStore = database.createObjectStore(pointStoreName, { keyPath: 'key' });
        pointStore.createIndex('indexType', 'indexType', { unique: false });
        pointStore.createIndex('monthKey', 'monthKey', { unique: false });
      }
      if (!database.objectStoreNames.contains(monthStoreName)) {
        const monthStore = database.createObjectStore(monthStoreName, { keyPath: 'key' });
        monthStore.createIndex('indexType', 'indexType', { unique: false });
      }
      if (!database.objectStoreNames.contains(metadataStoreName)) {
        database.createObjectStore(metadataStoreName, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('無法開啟 IndexedDB。'));
  });

const withDatabase = async <T>(operation: (database: IDBDatabase) => Promise<T>) => {
  const database = await openDatabase();
  try {
    return await operation(database);
  } finally {
    database.close();
  }
};

const deleteMonthPoints = (
  pointStore: IDBObjectStore,
  monthKey: string,
) =>
  new Promise<void>((resolve, reject) => {
    const request = pointStore.index('monthKey').openKeyCursor(IDBKeyRange.only(monthKey));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      pointStore.delete(cursor.primaryKey);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error('無法清除月份資料。'));
  });

export const putHistoryMonth = async (
  indexType: IndexType,
  month: string,
  points: MarketPoint[],
) => {
  const validPoints = sortMarketData(validateMarketData(points));
  const monthKey = `${indexType}:${month}`;

  await withDatabase(async (database) => {
    const transaction = database.transaction([pointStoreName, monthStoreName], 'readwrite');
    const done = transactionDone(transaction);
    const pointStore = transaction.objectStore(pointStoreName);
    await deleteMonthPoints(pointStore, monthKey);

    validPoints.forEach((point) => {
      const storedPoint: StoredPoint = {
        ...point,
        key: `${indexType}:${point.date}`,
        indexType,
        monthKey,
      };
      pointStore.put(storedPoint);
    });

    const completedMonth: CompletedMonth = {
      key: monthKey,
      indexType,
      month,
      pointCount: validPoints.length,
      completedAt: new Date().toISOString(),
    };
    transaction.objectStore(monthStoreName).put(completedMonth);
    await done;
  });
};

export const getHistoryPoints = async (indexType: IndexType): Promise<MarketPoint[]> =>
  withDatabase(async (database) => {
    const transaction = database.transaction(pointStoreName, 'readonly');
    const done = transactionDone(transaction);
    const records = await requestResult(
      transaction.objectStore(pointStoreName).index('indexType').getAll(indexType) as IDBRequest<StoredPoint[]>,
    );
    await done;
    return sortMarketData(records.map(({ date, index }) => ({ date, index })));
  });

export const getCompletedHistoryMonths = async () =>
  withDatabase(async (database) => {
    const transaction = database.transaction(monthStoreName, 'readonly');
    const done = transactionDone(transaction);
    const keys = await requestResult(transaction.objectStore(monthStoreName).getAllKeys());
    await done;
    return new Set(keys.map(String));
  });

export const writeHistoryMetadata = async (metadata: MarketMetadata) =>
  withDatabase(async (database) => {
    const transaction = database.transaction(metadataStoreName, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(metadataStoreName);
    store.put({ key: marketMetadataKey, value: metadata } satisfies MetadataEntry);
    store.put({ key: lastSyncedAtKey, value: metadata.lastUpdated } satisfies MetadataEntry);
    await done;
  });

const readMetadataEntry = async <T>(key: string): Promise<T | undefined> =>
  withDatabase(async (database) => {
    const transaction = database.transaction(metadataStoreName, 'readonly');
    const done = transactionDone(transaction);
    const entry = await requestResult(
      transaction.objectStore(metadataStoreName).get(key) as IDBRequest<MetadataEntry | undefined>,
    );
    await done;
    return entry?.value as T | undefined;
  });

export const readHistoryMarketData = async (): Promise<StoredMarketData | null> => {
  try {
    const [price, totalReturn, metadata] = await Promise.all([
      getHistoryPoints('price'),
      getHistoryPoints('totalReturn'),
      readMetadataEntry<MarketMetadata>(marketMetadataKey),
    ]);
    if (price.length === 0 || totalReturn.length === 0 || !metadata) return null;

    return {
      price,
      totalReturn,
      metadata,
      lastCheckedAt: metadata.lastUpdated,
    };
  } catch {
    return null;
  }
};

const summarizeSeries = (points: MarketPoint[]): HistorySeriesSummary => ({
  count: points.length,
  earliestDate: points[0]?.date ?? '',
  latestDate: points[points.length - 1]?.date ?? '',
});

export const getHistoryStorageSummary = async (): Promise<HistoryStorageSummary> => {
  try {
    const [price, totalReturn, months, lastSyncedAt] = await Promise.all([
      getHistoryPoints('price'),
      getHistoryPoints('totalReturn'),
      getCompletedHistoryMonths(),
      readMetadataEntry<string>(lastSyncedAtKey),
    ]);
    return {
      price: summarizeSeries(price),
      totalReturn: summarizeSeries(totalReturn),
      completedMonths: months.size,
      lastSyncedAt,
    };
  } catch {
    return {
      price: summarizeSeries([]),
      totalReturn: summarizeSeries([]),
      completedMonths: 0,
    };
  }
};

export const clearHistoryStorage = async () => {
  await withDatabase(async (database) => {
    const transaction = database.transaction(
      [pointStoreName, monthStoreName, metadataStoreName],
      'readwrite',
    );
    const done = transactionDone(transaction);
    transaction.objectStore(pointStoreName).clear();
    transaction.objectStore(monthStoreName).clear();
    transaction.objectStore(metadataStoreName).clear();
    await done;
  });
};
