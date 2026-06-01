import { Upload } from 'lucide-react';
import type { HighLowMode, IndexType, PullbackParams } from '../types';
import { Field, inputClass } from './Field';

type InputPanelProps = {
  indexType: IndexType;
  params: PullbackParams;
  csvError?: string;
  dataError?: string;
  onIndexTypeChange: (indexType: IndexType) => void;
  onParamsChange: (params: PullbackParams) => void;
  onCsvUpload: (content: string) => void;
};

export function InputPanel({
  indexType,
  params,
  csvError,
  dataError,
  onIndexTypeChange,
  onParamsChange,
  onCsvUpload,
}: InputPanelProps) {
  const updateNumberParam = (key: keyof PullbackParams, value: string) => {
    onParamsChange({
      ...params,
      [key]: Number(value),
    });
  };
  const updatePercentParam = (key: keyof PullbackParams, value: string) => {
    onParamsChange({
      ...params,
      [key]: Number(value) / 100,
    });
  };
  const updateMode = (highLowMode: HighLowMode) => {
    onParamsChange({
      ...params,
      highLowMode,
    });
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">設定</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="指數類型">
          <select className={inputClass} value={indexType} onChange={(event) => onIndexTypeChange(event.target.value as IndexType)}>
            <option value="price">加權指數</option>
            <option value="totalReturn">加權報酬指數</option>
          </select>
        </Field>
        <Field label="近期高低點判定模式">
          <select className={inputClass} value={params.highLowMode} onChange={(event) => updateMode(event.target.value as HighLowMode)}>
            <option value="rolling">固定期間高低點</option>
            <option value="zigzag">ZigZag 波段高低點</option>
            <option value="volatilityAdjustedZigZag">波動度調整 ZigZag</option>
          </select>
        </Field>
        <Field label="觀察期 N 日">
          <input className={inputClass} min="5" type="number" value={params.lookbackDays} onChange={(event) => updateNumberParam('lookbackDays', event.target.value)} />
        </Field>
        <Field label="回落門檻 %">
          <input className={inputClass} min="0" step="0.1" type="number" value={params.pullbackThreshold * 100} onChange={(event) => updatePercentParam('pullbackThreshold', event.target.value)} />
        </Field>
        <Field label="接近門檻提示 %">
          <input className={inputClass} min="0" step="0.1" type="number" value={params.nearThreshold * 100} onChange={(event) => updatePercentParam('nearThreshold', event.target.value)} />
        </Field>
        {params.highLowMode === 'zigzag' ? (
          <Field label="ZigZag 確認門檻 %">
            <input className={inputClass} min="0.1" step="0.1" type="number" value={params.pivotThreshold * 100} onChange={(event) => updatePercentParam('pivotThreshold', event.target.value)} />
          </Field>
        ) : null}
        {params.highLowMode === 'volatilityAdjustedZigZag' ? (
          <>
            <Field label="波動度觀察日數">
              <input className={inputClass} min="2" type="number" value={params.volLookback} onChange={(event) => updateNumberParam('volLookback', event.target.value)} />
            </Field>
            <Field label="波動度倍數">
              <input className={inputClass} min="0.1" step="0.1" type="number" value={params.volatilityMultiplier} onChange={(event) => updateNumberParam('volatilityMultiplier', event.target.value)} />
            </Field>
            <Field label="自動門檻下限 %">
              <input className={inputClass} min="0" step="0.1" type="number" value={params.minThreshold * 100} onChange={(event) => updatePercentParam('minThreshold', event.target.value)} />
            </Field>
            <Field label="自動門檻上限 %">
              <input className={inputClass} min="0" step="0.1" type="number" value={params.maxThreshold * 100} onChange={(event) => updatePercentParam('maxThreshold', event.target.value)} />
            </Field>
          </>
        ) : null}
      </div>

      {params.highLowMode !== 'rolling' ? (
        <p className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
          ZigZag 高低點需要等價格反向移動超過門檻後才會確認，因此不會在轉折當下即時確認。
        </p>
      ) : null}

      <div className="mt-5">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-600 bg-ink px-4 py-6 text-center transition hover:border-cyan-400 hover:bg-cyan-400/5">
          <Upload className="mb-3 h-7 w-7 text-cyan-300" />
          <span className="font-medium text-slate-100">上傳 CSV 備援資料</span>
          <span className="mt-1 text-sm text-slate-500">欄位需包含 date,index，上傳後會改用 CSV 計算</span>
          <input
            accept=".csv,text/csv"
            className="sr-only"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              file.text().then(onCsvUpload);
              event.currentTarget.value = '';
            }}
          />
        </label>
        {csvError ? <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{csvError}</p> : null}
        {dataError ? <p className="mt-3 rounded-md bg-amber-300/10 px-3 py-2 text-sm text-amber-100">靜態資料讀取失敗，已改用內建範例：{dataError}</p> : null}
      </div>
    </section>
  );
}
