import type { PullbackStatus } from '../types';

const statusClass: Record<PullbackStatus, string> = {
  triggered: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  near: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
  normal: 'border-slate-600 bg-slate-700/30 text-slate-200',
};

export function StatusBadge({ status, text }: { status: PullbackStatus; text: string }) {
  return <span className={`inline-flex rounded-md border px-3 py-1 text-sm font-semibold ${statusClass[status]}`}>{text}</span>;
}
