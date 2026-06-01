import { useEffect, useMemo, useState } from 'react';
import { AlertSummary } from './components/AlertSummary';
import { DashboardCards } from './components/DashboardCards';
import { HistoricalDistribution } from './components/HistoricalDistribution';
import { IndexChart } from './components/IndexChart';
import { InputPanel } from './components/InputPanel';
import { RiskFooter } from './components/RiskFooter';
import { calculatePullback, sampleData } from './lib/calculations';
import { parseMarketCsv } from './lib/csv';
import { loadMarketData } from './lib/loadData';
import type { DataHealth, DataSource, IndexType, MarketMetadata, MarketPoint, PullbackParams } from './types';

const initialParams: PullbackParams = {
  highLowMode: 'rolling',
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
      detail: '目前資料由使用者上傳，不受 GitHub Actions 更新時間影響。',
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
      detail: `最後更新已超過 ${staleThresholdDays} 天，請檢查 Update TWSE data workflow。`,
    };
  }

  return {
    status: 'healthy',
    label: '資料更新正常',
    detail: `TWSE 最新日期：加權 ${metadata.priceLatestDate}，報酬 ${metadata.totalReturnLatestDate}`,
  };
};

function App() {
  const [indexType, setIndexType] = useState<IndexType>('price');
  const [params, setParams] = useState<PullbackParams>(initialParams);
  const [points, setPoints] = useState<MarketPoint[]>(sampleData);
  const [metadata, setMetadata] = useState<MarketMetadata | null>(null);
  const [source, setSource] = useState<DataSource>('sample');
  const [dataError, setDataError] = useState<string>();
  const [csvError, setCsvError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    loadMarketData(indexType).then((loaded) => {
      if (!active) return;
      setPoints(loaded.points);
      setMetadata(loaded.metadata);
      setSource(loaded.source);
      setDataError(loaded.error);
      setCsvError(undefined);
    });

    return () => {
      active = false;
    };
  }, [indexType, reloadKey]);

  const result = useMemo(() => calculatePullback(points, params), [params, points]);
  const dataHealth = useMemo(() => getDataHealth(source, metadata), [metadata, source]);

  const handleCsvUpload = (content: string) => {
    try {
      const parsed = parseMarketCsv(content);
      setPoints(parsed);
      setMetadata(null);
      setSource('csv');
      setCsvError(undefined);
      setDataError(undefined);
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'CSV 解析失敗。');
    }
  };

  const handleIndexTypeChange = (nextIndexType: IndexType) => {
    setIndexType(nextIndexType);
  };

  return (
    <div className="min-h-screen bg-ink pb-28 text-slate-100">
      <header className="border-b border-slate-800 bg-ink/90">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">台股近期高點回落監控器</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            監控加權指數或加權報酬指數是否已從使用者指定觀察期內的近期高點回落指定比例。
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <InputPanel
          csvError={csvError}
          dataError={dataError}
          indexType={indexType}
          params={params}
          onCsvUpload={handleCsvUpload}
          onIndexTypeChange={handleIndexTypeChange}
          onParamsChange={setParams}
          onReloadStaticData={() => setReloadKey((value) => value + 1)}
        />
        <DashboardCards result={result} params={params} indexType={indexType} metadata={metadata} source={source} dataHealth={dataHealth} />
        <AlertSummary result={result} params={params} indexType={indexType} dataHealth={dataHealth} />
        <HistoricalDistribution points={points} params={params} result={result} />
        <IndexChart result={result} />
      </main>

      <RiskFooter />
    </div>
  );
}

export default App;
