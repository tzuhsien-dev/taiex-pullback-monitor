import type { IndexType, PullbackParams } from '../types';
import { Field, inputClass } from './Field';

const pullbackThresholdOptions = [3, 5, 7, 10, 15, 20];

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
    <section className="rounded-lg border border-slate-800 bg-panel p-4 shadow-xl shadow-black/15 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(160px,0.35fr)_1fr] sm:items-end">
        <div>
          <h2 className="text-base font-semibold text-white sm:text-lg">快速設定</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">調整指數類型與回落門檻。</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="指數類型">
            <select className={inputClass} value={indexType} onChange={(event) => onIndexTypeChange(event.target.value as IndexType)}>
              <option value="price">加權指數</option>
              <option value="totalReturn">加權報酬指數</option>
            </select>
          </Field>
          <Field label="回落門檻 %">
            <select className={inputClass} value={params.pullbackThreshold * 100} onChange={(event) => updatePercentParam('pullbackThreshold', event.target.value)}>
              {pullbackThresholdOptions.map((threshold) => (
                <option key={threshold} value={threshold}>
                  {threshold}%
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </section>
  );
}
