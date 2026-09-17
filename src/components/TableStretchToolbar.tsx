import React, { useState } from 'react';
import {
  MoveHorizontal,
  MoveVertical,
  RotateCcw,
  SlidersHorizontal,
  WrapText,
  AlignJustify,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';
import { RowDensity, DENSITY_CONFIG } from '../hooks/useTableResizer';

interface TableStretchToolbarProps {
  density: RowDensity;
  onChangeDensity: (density: RowDensity) => void;
  verticalPadding: number;
  onChangeVerticalPadding: (val: number) => void;
  wrapText: boolean;
  onToggleWrapText: (val: boolean) => void;
  onReset: () => void;
  tableName?: string;
}

export const TableStretchToolbar: React.FC<TableStretchToolbarProps> = ({
  density,
  onChangeDensity,
  verticalPadding,
  onChangeVerticalPadding,
  wrapText,
  onToggleWrapText,
  onReset,
  tableName = 'bảng',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-50/90 border-b border-slate-200 px-3 py-1.5 text-xs text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Quick density & stretch triggers */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
            <MoveHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>Kéo dãn ô:</span>
          </div>

          {/* Quick Density presets */}
          <div className="inline-flex rounded-md p-0.5 bg-slate-200/70 border border-slate-300/80">
            {(Object.keys(DENSITY_CONFIG) as RowDensity[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChangeDensity(d)}
                className={`px-2 py-0.5 text-[11px] rounded transition-all ${
                  density === d
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`Đặt độ giãn ô mức: ${DENSITY_CONFIG[d].label}`}
              >
                {d === 'compact' && 'Gọn'}
                {d === 'normal' && 'Vừa'}
                {d === 'comfortable' && 'Thoáng'}
                {d === 'spacious' && 'Rộng'}
              </button>
            ))}
          </div>

          {/* Text wrap toggle */}
          <button
            type="button"
            onClick={() => onToggleWrapText(!wrapText)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] transition-colors ${
              wrapText
                ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Bật/Tắt tự động xuống dòng trong các ô"
          >
            {wrapText ? (
              <WrapText className="w-3 h-3 text-blue-600" />
            ) : (
              <AlignJustify className="w-3 h-3 text-slate-500" />
            )}
            <span>{wrapText ? 'Xuống dòng' : 'Cắt 1 dòng'}</span>
          </button>

          {/* More slider toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] transition-colors ${
              isExpanded
                ? 'bg-slate-200 border-slate-300 text-slate-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Mở thanh trượt tinh chỉnh độ cao ô chi tiết"
          >
            <SlidersHorizontal className="w-3 h-3 text-slate-500" />
            <span>Chỉnh tinh ({verticalPadding * 2 + 18}px)</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Right: Hint & Reset button */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="hidden sm:inline-block text-slate-500 italic">
            💡 Rê chuột vào vách ngăn cột rồi <strong>kéo</strong> để dãn rộng/hẹp
          </span>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
            title="Khôi phục kích thước các cột và ô về mặc định"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại kích thước</span>
          </button>
        </div>
      </div>

      {/* Expanded Slider for Pixel-precise vertical height stretch */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-4 text-xs bg-white/80 p-2 rounded-md">
          <div className="flex items-center gap-2">
            <MoveVertical className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-700 text-[11px]">
              Kéo dãn độ cao ô:
            </span>
            <input
              type="range"
              min={2}
              max={28}
              step={1}
              value={verticalPadding}
              onChange={(e) => onChangeVerticalPadding(Number(e.target.value))}
              className="w-36 sm:w-48 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              Đệm: {verticalPadding}px (Cao ~{verticalPadding * 2 + 20}px)
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>Nhanh:</span>
            <button
              type="button"
              onClick={() => onChangeVerticalPadding(3)}
              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              24px
            </button>
            <button
              type="button"
              onClick={() => onChangeVerticalPadding(8)}
              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              36px
            </button>
            <button
              type="button"
              onClick={() => onChangeVerticalPadding(14)}
              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              48px
            </button>
            <button
              type="button"
              onClick={() => onChangeVerticalPadding(22)}
              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
            >
              64px
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
