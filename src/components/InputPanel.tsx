import type { IndexType, PullbackParams } from '../types';
import { Field, inputClass } from './Field';

type InputPanelProps = {
  indexType: IndexType;
  params: PullbackParams;
  onIndexTypeChange: (indexType: IndexType) => void;
  onParamsChange: (params: PullbackParams) => void;
};

export function InputPanel({
  indexType,
  params,
  onIndexTypeChange,
  onParamsChange,
}: InputPanelProps) {
  const updatePercentParam = (key: keyof PullbackParams, value: string) => {
    onParamsChange({
      ...params,
      [key]: Number(value) / 100,
    });
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-panel/80 p-4 shadow-xl shadow-black/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">快速設定</h2>
          <p className="mt-1 text-sm text-slate-500">只調整監控最常用的兩個條件。</p>
        </div>
        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-3xl">
        <Field label="指數類型">
          <select className={inputClass} value={indexType} onChange={(event) => onIndexTypeChange(event.target.value as IndexType)}>
            <option value="price">加權指數</option>
            <option value="totalReturn">加權報酬指數</option>
          </select>
        </Field>
        <Field label="回落門檻 %">
          <input className={inputClass} min="0" step="0.1" type="number" value={params.pullbackThreshold * 100} onChange={(event) => updatePercentParam('pullbackThreshold', event.target.value)} />
        </Field>
        </div>
      </div>
    </section>
  );
}
