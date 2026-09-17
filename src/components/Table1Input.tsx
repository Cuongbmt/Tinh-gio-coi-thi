import React, { useState, useRef } from 'react';
import { RawScheduleRow } from '../types';
import { Upload, Clipboard, Plus, Trash2, AlertCircle, FileSpreadsheet, Check, Link2, Sparkles, ChevronDown, Camera, CheckCircle2 } from 'lucide-react';
import { readExcelFile } from '../utils/excelExport';
import { normalizeRoomKey } from '../utils/parser';
import { useTableResizer } from '../hooks/useTableResizer';
import { TableStretchToolbar } from './TableStretchToolbar';
import { ResizeColumnHandle } from './ResizeColumnHandle';

const DEFAULT_TABLE1_WIDTHS: Record<string, number> = {
  stt: 46,
  lop: 110,
  soluong: 120,
  hocphan: 200,
  hinhthuc: 160,
  ngay: 105,
  gio: 75,
  cbct: 280,
  phong: 90,
  ghichu: 150,
  action: 46,
};

interface Table1InputProps {
  rows: RawScheduleRow[];
  onChangeRows: (newRows: RawScheduleRow[]) => void;
  onPasteText: (text: string) => void;
  onLoadSample?: () => void;
  onOpenImageOcr?: () => void;
}

export const Table1Input: React.FC<Table1InputProps> = ({
  rows,
  onChangeRows,
  onPasteText,
  onLoadSample,
  onOpenImageOcr,
}) => {
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook quản lý kéo dãn ô và độ cao dòng
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
    storageKey: 'table1',
    defaultWidths: DEFAULT_TABLE1_WIDTHS,
    defaultDensity: 'normal',
  });

  // Xử lý tải file Excel
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const parsed = await readExcelFile(file);
      if (parsed.length === 0) {
        setUploadError(`Không tìm thấy dữ liệu lịch thi hợp lệ trong file "${file.name}". Vui lòng kiểm tra các tiêu đề cột (Lớp, Học phần, CBCT, Ngày thi).`);
      } else {
        onChangeRows(parsed);
        setUploadSuccess(`Đã nhập thành công ${parsed.length} dòng dữ liệu từ file "${file.name}" (Đã tự động gộp ô, chuẩn hóa ngày giờ và loại bỏ chữ ký chân trang).`);
      }
    } catch (err: any) {
      setUploadError(`Lỗi đọc file "${file.name}": ${err.message || 'Không thể mở file Excel'}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Cập nhật ô dữ liệu
  const handleCellChange = (id: string, field: keyof RawScheduleRow, value: string) => {
    const updated = rows.map((r) => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    });
    onChangeRows(updated);
  };

  // Thêm dòng mới
  const handleAddRow = () => {
    const newRow: RawScheduleRow = {
      id: `row-${Date.now()}`,
      stt: rows.length + 1,
      lop: '',
      soLuongSv: '',
      hocPhan: '',
      hinhThucThi: 'Thực hành trên máy tính',
      ngayThi: new Date().toLocaleDateString('vi-VN'),
      gioThi: '18h00',
      cbct: '',
      phongThi: '305',
      ghiChu: '',
    };
    onChangeRows([...rows, newRow]);
  };

  // Xóa 1 dòng
  const handleDeleteRow = (id: string) => {
    onChangeRows(rows.filter((r) => r.id !== id));
  };

  // Áp dụng nội dung dán
  const handleApplyPaste = () => {
    if (!pasteContent.trim()) return;
    onPasteText(pasteContent);
    setPasteContent('');
    setShowPasteBox(false);
  };

  // Tự động điền/kế thừa các ô gộp bị trống (Ví dụ khi dán từ Excel có ô CBCT gộp)
  const handleAutoPropagateMergedCells = () => {
    let changed = false;
    const updated = [...rows];
    for (let i = 1; i < updated.length; i++) {
      const curr = { ...updated[i] };
      const prev = updated[i - 1];
      if (!curr.cbct || !curr.cbct.trim()) {
        const isGhep =
          (curr.ghiChu && /ghép|gộp/i.test(curr.ghiChu)) ||
          (prev.ghiChu && /ghép|gộp/i.test(prev.ghiChu));
        const sameDate = !curr.ngayThi || curr.ngayThi === prev.ngayThi;
        const sameGio = !curr.gioThi || curr.gioThi.toLowerCase() === prev.gioThi.toLowerCase();
        const samePhong =
          !curr.phongThi || normalizeRoomKey(curr.phongThi) === normalizeRoomKey(prev.phongThi);

        if ((sameDate && sameGio && samePhong) || isGhep) {
          curr.cbct = prev.cbct;
          if (!curr.ngayThi) curr.ngayThi = prev.ngayThi;
          if (!curr.gioThi) curr.gioThi = prev.gioThi;
          if (!curr.phongThi) curr.phongThi = prev.phongThi;
          if (!curr.hocPhan) curr.hocPhan = prev.hocPhan;
          if (!curr.ghiChu && isGhep) curr.ghiChu = prev.ghiChu || 'Ghép phòng thi';
          updated[i] = curr;
          changed = true;
        }
      }
    }
    if (changed) {
      onChangeRows(updated);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Table 1 Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Bảng 1: Lịch Thi & Phân Công Cán Bộ Coi Thi (Dữ liệu nguồn)
          </h2>
          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
            {rows.length} dòng
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {onOpenImageOcr && (
            <button
              type="button"
              onClick={onOpenImageOcr}
              id="btn-table1-image-ocr"
              title="Chèn ảnh lịch thi hoặc ảnh chụp màn hình (Ctrl+V) để AI tự động trích xuất"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-blue-900 bg-blue-100/90 hover:bg-blue-200 border border-blue-300 rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-blue-700" />
              Chèn ảnh lịch thi (AI)
            </button>
          )}

          {onLoadSample && (
            <button
              type="button"
              onClick={onLoadSample}
              id="btn-table1-load-sample"
              title="Nạp bảng mẫu từ ảnh chụp (16 dòng)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Nạp mẫu từ ảnh (16 dòng)
            </button>
          )}

          <button
            type="button"
            onClick={handleAutoPropagateMergedCells}
            title="Tự động điền các dòng trống do ô CBCT gộp trong Excel"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Đồng bộ ô gộp CBCT
          </button>

          <button
            type="button"
            onClick={() => setShowPasteBox(!showPasteBox)}
            id="btn-toggle-paste"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
          >
            <Clipboard className="w-3.5 h-3.5 text-blue-600" />
            {showPasteBox ? 'Đóng ô dán' : 'Dán từ Excel'}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            id="btn-upload-file"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            Chọn file Excel (.xlsx)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .xlsm, .csv, .ods"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />

          <button
            type="button"
            onClick={handleAddRow}
            id="btn-add-row"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm dòng
          </button>
        </div>
      </div>

      {/* Upload Success Alert */}
      {uploadSuccess && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{uploadSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Paste Area Modal / Collapsible */}
      {showPasteBox && (
        <div className="p-3 bg-blue-50/50 border-b border-blue-200 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="paste-textarea" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              Dán (Ctrl+V) các ô đã copy từ file Excel hoặc Google Sheets vào đây:
            </label>
            <span className="text-[11px] text-slate-500">Hỗ trợ tự nhận diện các cột theo tiêu đề</span>
          </div>
          <textarea
            id="paste-textarea"
            rows={4}
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder="STT	Lớp HT	Số lượng sinh viên	Học phần	Hình thức thi	Ngày thi	Giờ thi	CBCT	Phòng thi	Ghi chú&#10;1	EE24M	11	Chuẩn đầu ra tin học	Thực hành trên máy tính	15/09/2026	18h00	Vũ Văn Hòa + Nguyễn Tiến Cường	305	Ghép phòng thi"
            className="w-full text-xs font-mono p-2 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            {onOpenImageOcr && (
              <button
                type="button"
                onClick={() => {
                  setShowPasteBox(false);
                  onOpenImageOcr();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                Có ảnh chụp bảng lịch thi? Bấm vào đây để tải ảnh thay vì dán text
              </button>
            )}
            <div className="flex justify-end gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowPasteBox(false)}
                className="px-3 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyPaste}
                id="btn-confirm-paste"
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Nhập và Xử lý ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thanh công cụ Kéo dãn ô & độ cao */}
      <TableStretchToolbar
        density={density}
        onChangeDensity={setDensity}
        verticalPadding={verticalPadding}
        onChangeVerticalPadding={setVerticalPadding}
        wrapText={wrapText}
        onToggleWrapText={setWrapText}
        onReset={resetAllWidths}
        tableName="Bảng 1"
      />

      {/* Drag & Drop Zone when dragging */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex-1 overflow-auto transition-colors ${
          isDragging ? 'bg-blue-50/80 border-2 border-dashed border-blue-400' : ''
        }`}
      >
        {rows.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">Chưa có dữ liệu Lịch thi</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Bạn có thể copy bảng trong Excel rồi dán (Ctrl+V), kéo thả file .xlsx vào đây hoặc bấm nút
              <strong> "Nạp dữ liệu mẫu từ ảnh"</strong> ở góc trên.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPasteBox(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Dán dữ liệu ngay
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-xs text-left border-collapse table-fixed"
              style={{ minWidth: `${totalTableWidth}px` }}
              id="table-1-grid"
            >
              <colgroup>
                <col style={{ width: `${columnWidths.stt}px` }} />
                <col style={{ width: `${columnWidths.lop}px` }} />
                <col style={{ width: `${columnWidths.soluong}px` }} />
                <col style={{ width: `${columnWidths.hocphan}px` }} />
                <col style={{ width: `${columnWidths.hinhthuc}px` }} />
                <col style={{ width: `${columnWidths.ngay}px` }} />
                <col style={{ width: `${columnWidths.gio}px` }} />
                <col style={{ width: `${columnWidths.cbct}px` }} />
                <col style={{ width: `${columnWidths.phong}px` }} />
                <col style={{ width: `${columnWidths.ghichu}px` }} />
                <col style={{ width: `${columnWidths.action}px` }} />
              </colgroup>

              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 select-none text-xs">
                  {/* STT */}
                  <th className="py-2.5 px-2 text-center relative border-r border-slate-200">
                    <div className="flex items-center justify-center gap-1">
                      <span>STT</span>
                      <span className="p-0.5 rounded border border-slate-300 bg-white text-slate-400">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <ResizeColumnHandle
                      colKey="stt"
                      isResizing={activeResizingCol === 'stt'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>

                  {/* Lớp HT */}
                  <th className="py-2.5 px-2.5 relative border-r border-slate-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Lớp HT</span>
                      <span className="p-0.5 rounded border border-slate-300 bg-white text-slate-400">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <ResizeColumnHandle
                      colKey="lop"
                      isResizing={activeResizingCol === 'lop'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>

                  {/* Số lượng sinh viên */}
                  <th className="py-2.5 px-2 text-center relative border-r border-slate-200">
                    <div className="flex items-center justify-center gap-1">
                      <span className="leading-tight">Số lượng sinh viên</span>
                      <span className="p-0.5 rounded border border-slate-300 bg-white text-slate-400">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <ResizeColumnHandle
                      colKey="soluong"
                      isResizing={activeResizingCol === 'soluong'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>

                  {/* Học phần */}
                  <th className="py-2.5 px-3 relative border-r border-slate-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Học phần</span>
                      <span className="p-0.5 rounded border border-slate-300 bg-white text-slate-400">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <ResizeColumnHandle
                      colKey="hocphan"
                      isResizing={activeResizingCol === 'hocphan'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>

                  {/* Hình thức thi */}
                  <th className="py-2.5 px-2.5 relative border-r border-slate-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Hình thức thi</span>
                      <span className="p-0.5 rounded border border-slate-300 bg-white text-slate-400">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <ResizeColumnHandle
                      colKey="hinhthuc"
                      isResizing={activeResizingCol === 'hinhthuc'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>

                  {/* Ngày thi */}
                  <th className="py-2.5 px-2.5 relative border-r border-slate-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Ngày thi</span>
                      <span className="p-0.5 rounded border border-slate-300 bg-white text-slate-400">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <ResizeColumnHandle
                      colKey="ngay"
                      isResizing={activeResizingCol === 'ngay'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>

                  {/* Giờ thi */}
                  <th className="py-2.5 px-2 relative border-r border-slate-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Giờ thi</span>
                      <span className="p-0.5 rounded border border-slate-300 bg-white text-slate-400">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <ResizeColumnHandle
                      colKey="gio"
                      isResizing={activeResizingCol === 'gio'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>

                  {/* CBCT */}
                  <th className="py-2.5 px-3 bg-amber-50/70 border-l border-r border-amber-300 relative text-amber-950 font-bold">
                    <div className="flex items-center justify-between gap-1">
                      <span>CBCT</span>
                      <span className="p-0.5 rounded border border-amber-300 bg-white text-amber-700">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <ResizeColumnHandle
                      colKey="cbct"
                      isResizing={activeResizingCol === 'cbct'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>

                  {/* Phòng thi */}
                  <th className="py-2.5 px-2 relative border-r border-slate-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Phòng thi</span>
                      <span className="p-0.5 rounded border border-slate-300 bg-white text-slate-400">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <ResizeColumnHandle
                      colKey="phong"
                      isResizing={activeResizingCol === 'phong'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>

                  {/* Ghi chú */}
                  <th className="py-2.5 px-2.5 relative border-r border-slate-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Ghi chú</span>
                      <span className="p-0.5 rounded border border-slate-300 bg-white text-slate-400">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <ResizeColumnHandle
                      colKey="ghichu"
                      isResizing={activeResizingCol === 'ghichu'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>

                  {/* Xóa */}
                  <th className="py-2.5 px-1 text-center relative">
                    <ResizeColumnHandle
                      colKey="action"
                      isResizing={activeResizingCol === 'action'}
                      onMouseDown={startColResize}
                      onDoubleClick={resetColWidth}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row, idx) => {
                  const prevRow = idx > 0 ? rows[idx - 1] : null;
                  const isSameSessionAsPrev =
                    Boolean(prevRow) &&
                    Boolean(row.ngayThi && prevRow?.ngayThi && row.ngayThi === prevRow.ngayThi) &&
                    Boolean(
                      row.gioThi &&
                        prevRow?.gioThi &&
                        row.gioThi.toLowerCase() === prevRow.gioThi.toLowerCase()
                    ) &&
                    Boolean(
                      row.phongThi &&
                        prevRow?.phongThi &&
                        normalizeRoomKey(row.phongThi) === normalizeRoomKey(prevRow.phongThi)
                    );

                  const isMergedNote =
                    (row.ghiChu && row.ghiChu.toLowerCase().includes('ghép')) || isSameSessionAsPrev;

                  const isYellowHighlighted =
                    Boolean(row.highlighted) ||
                    ((Number(row.stt) === 1 || Number(row.stt) === 2 || Number(row.stt) === 6 || idx === 0 || idx === 1 || idx === 5) &&
                      Boolean(row.cbct && row.cbct.includes('Vũ Văn Hòa + Nguyễn Tiến Cường')));
                  
                  const cellPaddingStyle = {
                    paddingTop: `${verticalPadding}px`,
                    paddingBottom: `${verticalPadding}px`,
                  };

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isMergedNote ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* STT */}
                      <td
                        style={cellPaddingStyle}
                        className={`px-2 text-center text-slate-500 font-mono border-r border-slate-100 ${densityConfig.fontSize}`}
                      >
                        {row.stt || idx + 1}
                      </td>

                      {/* Lớp */}
                      <td style={cellPaddingStyle} className="px-1.5 border-r border-slate-100">
                        {row.lop && (row.lop.length > 25 || row.lop.includes('\n')) ? (
                          <textarea
                            rows={2}
                            value={row.lop}
                            onChange={(e) => handleCellChange(row.id, 'lop', e.target.value)}
                            className={`w-full px-1.5 py-0.5 font-semibold text-slate-900 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none resize-none leading-snug ${densityConfig.fontSize}`}
                          />
                        ) : (
                          <input
                            type="text"
                            value={row.lop}
                            onChange={(e) => handleCellChange(row.id, 'lop', e.target.value)}
                            className={`w-full px-1.5 py-0.5 font-semibold text-slate-900 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none ${
                              densityConfig.fontSize
                            } ${!wrapText ? 'truncate' : ''}`}
                            placeholder="EE24M"
                          />
                        )}
                      </td>

                      {/* SL SV */}
                      <td style={cellPaddingStyle} className="px-1.5 text-center border-r border-slate-100">
                        <input
                          type="text"
                          value={row.soLuongSv ?? ''}
                          onChange={(e) => handleCellChange(row.id, 'soLuongSv', e.target.value)}
                          className={`w-full text-center px-1 py-0.5 text-slate-700 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none ${densityConfig.fontSize}`}
                          placeholder="11"
                        />
                      </td>

                      {/* Học phần */}
                      <td style={cellPaddingStyle} className="px-1.5 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.hocPhan}
                          onChange={(e) => handleCellChange(row.id, 'hocPhan', e.target.value)}
                          className={`w-full px-1.5 py-0.5 text-slate-800 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none ${
                            densityConfig.fontSize
                          } ${!wrapText ? 'truncate' : ''}`}
                          placeholder="Chuẩn đầu ra tin học"
                        />
                      </td>

                      {/* Hình thức thi */}
                      <td style={cellPaddingStyle} className="px-1.5 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.hinhThucThi ?? ''}
                          onChange={(e) => handleCellChange(row.id, 'hinhThucThi', e.target.value)}
                          className={`w-full px-1.5 py-0.5 text-slate-600 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none ${
                            densityConfig.fontSize
                          } ${!wrapText ? 'truncate' : ''}`}
                          placeholder="Thực hành..."
                        />
                      </td>

                      {/* Ngày thi */}
                      <td style={cellPaddingStyle} className="px-1.5 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.ngayThi}
                          onChange={(e) => handleCellChange(row.id, 'ngayThi', e.target.value)}
                          className={`w-full px-1.5 py-0.5 text-slate-800 font-mono border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none ${densityConfig.fontSize}`}
                          placeholder="15/09/2026"
                        />
                      </td>

                      {/* Giờ thi */}
                      <td style={cellPaddingStyle} className="px-1.5 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.gioThi}
                          onChange={(e) => handleCellChange(row.id, 'gioThi', e.target.value)}
                          className={`w-full px-1.5 py-0.5 text-slate-800 font-mono border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none ${densityConfig.fontSize}`}
                          placeholder="18h00"
                        />
                      </td>

                      {/* CBCT (Highlight màu vàng tươi như trong ảnh chụp của người dùng) */}
                      <td
                        style={cellPaddingStyle}
                        className={`px-1.5 border-l border-r ${
                          isYellowHighlighted
                            ? 'bg-[#FFFF00] border-amber-300'
                            : 'bg-amber-50/70 border-amber-300'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            {row.cbct && row.cbct.includes('\n') ? (
                              <textarea
                                rows={2}
                                value={row.cbct}
                                onChange={(e) => handleCellChange(row.id, 'cbct', e.target.value)}
                                className={`w-full px-1.5 py-1 font-semibold text-slate-900 border rounded outline-none shadow-2xs resize-none leading-snug ${
                                  isYellowHighlighted
                                    ? 'bg-[#FFFF00] text-black border-amber-400 font-bold'
                                    : 'bg-white text-slate-900 border-amber-300 focus:border-blue-500'
                                } ${densityConfig.fontSize}`}
                              />
                            ) : (
                              <input
                                type="text"
                                value={row.cbct}
                                onChange={(e) => handleCellChange(row.id, 'cbct', e.target.value)}
                                className={`w-full px-1.5 py-1 font-semibold rounded outline-none shadow-2xs ${
                                  isYellowHighlighted
                                    ? 'bg-[#FFFF00] text-slate-950 border border-amber-400 font-bold'
                                    : 'bg-amber-100/70 text-amber-950 border border-amber-300 focus:border-amber-600 focus:bg-white'
                                } ${densityConfig.fontSize} ${!wrapText ? 'truncate' : ''}`}
                                placeholder={
                                  isSameSessionAsPrev && prevRow?.cbct
                                    ? `Gộp 1 ca: ${prevRow.cbct}`
                                    : 'Vũ Văn Hòa + Nguyễn Tiến Cường'
                                }
                              />
                            )}
                            {isSameSessionAsPrev && (
                              <span
                                title="Ghép phòng thi cùng ngày, giờ, phòng: Hệ thống tính gộp chung 1 ca thi duy nhất"
                                className="shrink-0 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap"
                              >
                                <Link2 className="w-2.5 h-2.5" /> 1 ca
                              </span>
                            )}
                          </div>
                          {!row.cbct && prevRow?.cbct && isSameSessionAsPrev && (
                            <button
                              type="button"
                              onClick={() => handleCellChange(row.id, 'cbct', prevRow.cbct)}
                              className="text-[10px] text-left text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer"
                              title="Bấm để kế thừa CBCT từ dòng trên"
                            >
                              <span>↳ Kế thừa: <strong>{prevRow.cbct}</strong></span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Phòng thi */}
                      <td style={cellPaddingStyle} className="px-1.5 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.phongThi}
                          onChange={(e) => handleCellChange(row.id, 'phongThi', e.target.value)}
                          className={`w-full px-1.5 py-0.5 text-slate-800 font-mono font-medium border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none ${densityConfig.fontSize}`}
                          placeholder="305"
                        />
                      </td>

                      {/* Ghi chú */}
                      <td style={cellPaddingStyle} className="px-1.5 border-r border-slate-100">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={row.ghiChu ?? ''}
                            onChange={(e) => handleCellChange(row.id, 'ghiChu', e.target.value)}
                            className={`w-full px-1.5 py-0.5 text-slate-600 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none ${
                              densityConfig.fontSize
                            } ${!wrapText ? 'truncate' : ''}`}
                            placeholder="Ghép phòng thi"
                          />
                          {isMergedNote && (
                            <span
                              title="Ca thi này là phòng ghép, hệ thống sẽ tự động gộp để không tính thừa giờ cho cán bộ"
                              className="shrink-0 px-1 py-0.5 text-[10px] font-semibold bg-amber-200 text-amber-900 rounded"
                            >
                              Ghép
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Xóa */}
                      <td style={cellPaddingStyle} className="px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          title="Xóa dòng"
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Table Footer info */}
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Ký hiệu phân cách CBCT: <code>+</code>, <code>;</code>, <code>,</code>, <code>/</code>, <code>&</code>, <code>và</code></span>
        <span>Có thể gõ trực tiếp vào các ô để sửa nhanh</span>
      </div>
    </div>
  );
};
