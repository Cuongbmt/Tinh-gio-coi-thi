import React, { useState, useMemo } from 'react';
import { TeacherSummary, ConversionRules } from '../types';
import {
  Download,
  Copy,
  Search,
  Check,
  ChevronDown,
  ChevronRight,
  Printer,
  Info,
  Clock,
  UserCheck,
  FileCheck2,
} from 'lucide-react';
import { exportTable2ToExcel, generateClipboardTextForExcel } from '../utils/excelExport';
import { useTableResizer } from '../hooks/useTableResizer';
import { TableStretchToolbar } from './TableStretchToolbar';
import { ResizeColumnHandle } from './ResizeColumnHandle';

const DEFAULT_TABLE2_WIDTHS: Record<string, number> = {
  teacherName: 360,
  ngay: 110,
  ca: 55,
  gioHC: 80,
  gioNG: 80,
  gioCong: 85,
  tietHC: 85,
  tietNG: 85,
  tietCong: 85,
};

interface Table2OutputProps {
  teachers: TeacherSummary[];
  rules: ConversionRules;
  mergedRoomsCount: number;
}

export const Table2Output: React.FC<Table2OutputProps> = ({
  teachers,
  rules,
  mergedRoomsCount,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [collapsedTeachers, setCollapsedTeachers] = useState<Record<string, boolean>>({});

  // Hook quản lý kéo dãn ô và độ cao dòng cho Bảng 2
  const {
    columnWidths,
    density,
    verticalPadding,
    setVerticalPadding,
    wrapText,
    setWrapText,
    activeResizingCol,
    startColResize,
    resetColWidth,
    resetAllWidths,
    setDensity,
    densityConfig,
    totalTableWidth,
  } = useTableResizer({
    storageKey: 'table2',
    defaultWidths: DEFAULT_TABLE2_WIDTHS,
    defaultDensity: 'normal',
  });

  // Tìm kiếm theo tên cán bộ
  const filteredTeachers = useMemo(() => {
    if (!searchTerm.trim()) return teachers;
    const term = searchTerm.toLowerCase();
    return teachers.filter(
      (t) =>
        t.teacherName.toLowerCase().includes(term) ||
        t.entries.some((e) => e.description.toLowerCase().includes(term))
    );
  }, [teachers, searchTerm]);

  // Thống kê toàn bộ
  const totalStats = useMemo(() => {
    let gioHC = 0;
    let gioNG = 0;
    let gioCong = 0;
    let tietHC = 0;
    let tietNG = 0;
    let tietCong = 0;
    let totalDetailsCount = 0;

    for (const t of teachers) {
      gioHC += t.totalGioHanhChinh;
      gioNG += t.totalGioNgoaiGio;
      gioCong += t.totalGioCong;
      tietHC += t.totalTietHanhChinh;
      tietNG += t.totalTietNgoaiGio;
      tietCong += t.totalTietCong;
      totalDetailsCount += t.entries.length;
    }

    return {
      gioHC,
      gioNG,
      gioCong,
      tietHC: Number(tietHC.toFixed(rules.roundDecimals)),
      tietNG: Number(tietNG.toFixed(rules.roundDecimals)),
      tietCong: Number(tietCong.toFixed(rules.roundDecimals)),
      totalDetailsCount,
    };
  }, [teachers, rules.roundDecimals]);

  // Sao chép dạng bảng vào clipboard
  const handleCopyClipboard = async () => {
    const text = generateClipboardTextForExcel(teachers);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback nếu browser chặn
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    exportTable2ToExcel(teachers);
  };

  // Thu gọn / mở rộng cán bộ
  const toggleCollapse = (name: string) => {
    setCollapsedTeachers((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const toggleAll = (collapse: boolean) => {
    const newState: Record<string, boolean> = {};
    for (const t of teachers) {
      newState[t.teacherName] = collapse;
    }
    setCollapsedTeachers(newState);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Table 2 Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Bảng 2: Kê Khai Giờ Coi Thi & Quy Đổi Tiết (Kết quả chuẩn)
          </h2>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
            {teachers.length} cán bộ
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyClipboard}
            id="btn-copy-clipboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
            title="Sao chép toàn bộ dữ liệu để dán (Ctrl+V) vào file Excel"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Đã chép vào bộ nhớ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Sao chép vào Excel</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            id="btn-export-excel"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
            title="Tải về file Excel (.xlsx) định dạng chuẩn 2 tầng tiêu đề"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="In hoặc Lưu PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Collapse Controls */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên cán bộ, môn, phòng..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleAll(false)}
            className="text-[11px] text-slate-600 hover:text-slate-900 underline"
          >
            Mở rộng tất cả
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => toggleAll(true)}
            className="text-[11px] text-slate-600 hover:text-slate-900 underline"
          >
            Thu gọn chi tiết
          </button>
        </div>
      </div>

      {/* Thanh công cụ Kéo dãn ô & Độ cao dòng cho Bảng 2 */}
      <TableStretchToolbar
        density={density}
        onChangeDensity={setDensity}
        verticalPadding={verticalPadding}
        onChangeVerticalPadding={setVerticalPadding}
        wrapText={wrapText}
        onToggleWrapText={setWrapText}
        onReset={resetAllWidths}
        tableName="Bảng 2"
      />

      {/* Formula Indicator Banner */}
      <div className="px-4 py-2 bg-sky-50 border-b border-sky-200 text-sky-950 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-sky-600 text-white font-mono text-[11px] font-bold">
            fx
          </span>
          <span>
            <strong>Công thức quy đổi tiết Hành chính:</strong>{' '}
            <code className="px-1.5 py-0.5 bg-white border border-sky-300 rounded font-mono font-bold text-sky-800">
              =D/50*0.5*1.1
            </code>{' '}
            <span className="text-slate-600">
              (với D là số phút: 90 phút / 50 × 0.5 × 1.1 = <strong>0.99 tiết</strong>/ca)
            </span>
          </span>
        </div>
        <div className="text-[11px] text-sky-700">
          Xuất Excel giữ nguyên 100% công thức động cho tất cả cán bộ
        </div>
      </div>

      {/* Notice Banner for Merged Rooms & Rule Explanation */}
      {mergedRoomsCount > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Xử lý phòng ghép:</strong> Đã tự động phát hiện và gộp{' '}
              <strong>{mergedRoomsCount} dòng lớp thi ghép</strong> (như lớp EE24M và LM24M). Mỗi
              cán bộ coi thi được tính chính xác 1 ca (90 phút), không bị nhân đôi giờ!
            </span>
          </div>
        </div>
      )}

      {/* Table 2 Main Spreadsheet */}
      <div className="flex-1 overflow-auto">
        {filteredTeachers.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <FileCheck2 className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">Không có dữ liệu phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">
              Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc nạp dữ liệu ở Bảng 1.
            </p>
          </div>
        ) : (
          <table
            className="w-full text-xs text-left border-collapse table-fixed"
            style={{ minWidth: `${totalTableWidth}px` }}
            id="table-2-grid"
          >
            <colgroup>
              <col style={{ width: `${columnWidths.teacherName}px` }} />
              <col style={{ width: `${columnWidths.ngay}px` }} />
              <col style={{ width: `${columnWidths.ca}px` }} />
              <col style={{ width: `${columnWidths.gioHC}px` }} />
              <col style={{ width: `${columnWidths.gioNG}px` }} />
              <col style={{ width: `${columnWidths.gioCong}px` }} />
              <col style={{ width: `${columnWidths.tietHC}px` }} />
              <col style={{ width: `${columnWidths.tietNG}px` }} />
              <col style={{ width: `${columnWidths.tietCong}px` }} />
            </colgroup>

            {/* Two-tier headers matching Image 2 */}
            <thead>
              {/* Row 1 of Header */}
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center sticky top-0 z-20 shadow-2xs select-none">
                <th
                  rowSpan={2}
                  className="py-2 px-3 text-left border-r border-slate-300 bg-slate-100 relative"
                >
                  <span>Họ và tên</span>
                  <ResizeColumnHandle
                    colKey="teacherName"
                    isResizing={activeResizingCol === 'teacherName'}
                    onMouseDown={startColResize}
                    onDoubleClick={resetColWidth}
                  />
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 border-r border-slate-300 bg-slate-100 relative"
                >
                  <span>Ngày</span>
                  <ResizeColumnHandle
                    colKey="ngay"
                    isResizing={activeResizingCol === 'ngay'}
                    onMouseDown={startColResize}
                    onDoubleClick={resetColWidth}
                  />
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 border-r border-slate-300 bg-slate-100 relative"
                >
                  <span>ca</span>
                  <ResizeColumnHandle
                    colKey="ca"
                    isResizing={activeResizingCol === 'ca'}
                    onMouseDown={startColResize}
                    onDoubleClick={resetColWidth}
                  />
                </th>
                <th
                  colSpan={3}
                  className="py-1 px-2 border-r border-slate-300 bg-slate-200/80 text-slate-900"
                >
                  Giờ coi thi (phút)
                </th>
                <th colSpan={3} className="py-1 px-2 bg-emerald-100/70 text-emerald-950">
                  Quy đổi tiết
                </th>
              </tr>

              {/* Row 2 of Header */}
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 text-center sticky top-[33px] z-20 shadow-xs select-none">
                <th className="py-1 px-2 border-r border-slate-200 bg-slate-100 relative">
                  <span title="Ca 1 (7h00), Ca 2 (9h30), Ca 3 (13h00), Ca 4 (15h30)">Trong giờ</span>
                  <ResizeColumnHandle
                    colKey="gioHC"
                    isResizing={activeResizingCol === 'gioHC'}
                    onMouseDown={startColResize}
                    onDoubleClick={resetColWidth}
                  />
                </th>
                <th className="py-1 px-2 border-r border-amber-200 bg-amber-100/80 text-amber-950 font-bold relative">
                  <span title="Ca 5 (18h00) ngoài giờ">Ngoài giờ</span>
                  <ResizeColumnHandle
                    colKey="gioNG"
                    isResizing={activeResizingCol === 'gioNG'}
                    onMouseDown={startColResize}
                    onDoubleClick={resetColWidth}
                  />
                </th>
                <th className="py-1 px-2 border-r border-slate-300 bg-slate-200 font-bold text-slate-900 relative">
                  <span>Cộng</span>
                  <ResizeColumnHandle
                    colKey="gioCong"
                    isResizing={activeResizingCol === 'gioCong'}
                    onMouseDown={startColResize}
                    onDoubleClick={resetColWidth}
                  />
                </th>
                <th className="py-1 px-2 border-r border-slate-200 bg-emerald-50 text-emerald-900 relative">
                  <span title="Ca 1, 2, 3, 4 trong giờ">Trong giờ</span>
                  <ResizeColumnHandle
                    colKey="tietHC"
                    isResizing={activeResizingCol === 'tietHC'}
                    onMouseDown={startColResize}
                    onDoubleClick={resetColWidth}
                  />
                </th>
                <th className="py-1 px-2 border-r border-amber-200 bg-amber-100/80 text-amber-950 font-bold relative">
                  <span title="Ca 5 (18h00) ngoài giờ">Ngoài giờ</span>
                  <ResizeColumnHandle
                    colKey="tietNG"
                    isResizing={activeResizingCol === 'tietNG'}
                    onMouseDown={startColResize}
                    onDoubleClick={resetColWidth}
                  />
                </th>
                <th className="py-1 px-2 bg-emerald-100 font-bold text-emerald-950 relative">
                  <span>Cộng</span>
                  <ResizeColumnHandle
                    colKey="tietCong"
                    isResizing={activeResizingCol === 'tietCong'}
                    onMouseDown={startColResize}
                    onDoubleClick={resetColWidth}
                  />
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredTeachers.map((teacher) => {
                const isCollapsed = collapsedTeachers[teacher.teacherName];
                const cellPaddingStyle = {
                  paddingTop: `${verticalPadding}px`,
                  paddingBottom: `${verticalPadding}px`,
                };

                return (
                  <React.Fragment key={teacher.teacherName}>
                    {/* DÒNG TỔNG HỢP CỦA CÁN BỘ (LÀM NỔI BẬT RÕ RỆT ĐỂ DỄ THEO DÕI) */}
                    <tr className="bg-slate-100/90 hover:bg-blue-50/80 font-bold text-slate-900 border-t-2 border-t-slate-400 border-b border-b-slate-300 shadow-2xs transition-colors group">
                      {/* Cột 1: Tên cán bộ coi thi */}
                      <td style={cellPaddingStyle} className="border-r border-slate-300 border-l-4 border-l-blue-600">
                        <div className="flex items-center justify-between px-3 gap-2">
                          <button
                            type="button"
                            onClick={() => toggleCollapse(teacher.teacherName)}
                            className="flex items-center gap-2 hover:text-blue-700 text-left font-extrabold tracking-tight truncate cursor-pointer"
                            title={isCollapsed ? 'Bấm để mở chi tiết ca thi' : 'Bấm để thu gọn'}
                          >
                            <span className="p-0.5 rounded bg-white border border-slate-300 text-slate-600 group-hover:border-blue-400 group-hover:text-blue-600 transition-colors">
                              {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                              )}
                            </span>
                            <span className={`text-slate-950 font-black ${densityConfig.fontSize}`}>
                              {teacher.teacherName}
                            </span>
                          </button>
                          <span className="shrink-0 text-[11px] font-bold text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-full border border-blue-300 shadow-2xs">
                            {teacher.entries.length} ca
                          </span>
                        </div>
                      </td>

                      {/* Ngày (Trống ở dòng tổng) */}
                      <td style={cellPaddingStyle} className="px-2 text-center border-r border-slate-300 text-slate-400 font-semibold select-none">
                        —
                      </td>

                      {/* ca (Trống ở dòng tổng) */}
                      <td style={cellPaddingStyle} className="px-2 text-center border-r border-slate-300 text-slate-400 font-semibold select-none">
                        —
                      </td>

                      {/* Giờ Trong giờ Tổng */}
                      <td style={cellPaddingStyle} className={`px-2 text-right border-r border-slate-300 font-mono font-bold text-slate-900 bg-slate-100/60 ${densityConfig.fontSize}`}>
                        {teacher.totalGioHanhChinh > 0 ? teacher.totalGioHanhChinh : ''}
                      </td>

                      {/* Giờ Ngoài giờ Tổng */}
                      <td style={cellPaddingStyle} className={`px-2 text-right border-r border-slate-300 font-mono font-bold ${teacher.totalGioNgoaiGio > 0 ? 'bg-amber-100/80 text-amber-950' : 'text-slate-400'} ${densityConfig.fontSize}`}>
                        {teacher.totalGioNgoaiGio > 0 ? teacher.totalGioNgoaiGio : ''}
                      </td>

                      {/* Giờ Cộng Tổng */}
                      <td style={cellPaddingStyle} className={`px-2 text-right border-r border-slate-300 font-mono bg-slate-200/90 font-black text-slate-950 ${densityConfig.fontSize}`}>
                        {teacher.totalGioCong}
                      </td>

                      {/* Tiết Trong giờ Tổng */}
                      <td style={cellPaddingStyle} className={`px-2 text-right border-r border-slate-300 font-mono font-bold text-emerald-950 bg-emerald-50/70 ${densityConfig.fontSize}`}>
                        {teacher.totalTietHanhChinh > 0 ? teacher.totalTietHanhChinh.toFixed(2) : ''}
                      </td>

                      {/* Tiết Ngoài giờ Tổng */}
                      <td style={cellPaddingStyle} className={`px-2 text-right border-r border-slate-300 font-mono font-bold ${teacher.totalTietNgoaiGio > 0 ? 'bg-amber-100/90 text-amber-950' : 'text-slate-400'} ${densityConfig.fontSize}`}>
                        {teacher.totalTietNgoaiGio > 0 ? teacher.totalTietNgoaiGio.toFixed(2) : ''}
                      </td>

                      {/* Tiết Cộng Tổng */}
                      <td style={cellPaddingStyle} className={`px-2 text-right font-mono bg-emerald-200 font-black text-emerald-950 border-l border-emerald-400 ${densityConfig.fontSize}`}>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-300/70 text-emerald-950 font-black shadow-2xs">
                          {teacher.totalTietCong.toFixed(2)}
                        </span>
                      </td>
                    </tr>

                    {/* CÁC DÒNG CHI TIẾT CA THI CỦA CÁN BỘ (Format: Ngày ca: ... - Học phần - phòng: ...) */}
                    {!isCollapsed &&
                      teacher.entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-blue-50/30 text-slate-700 transition-colors"
                        >
                          {/* Mô tả ca thi */}
                          <td style={cellPaddingStyle} className="border-r border-slate-200 text-slate-800">
                            <div className={`flex items-center justify-between pl-6 pr-3 gap-2 ${!wrapText ? 'truncate' : ''}`}>
                              <span className={`font-normal ${densityConfig.fontSize} ${!wrapText ? 'truncate' : ''}`}>
                                {entry.description}
                              </span>
                              {entry.lopNames.length > 1 && (
                                <span
                                  title={`Gộp chung phòng thi các lớp: ${entry.lopNames.join(', ')} -> Tính đúng 1 ca (90 phút)`}
                                  className="shrink-0 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded ml-2 font-medium flex items-center gap-1"
                                >
                                  <span>Gộp 1 ca:</span>
                                  <strong className="font-bold">{entry.lopNames.join('+')}</strong>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Ngày */}
                          <td style={cellPaddingStyle} className={`px-2 text-center border-r border-slate-200 font-mono text-slate-600 ${densityConfig.fontSize}`}>
                            {entry.ngay}
                          </td>

                          {/* ca */}
                          <td style={cellPaddingStyle} className={`px-2 text-center border-r border-slate-200 font-mono font-medium ${densityConfig.fontSize}`}>
                            {entry.gioNgoaiGio > 0 ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 inline-flex items-center gap-0.5"
                                title="Ca 5 (18h00) - Ngoài giờ"
                              >
                                <span>ca {entry.ca}</span>
                                <span className="text-[9px] text-amber-700">(Ngoài giờ)</span>
                              </span>
                            ) : (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 inline-flex items-center gap-0.5"
                                title={`Ca ${entry.ca} - Trong giờ`}
                              >
                                <span>ca {entry.ca}</span>
                              </span>
                            )}
                          </td>

                          {/* Giờ Hành chính */}
                          <td style={cellPaddingStyle} className={`px-2 text-right border-r border-slate-200 font-mono text-slate-700 ${densityConfig.fontSize}`}>
                            {entry.gioHanhChinh > 0 ? entry.gioHanhChinh : ''}
                          </td>

                          {/* Giờ Ngoài giờ */}
                          <td style={cellPaddingStyle} className={`px-2 text-right border-r border-slate-200 font-mono ${entry.gioNgoaiGio > 0 ? 'bg-amber-50/80 text-amber-950 font-bold' : 'text-slate-500'} ${densityConfig.fontSize}`}>
                            {entry.gioNgoaiGio > 0 ? entry.gioNgoaiGio : ''}
                          </td>

                          {/* Giờ Cộng */}
                          <td style={cellPaddingStyle} className={`px-2 text-right border-r border-slate-300 font-mono font-semibold text-slate-900 bg-slate-50 ${densityConfig.fontSize}`}>
                            {entry.gioCong}
                          </td>

                          {/* Tiết Hành chính */}
                          <td style={cellPaddingStyle} className={`px-2 text-right border-r border-slate-200 font-mono text-slate-700 ${densityConfig.fontSize}`}>
                            {entry.tietHanhChinh > 0 ? entry.tietHanhChinh.toFixed(2) : ''}
                          </td>

                          {/* Tiết Ngoài giờ */}
                          <td style={cellPaddingStyle} className={`px-2 text-right border-r border-slate-200 font-mono ${entry.tietNgoaiGio > 0 ? 'bg-amber-50/80 text-amber-950 font-bold' : 'text-slate-700'} ${densityConfig.fontSize}`}>
                            {entry.tietNgoaiGio > 0 ? entry.tietNgoaiGio.toFixed(2) : ''}
                          </td>

                          {/* Tiết Cộng */}
                          <td style={cellPaddingStyle} className={`px-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/50 ${densityConfig.fontSize}`}>
                            {entry.tietCong.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}

              {/* DÒNG TỔNG CỘNG TOÀN BẢNG (GRAND TOTAL) */}
              <tr className="bg-slate-200/95 font-black text-slate-900 border-t-4 border-slate-500 shadow-sm">
                <td
                  style={{
                    paddingTop: `${verticalPadding + 3}px`,
                    paddingBottom: `${verticalPadding + 3}px`,
                  }}
                  className={`px-3 border-r border-slate-300 uppercase tracking-wide text-slate-950 font-black flex items-center justify-between ${densityConfig.fontSize}`}
                >
                  <span>TỔNG CỘNG TOÀN TRƯỜNG</span>
                  <span className="text-[11px] font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-300">
                    {teachers.length} cán bộ • {totalStats.totalDetailsCount} lượt coi
                  </span>
                </td>
                <td className="border-r border-slate-300 text-center font-bold text-slate-400">—</td>
                <td className="border-r border-slate-300 text-center font-bold text-slate-400">—</td>
                <td
                  style={{
                    paddingTop: `${verticalPadding + 3}px`,
                    paddingBottom: `${verticalPadding + 3}px`,
                  }}
                  className={`px-2 text-right border-r border-slate-300 font-mono font-black text-slate-900 bg-slate-200/60 ${densityConfig.fontSize}`}
                >
                  {totalStats.gioHC}
                </td>
                <td
                  style={{
                    paddingTop: `${verticalPadding + 3}px`,
                    paddingBottom: `${verticalPadding + 3}px`,
                  }}
                  className={`px-2 text-right border-r border-slate-300 font-mono font-black text-amber-950 bg-amber-200/70 ${densityConfig.fontSize}`}
                >
                  {totalStats.gioNG}
                </td>
                <td
                  style={{
                    paddingTop: `${verticalPadding + 3}px`,
                    paddingBottom: `${verticalPadding + 3}px`,
                  }}
                  className={`px-2 text-right border-r border-slate-400 font-mono font-black text-slate-950 bg-slate-300 ${densityConfig.fontSize}`}
                >
                  {totalStats.gioCong}
                </td>
                <td
                  style={{
                    paddingTop: `${verticalPadding + 3}px`,
                    paddingBottom: `${verticalPadding + 3}px`,
                  }}
                  className={`px-2 text-right border-r border-slate-300 font-mono font-black text-emerald-950 bg-emerald-100/70 ${densityConfig.fontSize}`}
                >
                  {totalStats.tietHC.toFixed(2)}
                </td>
                <td
                  style={{
                    paddingTop: `${verticalPadding + 3}px`,
                    paddingBottom: `${verticalPadding + 3}px`,
                  }}
                  className={`px-2 text-right border-r border-slate-300 font-mono font-black text-amber-950 bg-amber-200/80 ${densityConfig.fontSize}`}
                >
                  {totalStats.tietNG.toFixed(2)}
                </td>
                <td
                  style={{
                    paddingTop: `${verticalPadding + 3}px`,
                    paddingBottom: `${verticalPadding + 3}px`,
                  }}
                  className={`px-2 text-right font-mono font-black text-emerald-950 bg-emerald-300/90 border-l-2 border-emerald-500 ${densityConfig.fontSize}`}
                >
                  <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-400/80 text-emerald-950 font-black shadow-2xs">
                    {totalStats.tietCong.toFixed(2)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Table 2 Footer Quick Stats */}
      <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 text-slate-600">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Tổng giờ hành chính: <strong className="text-slate-900">{totalStats.gioHC} phút</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Tổng giờ ngoài giờ: <strong className="text-slate-900">{totalStats.gioNG} phút</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
            Tổng tiết quy đổi: {totalStats.tietCong} tiết
          </span>
        </div>

        <div className="text-[11px] text-slate-500">
          Quy tắc mặc định: 90 phút = 0.99 tiết (hệ số 0.011)
        </div>
      </div>
    </div>
  );
};
