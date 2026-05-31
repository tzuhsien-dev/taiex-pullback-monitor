import { useEffect, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { DashboardCards } from './components/DashboardCards';
import { IndexChart } from './components/IndexChart';
import { InputPanel } from './components/InputPanel';
import { RiskFooter } from './components/RiskFooter';
import { calculatePullback, sampleData } from './lib/calculations';
import { parseMarketCsv } from './lib/csv';
import { loadMarketData } from './lib/loadData';
import type { DataSource, IndexType, MarketMetadata, MarketPoint, PullbackParams } from './types';

const initialParams: PullbackParams = {
  lookbackDays: 250,
  pullbackThreshold: 0.1,
  nearThreshold: 0.07,
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
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
            <Activity className="h-4 w-4" />
            GitHub Pages 靜態資料工具
          </div>
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
        <DashboardCards result={result} params={params} indexType={indexType} metadata={metadata} source={source} />
        <IndexChart result={result} />
      </main>

      <RiskFooter />
    </div>
  );
}

export default App;
