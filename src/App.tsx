import { useEffect, useMemo, useState } from 'react';
import { AlertSummary } from './components/AlertSummary';
import { DataActions } from './components/DataActions';
import { HistoricalDistribution } from './components/HistoricalDistribution';
import { IndexChart } from './components/IndexChart';
import { InputPanel } from './components/InputPanel';
import { KeyMetricsBar } from './components/KeyMetricsBar';
import { RiskFooter } from './components/RiskFooter';
import { calculatePullback, sampleData } from './lib/calculations';
import { loadMarketData, loadStaticMarketData } from './lib/loadData';
import { clearStoredMarketData } from './lib/storage';
import { updateTwseDataInStorage, type TwseUpdateProgress } from './lib/twseClient';
import type { DataHealth, DataSource, IndexType, MarketMetadata, MarketPoint, PullbackParams } from './types';

const initialParams: PullbackParams = {
  highLowMode: 'volatilityAdjustedZigZag',
  lookbackDays: 250,
  pullbackThreshold: 0.1,
  nearThreshold: 0.07,
  pivotThreshold: 0.05,
  volLookback: 20,
  volatilityMultiplier: 3,
  minThreshold: 0.03,
  maxThreshold: 0.1,
};

const staleThresholdDays = 5;

const getDataHealth = (source: DataSource, metadata: MarketMetadata | null): DataHealth => {
  if (source === 'sample') {
    return {
      status: 'fallback',
      label: '目前不是 TWSE 真實資料',
      detail: '靜態 JSON 或 metadata 讀取失敗，已改用內建範例資料。',
    };
  }

  if (source === 'csv') {
    return {
      status: 'healthy',
      label: '使用 CSV 資料',
      detail: '目前資料由使用者上傳，不受本地 TWSE 更新時間影響。',
    };
  }

  if (source === 'storage') {
    if (!metadata) {
      return {
        status: 'fallback',
        label: '本地資料缺少 metadata',
        detail: '請清除本地資料後重新更新。',
      };
    }

    return {
      status: 'healthy',
      label: '本地手動更新資料',
      detail: `TWSE 最新日期：加權 ${metadata.priceLatestDate}，報酬 ${metadata.totalReturnLatestDate}`,
    };
  }

  if (!metadata) {
    return {
      status: 'fallback',
      label: 'metadata 缺失',
      detail: '無法確認 TWSE 資料更新時間。',
    };
  }

  const updatedAt = new Date(metadata.lastUpdated).getTime();
  const ageDays = Number.isFinite(updatedAt) ? (Date.now() - updatedAt) / 86_400_000 : Infinity;

  if (ageDays > staleThresholdDays) {
    return {
      status: 'stale',
      label: '資料可能過期',
      detail: `最後更新已超過 ${staleThresholdDays} 天，請按「更新最新資料」檢查 TWSE。`,
    };
  }

  return {
    status: 'healthy',
    label: '內建靜態資料',
    detail: `TWSE 最新日期：加權 ${metadata.priceLatestDate}，報酬 ${metadata.totalReturnLatestDate}`,
  };
};

type UpdateStatus = {
  kind: 'idle' | 'success' | 'error';
  message?: string;
};

const getTaipeiToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}`;
};

function App() {
  const [indexType, setIndexType] = useState<IndexType>('price');
  const [params, setParams] = useState<PullbackParams>(initialParams);
  const [points, setPoints] = useState<MarketPoint[]>(sampleData);
  const [metadata, setMetadata] = useState<MarketMetadata | null>(null);
  const [source, setSource] = useState<DataSource>('sample');
  const [staticSeed, setStaticSeed] = useState<{ price: MarketPoint[]; totalReturn: MarketPoint[] } | null>(null);
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ kind: 'idle' });
  const [updateProgress, setUpdateProgress] = useState<TwseUpdateProgress | null>(null);

  const loadStaticSeed = async () => {
    const [priceLoaded, totalReturnLoaded] = await Promise.all([
      loadStaticMarketData('price'),
      loadStaticMarketData('totalReturn'),
    ]);

    if (priceLoaded.source !== 'static' || totalReturnLoaded.source !== 'static') {
      return null;
    }

    const seed = {
      price: priceLoaded.points,
      totalReturn: totalReturnLoaded.points,
    };
    setStaticSeed(seed);
    return seed;
  };

  useEffect(() => {
    if (source === 'csv') return;

    let active = true;

    loadMarketData(indexType).then((loaded) => {
      if (!active) return;
      setPoints(loaded.points);
      setMetadata(loaded.metadata);
      setSource(loaded.source);
    });

    if (!staticSeed) {
      Promise.all([loadStaticMarketData('price'), loadStaticMarketData('totalReturn')]).then(
        ([priceLoaded, totalReturnLoaded]) => {
          if (!active) return;
          if (priceLoaded.source === 'static' && totalReturnLoaded.source === 'static') {
            setStaticSeed({
              price: priceLoaded.points,
              totalReturn: totalReturnLoaded.points,
            });
          }
        },
      );
    }

    return () => {
      active = false;
    };
  }, [indexType]);

  const result = useMemo(() => calculatePullback(points, params), [params, points]);
  const dataHealth = useMemo(() => getDataHealth(source, metadata), [metadata, source]);

  const handleIndexTypeChange = (nextIndexType: IndexType) => {
    setIndexType(nextIndexType);
  };

  const handleManualUpdate = async () => {
    const today = getTaipeiToday();
    if (metadata?.priceLatestDate === today && metadata.totalReturnLatestDate === today) {
      setUpdateStatus({ kind: 'success', message: '目前資料已是今日最新資料，未重新連線 TWSE。' });
      setUpdateProgress(null);
      return;
    }

    setIsUpdatingData(true);
    setUpdateStatus({ kind: 'idle' });
    setUpdateProgress({
      completed: 0,
      total: 1,
      label: '準備連線 TWSE',
    });

    try {
      const seedData = source === 'static' ? staticSeed ?? (await loadStaticSeed()) ?? undefined : undefined;
      const outcome = await updateTwseDataInStorage(setUpdateProgress, seedData);
      if (outcome.stored) {
        setPoints(outcome.stored[indexType]);
        setMetadata(outcome.stored.metadata);
        setSource('storage');
      }
      setUpdateStatus({ kind: 'success', message: outcome.message });
    } catch (error) {
      setUpdateStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'TWSE 資料更新失敗。',
      });
    } finally {
      setIsUpdatingData(false);
      setUpdateProgress(null);
    }
  };

  const handleClearStoredData = async () => {
    clearStoredMarketData();
    setUpdateStatus({ kind: 'success', message: '已清除本地手動更新資料。' });
    setUpdateProgress(null);

    if (source === 'csv') return;

    const loaded = await loadMarketData(indexType);
    setPoints(loaded.points);
    setMetadata(loaded.metadata);
    setSource(loaded.source);
  };

  return (
    <div className="min-h-screen bg-ink pb-0 text-slate-100 sm:pb-28">
      <header className="border-b border-slate-800 bg-ink/90">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">台股近期高點回落監控器</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              監控加權指數或加權報酬指數是否已從使用者指定觀察期內的近期高點回落指定比例。
            </p>
          </div>
          <DataActions
            isUpdating={isUpdatingData}
            metadata={metadata}
            source={source}
            updateProgress={updateProgress}
            updateStatus={updateStatus}
            onClear={handleClearStoredData}
            onUpdate={handleManualUpdate}
          />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <AlertSummary result={result} params={params} dataHealth={dataHealth} />
        <IndexChart result={result} />
        <KeyMetricsBar result={result} indexType={indexType} />
        <InputPanel
          indexType={indexType}
          params={params}
          onIndexTypeChange={handleIndexTypeChange}
          onParamsChange={setParams}
        />
        <HistoricalDistribution points={points} params={params} result={result} />
      </main>

      <RiskFooter />
    </div>
  );
}

export default App;
