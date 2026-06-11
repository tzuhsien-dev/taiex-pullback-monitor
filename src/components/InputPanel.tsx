import { Upload, X } from 'lucide-react';
import type { DataSource, IndexType, PullbackParams } from '../types';
import { formatPercent, getNearThreshold } from '../lib/calculations';
import { Field, inputClass } from './Field';

const pullbackThresholdOptions = [3, 5, 7, 10, 15, 20];
const lookbackOptions = [60, 120, 250, 500];

type InputPanelProps = {
  indexType: IndexType;
  params: PullbackParams;
  source: DataSource;
  csvStatus?: string;
  onIndexTypeChange: (indexType: IndexType) => void;
  onParamsChange: (params: PullbackParams) => void;
  onCsvUpload: (file: File) => void;
  onClearCsv: () => void;
};

export function InputPanel({
  indexType,
  params,
  source,
  csvStatus,
  onIndexTypeChange,
  onParamsChange,
  onCsvUpload,
  onClearCsv,
}: InputPanelProps) {
  const updatePercentParam = (key: keyof PullbackParams, value: string) => {
    onParamsChange({
      ...params,
      [key]: Number(value) / 100,
    });
  };

  const updateNumberParam = (key: keyof PullbackParams, value: string) => {
    onParamsChange({
      ...params,
      [key]: Number(value),
    });
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-xl shadow-black/15 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(160px,0.35fr)_1fr]">
        <div>
          <h2 className="text-base font-semibold text-white sm:text-lg">快速設定</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">調整指數類型與回落門檻。</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="指數類型">
            <select className={inputClass} value={indexType} onChange={(event) => onIndexTypeChange(event.target.value as IndexType)}>
              <option value="price">加權指數</option>
              <option value="totalReturn">加權報酬指數</option>
            </select>
          </Field>
          <Field
            label="回落門檻 %"
            hint={`接近提示：${formatPercent(getNearThreshold(params.pullbackThreshold))}`}
          >
            <select className={inputClass} value={params.pullbackThreshold * 100} onChange={(event) => updatePercentParam('pullbackThreshold', event.target.value)}>
              {pullbackThresholdOptions.map((threshold) => (
                <option key={threshold} value={threshold}>
                  {threshold}%
                </option>
              ))}
            </select>
          </Field>
          <Field label="觀察期">
            <select className={inputClass} value={params.lookbackDays} onChange={(event) => updateNumberParam('lookbackDays', event.target.value)}>
              {lookbackOptions.map((days) => (
                <option key={days} value={days}>{days} 個交易日</option>
              ))}
            </select>
          </Field>
          <Field label="高低點模式">
            <select
              className={inputClass}
              value={params.highLowMode}
              onChange={(event) => onParamsChange({ ...params, highLowMode: event.target.value as PullbackParams['highLowMode'] })}
            >
              <option value="rolling">固定期間高低點</option>
              <option value="zigzag">ZigZag</option>
              <option value="volatilityAdjustedZigZag">波動度調整 ZigZag</option>
            </select>
          </Field>
        </div>
      </div>

      {params.highLowMode !== 'rolling' ? (
        <div className="mt-4 grid gap-4 border-t border-slate-800 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {params.highLowMode === 'zigzag' ? (
            <Field label="Pivot 門檻 %">
              <input className={inputClass} min="1" max="30" step="0.5" type="number" value={params.pivotThreshold * 100} onChange={(event) => updatePercentParam('pivotThreshold', event.target.value)} />
            </Field>
          ) : (
            <>
              <Field label="波動觀察期">
                <input className={inputClass} min="5" max="120" step="1" type="number" value={params.volLookback} onChange={(event) => updateNumberParam('volLookback', event.target.value)} />
              </Field>
              <Field label="波動倍數">
                <input className={inputClass} min="0.5" max="10" step="0.5" type="number" value={params.volatilityMultiplier} onChange={(event) => updateNumberParam('volatilityMultiplier', event.target.value)} />
              </Field>
              <Field label="最小 Pivot %">
                <input className={inputClass} min="1" max="30" step="0.5" type="number" value={params.minThreshold * 100} onChange={(event) => updatePercentParam('minThreshold', event.target.value)} />
              </Field>
              <Field label="最大 Pivot %">
                <input className={inputClass} min="1" max="30" step="0.5" type="number" value={params.maxThreshold * 100} onChange={(event) => updatePercentParam('maxThreshold', event.target.value)} />
              </Field>
            </>
          )}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-300">CSV 備援資料</div>
          <div className="mt-1 text-xs text-slate-500">{csvStatus ?? '支援 date,index 欄位，套用於目前選擇的指數。'}</div>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-100">
            <Upload className="h-4 w-4" />
            上傳 CSV
            <input
              accept=".csv,text/csv"
              className="sr-only"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onCsvUpload(file);
                event.target.value = '';
              }}
            />
          </label>
          {source === 'csv' ? (
            <button className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-red-300/50 hover:text-red-100" type="button" onClick={onClearCsv}>
              <X className="h-4 w-4" />
              清除 CSV
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
