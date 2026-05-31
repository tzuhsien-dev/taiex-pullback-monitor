import { Database, FileText, FlaskConical } from 'lucide-react';
import type { DataSource } from '../types';

const sourceMap = {
  actions: {
    label: 'GitHub Actions 自動更新資料',
    className: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100',
    icon: Database,
  },
  csv: {
    label: 'CSV 上傳資料',
    className: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
    icon: FileText,
  },
  sample: {
    label: '內建範例資料',
    className: 'border-amber-300/40 bg-amber-300/10 text-amber-100',
    icon: FlaskConical,
  },
};

export function DataSourceBadge({ source }: { source: DataSource }) {
  const item = sourceMap[source];
  const Icon = item.icon;

  return (
    <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm font-semibold ${item.className}`}>
      <Icon className="h-4 w-4" />
      {item.label}
    </span>
  );
}
