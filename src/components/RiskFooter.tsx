import { ShieldAlert } from 'lucide-react';

export function RiskFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-amber-300/30 bg-ink/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-start gap-3 text-sm text-amber-100">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <p>此工具僅用於歷史資料與條件篩選，不構成投資建議。指數回落訊號不代表未來報酬或進出場建議。</p>
      </div>
    </footer>
  );
}
