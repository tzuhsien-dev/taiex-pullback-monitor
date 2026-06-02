import { ShieldAlert } from 'lucide-react';

export function RiskFooter() {
  return (
    <footer className="border-t border-amber-300/30 bg-ink/95 px-4 py-2 backdrop-blur sm:fixed sm:inset-x-0 sm:bottom-0 sm:z-20 sm:py-3">
      <div className="mx-auto flex max-w-7xl items-start gap-2 text-xs leading-5 text-amber-100 sm:gap-3 sm:text-sm">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300 sm:h-5 sm:w-5" />
        <p>此工具僅用於歷史資料與條件篩選，不構成投資建議。指數回落訊號不代表未來報酬或進出場建議。</p>
      </div>
    </footer>
  );
}
