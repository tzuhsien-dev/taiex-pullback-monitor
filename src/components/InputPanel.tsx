import { RefreshCcw, Upload } from 'lucide-react';
import type { IndexType, PullbackParams } from '../types';
import { Field, inputClass } from './Field';

type InputPanelProps = {
  indexType: IndexType;
  params: PullbackParams;
  csvError?: string;
  dataError?: string;
  onIndexTypeChange: (indexType: IndexType) => void;
  onParamsChange: (params: PullbackParams) => void;
  onCsvUpload: (content: string) => void;
  onReloadStaticData: () => void;
};

export function InputPanel({
  indexType,
  params,
  csvError,
  dataError,
  onIndexTypeChange,
  onParamsChange,
  onCsvUpload,
  onReloadStaticData,
}: InputPanelProps) {
  const updateParam = (key: keyof PullbackParams, value: string) => {
    onParamsChange({
      ...params,
      [key]: key === 'lookbackDays' ? Number(value) : Number(value) / 100,
    });
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">資料與參數</h2>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-ink px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-100"
          type="button"
          onClick={onReloadStaticData}
        >
          <RefreshCcw className="h-4 w-4" />
          重新載入靜態資料
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="指數類型">
          <select className={inputClass} value={indexType} onChange={(event) => onIndexTypeChange(event.target.value as IndexType)}>
            <option value="price">加權指數</option>
            <option value="totalReturn">加權報酬指數</option>
          </select>
        </Field>
        <Field label="觀察期 N 日">
          <input className={inputClass} min="5" type="number" value={params.lookbackDays} onChange={(event) => updateParam('lookbackDays', event.target.value)} />
        </Field>
        <Field label="回落門檻 %">
          <input className={inputClass} min="0" step="0.1" type="number" value={params.pullbackThreshold * 100} onChange={(event) => updateParam('pullbackThreshold', event.target.value)} />
        </Field>
        <Field label="接近門檻提示 %">
          <input className={inputClass} min="0" step="0.1" type="number" value={params.nearThreshold * 100} onChange={(event) => updateParam('nearThreshold', event.target.value)} />
        </Field>
      </div>

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
