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
    <section className="rounded-lg border border-slate-800 bg-panel p-5 shadow-xl shadow-black/15">
      <div className="grid gap-5">
        <div>
          <h2 className="text-lg font-semibold text-white">快速設定</h2>
          <p className="mt-1 text-sm text-slate-500">調整指數類型與回落門檻。</p>
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
