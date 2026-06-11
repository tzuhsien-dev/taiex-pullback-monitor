import { cloneElement, useId, type ReactElement } from 'react';

type FieldProps = {
  label: string;
  children: ReactElement<{ id?: string }>;
  hint?: string;
};

export function Field({ label, children, hint }: FieldProps) {
  const generatedId = useId();
  const fieldId = children.props.id ?? generatedId;

  return (
    <div className="block">
      <label className="mb-1.5 block text-xs font-medium text-slate-300 sm:mb-2 sm:text-sm" htmlFor={fieldId}>
        {label}
      </label>
      {cloneElement(children, { id: fieldId })}
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </div>
  );
}

export const inputClass =
  'w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 sm:py-2.5';
