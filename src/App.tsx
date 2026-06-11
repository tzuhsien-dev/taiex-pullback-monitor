import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertSummary } from './components/AlertSummary';
import { DataActions } from './components/DataActions';
import { HistoricalDistribution } from './components/HistoricalDistribution';
import { IndexChart } from './components/IndexChart';
import { InputPanel } from './components/InputPanel';
import { KeyMetricsBar } from './components/KeyMetricsBar';
import { RiskFooter } from './components/RiskFooter';
import { calculatePullback, sampleData } from './lib/calculations';
import { parseMarketCsv } from './lib/csv';
import { getDataHealth } from './lib/dataHealth';
import { loadMarketData, loadStaticMarketData } from './lib/loadData';
import {
  clearStoredMarketData,
  readStoredPreferences,
  writeStoredPreferences,
} from './lib/storage';
import { updateTwseDataInStorage, type TwseUpdateProgress } from './lib/twseClient';
import type {
  DataSource,
  IndexType,
  MarketMetadata,
  MarketPoint,
  PullbackParams,
} from './types';

const initialParams: PullbackParams = {
  highLowMode: 'volatilityAdjustedZigZag',
  lookbackDays: 250,
  pullbackThreshold: 0.1,
  pivotThreshold: 0.05,
  volLookback: 20,
  volatilityMultiplier: 3,
  minThreshold: 0.03,
  maxThreshold: 0.1,
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
  const [storedPreferences] = useState(readStoredPreferences);
  const [indexType, setIndexType] = useState<IndexType>(storedPreferences?.indexType ?? 'price');
  const [params, setParams] = useState<PullbackParams>(storedPreferences?.params ?? initialParams);
  const [points, setPoints] = useState<MarketPoint[]>(sampleData);
  const [metadata, setMetadata] = useState<MarketMetadata | null>(null);
  const [source, setSource] = useState<DataSource>('sample');
  const [sourceError, setSourceError] = useState<string>();
  const [csvIndexType, setCsvIndexType] = useState<IndexType | null>(null);
  const [csvStatus, setCsvStatus] = useState<string>();
  const [staticSeed, setStaticSeed] = useState<{ price: MarketPoint[]; totalReturn: MarketPoint[] } | null>(null);
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ kind: 'idle' });
  const [updateProgress, setUpdateProgress] = useState<TwseUpdateProgress | null>(null);
  const updateAbortController = useRef<AbortController | null>(null);

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
    if (csvIndexType === indexType) return;

    let active = true;

    loadMarketData(indexType).then((loaded) => {
      if (!active) return;
      setPoints(loaded.points);
      setMetadata(loaded.metadata);
      setSource(loaded.source);
      setSourceError(loaded.error);
      setCsvIndexType(null);
      setCsvStatus(undefined);
    });

    return () => {
      active = false;
    };
  }, [csvIndexType, indexType]);

  useEffect(() => {
    let active = true;
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

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    writeStoredPreferences({ indexType, params });
  }, [indexType, params]);

  const result = useMemo(() => calculatePullback(points, params), [params, points]);
  const dataHealth = useMemo(
    () => getDataHealth(source, metadata, result.latestDate, sourceError),
    [metadata, result.latestDate, source, sourceError],
  );

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

    const abortController = new AbortController();
    updateAbortController.current = abortController;

    try {
      const seedData = staticSeed ?? (await loadStaticSeed()) ?? undefined;
      const outcome = await updateTwseDataInStorage(setUpdateProgress, seedData, abortController.signal);
      if (outcome.stored && source !== 'csv') {
        setPoints(outcome.stored[indexType]);
        setMetadata(outcome.stored.metadata);
        setSource('storage');
        setSourceError(undefined);
      }
      setUpdateStatus({ kind: 'success', message: outcome.message });
    } catch (error) {
      const cancelled = error instanceof DOMException && error.name === 'AbortError';
      setUpdateStatus({
        kind: cancelled ? 'success' : 'error',
        message: cancelled ? '已取消 TWSE 資料更新。' : error instanceof Error ? error.message : 'TWSE 資料更新失敗。',
      });
    } finally {
      updateAbortController.current = null;
      setIsUpdatingData(false);
      setUpdateProgress(null);
    }
  };

  const handleCancelUpdate = () => {
    updateAbortController.current?.abort();
  };

  const handleClearStoredData = async () => {
    if (!window.confirm('確定要清除瀏覽器中的 TWSE 手動更新資料嗎？')) return;
    clearStoredMarketData();
    setUpdateStatus({ kind: 'success', message: '已清除本地手動更新資料。' });
    setUpdateProgress(null);

    if (source === 'csv') return;

    const loaded = await loadMarketData(indexType);
    setPoints(loaded.points);
    setMetadata(loaded.metadata);
    setSource(loaded.source);
    setSourceError(loaded.error);
  };

  const handleCsvUpload = async (file: File) => {
    try {
      const csvPoints = parseMarketCsv(await file.text());
      setPoints(csvPoints);
      setMetadata(null);
      setSource('csv');
      setSourceError(undefined);
      setCsvIndexType(indexType);
      setCsvStatus(`${file.name} · ${csvPoints.length} 筆 · ${csvPoints[0].date} 至 ${csvPoints[csvPoints.length - 1].date}`);
      setUpdateStatus({ kind: 'success', message: 'CSV 已套用至目前指數。' });
    } catch (error) {
      setUpdateStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'CSV 讀取失敗。',
      });
    }
  };

  const handleClearCsv = async () => {
    const loaded = await loadMarketData(indexType);
    setPoints(loaded.points);
    setMetadata(loaded.metadata);
    setSource(loaded.source);
    setSourceError(loaded.error);
    setCsvIndexType(null);
    setCsvStatus(undefined);
    setUpdateStatus({ kind: 'success', message: '已停止使用 CSV 資料。' });
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
            latestDate={result.latestDate}
            metadata={metadata}
            source={source}
            updateProgress={updateProgress}
            updateStatus={updateStatus}
            onCancel={handleCancelUpdate}
            onClear={handleClearStoredData}
            onUpdate={handleManualUpdate}
          />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <AlertSummary result={result} params={params} dataHealth={dataHealth} />
        <IndexChart
          points={points}
          resetKey={`${source}:${indexType}:${params.lookbackDays}:${params.highLowMode}:${points[0]?.date}:${result.latestDate}`}
          result={result}
        />
        <KeyMetricsBar result={result} indexType={indexType} />
        <InputPanel
          indexType={indexType}
          params={params}
          source={source}
          csvStatus={csvStatus}
          onClearCsv={handleClearCsv}
          onCsvUpload={handleCsvUpload}
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
