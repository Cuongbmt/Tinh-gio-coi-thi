import React from 'react';
import { FileSpreadsheet, Settings, HelpCircle, RefreshCw, Sparkles, CheckCircle2, Camera } from 'lucide-react';

interface HeaderProps {
  onLoadSample: () => void;
  onOpenConfig: () => void;
  onOpenGuide: () => void;
  onReset: () => void;
  onOpenImageOcr?: () => void;
  totalTeachers: number;
  totalSessions: number;
  mergedRoomsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSample,
  onOpenConfig,
  onOpenGuide,
  onReset,
  onOpenImageOcr,
  totalTeachers,
  totalSessions,
  mergedRoomsCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Chuyển Đổi Lịch Thi (Bảng 1) Sang Kê Khai Coi Thi (Bảng 2)
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Tự động hóa 100%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tự động tách cán bộ coi thi, gộp phòng thi ghép, phân loại ca thi và quy đổi tiết chuẩn mẫu
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            {onOpenImageOcr && (
              <button
                type="button"
                onClick={onOpenImageOcr}
                id="btn-header-image-ocr"
                title="Chèn ảnh chụp lịch thi để AI tự động trích xuất bảng mà không cần dán Excel"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-900 bg-blue-100/90 hover:bg-blue-200/90 border border-blue-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-blue-700" />
                Chèn ảnh lịch thi (AI)
              </button>
            )}

            <button
              type="button"
              onClick={onLoadSample}
              id="btn-load-sample"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Nạp dữ liệu mẫu
            </button>

            <button
              type="button"
              onClick={onOpenConfig}
              id="btn-open-config"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              Quy tắc & Ca thi
            </button>

            <button
              type="button"
              onClick={onOpenGuide}
              id="btn-open-guide"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              Công thức Excel
            </button>

            <button
              type="button"
              onClick={onReset}
              id="btn-reset-data"
              title="Xóa dữ liệu để nhập mới"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Insights Banner */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center flex-wrap gap-4">
            <span>
              <strong className="text-slate-900 font-semibold">{totalTeachers}</strong> cán bộ coi thi
            </span>
            <span className="text-slate-300">•</span>
            <span>
              <strong className="text-slate-900 font-semibold">{totalSessions}</strong> ca thi độc lập
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Đã gộp <strong className="font-semibold">{mergedRoomsCount}</strong> dòng phòng thi ghép
            </span>
          </div>

          <div className="text-slate-500 text-[11px] hidden md:block">
            Mẹo: Nhấn <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Ctrl + V</kbd> bất kỳ đâu để dán dữ liệu từ bảng Excel
          </div>
        </div>
      </div>
    </header>
  );
};
