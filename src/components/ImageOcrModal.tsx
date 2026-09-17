import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RawScheduleRow } from '../types';
import {
  X,
  Camera,
  UploadCloud,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
  Layers,
  ArrowRight,
  ClipboardPaste,
} from 'lucide-react';

interface ImageOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRows: (newRows: RawScheduleRow[], mode: 'replace' | 'append') => void;
  currentRowsCount: number;
}

export const ImageOcrModal: React.FC<ImageOcrModalProps> = ({
  isOpen,
  onClose,
  onApplyRows,
  currentRowsCount,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [extractedRows, setExtractedRows] = useState<RawScheduleRow[] | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý đọc file ảnh thành Data URL
  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Tệp đã chọn không phải là hình ảnh hợp lệ (hỗ trợ .png, .jpg, .jpeg, .webp).');
      return;
    }
    setError(null);
    setExtractedRows(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Lắng nghe sự kiện Paste (Ctrl+V) khi modal mở
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, processImageFile]);

  // Reset state khi đóng modal
  const handleClose = () => {
    if (isProcessing) return;
    setImageFile(null);
    setImagePreview(null);
    setExtractedRows(null);
    setError(null);
    setIsProcessing(false);
    onClose();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Gọi API AI trích xuất bảng từ ảnh
  const handleExtractFromImage = async () => {
    if (!imagePreview) return;

    setIsProcessing(true);
    setError(null);
    setProcessStep('Đang gửi ảnh tới AI Gemini Vision...');

    try {
      const mimeType = imageFile?.type || 'image/png';
      setProcessStep('AI đang nhận diện cấu trúc hàng, phòng thi và cán bộ coi thi...');

      const response = await fetch('/api/extract-schedule-from-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imagePreview,
          mimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Không thể trích xuất dữ liệu từ ảnh.');
      }

      if (!data.rows || data.rows.length === 0) {
        throw new Error(
          'Không tìm thấy dữ liệu bảng lịch thi trong ảnh. Hãy đảm bảo ảnh chụp rõ nét phần bảng.'
        );
      }

      setExtractedRows(data.rows);
      setProcessStep('');
    } catch (err: any) {
      console.error('Lỗi trích xuất ảnh:', err);
      setError(err?.message || 'Đã có lỗi xảy ra khi xử lý ảnh.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Áp dụng dữ liệu vào Bảng 1
  const handleConfirmApply = () => {
    if (!extractedRows || extractedRows.length === 0) return;
    onApplyRows(extractedRows, importMode);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl border border-white/20 shadow-xs">
              <Camera className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                Chèn Lịch Thi Từ Ảnh Chụp Bằng AI
                <span className="text-[11px] font-semibold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-2xs">
                  Gemini Vision
                </span>
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Chụp ảnh màn hình (Windows+Shift+S) rồi bấm <kbd className="px-1.5 py-0.5 bg-white/20 rounded font-mono text-white text-[10px]">Ctrl + V</kbd> để dán ảnh ngay lập tức
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Thông báo lỗi nếu có */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Vùng chọn / dán ảnh */}
          {!extractedRows ? (
            <div className="space-y-4">
              {!imagePreview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                      : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-blue-400'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-100/80 text-blue-700 flex items-center justify-center shadow-xs border border-blue-200">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">
                      Kéo thả ảnh lịch thi vào đây, hoặc{' '}
                      <span className="text-blue-600 underline underline-offset-2">bấm để chọn tệp</span>
                    </p>
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                      <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" />
                      Hoặc chụp màn hình và nhấn <strong className="text-slate-700">Ctrl + V</strong> để dán trực tiếp
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Hỗ trợ PNG, JPG, JPEG, WEBP (ảnh chụp màn hình, ảnh chụp điện thoại, bảng Excel chụp lại)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processImageFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                /* Đã có ảnh preview */
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800 truncate max-w-xs">
                        {imageFile?.name || 'Ảnh dán từ bộ nhớ tạm (Clipboard)'}
                      </span>
                      {imageFile && (
                        <span className="text-[11px] text-slate-500">
                          ({(imageFile.size / 1024).toFixed(0)} KB)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setExtractedRows(null);
                      }}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Chọn ảnh khác
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 max-h-[340px] bg-slate-900/5 flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Xem trước ảnh lịch thi"
                      className="max-h-[340px] w-auto object-contain"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-3 p-4 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold">{processStep}</p>
                          <p className="text-xs text-blue-200">
                            Vui lòng chờ giây lát, AI đang trích xuất từng hàng và cán bộ coi thi...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nút bắt đầu OCR */}
                  {!isProcessing && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleExtractFromImage}
                        id="btn-trigger-ocr"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Bắt đầu đọc lịch thi bằng AI
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Đã trích xuất thành công - Xem trước dữ liệu */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold">
                    Đã nhận diện thành công {extractedRows.length} dòng lịch thi từ ảnh!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExtractedRows(null)}
                  className="text-xs font-medium text-emerald-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Quét lại ảnh khác
                </button>
              </div>

              {/* Tùy chọn cách chèn */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Phương thức nạp vào Bảng 1:
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Thay thế toàn bộ ({currentRowsCount} dòng hiện tại)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Thêm nối tiếp vào sau Bảng 1</span>
                  </label>
                </div>
              </div>

              {/* Bảng xem trước dữ liệu trích xuất */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-[280px] overflow-y-auto">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold sticky top-0 border-b border-slate-300">
                      <tr>
                        <th className="px-2.5 py-2 w-10 text-center">STT</th>
                        <th className="px-2.5 py-2">Lớp</th>
                        <th className="px-2.5 py-2">Học phần</th>
                        <th className="px-2.5 py-2 text-center w-24">Ngày thi</th>
                        <th className="px-2.5 py-2 text-center w-18">Giờ</th>
                        <th className="px-2.5 py-2">Cán bộ coi thi</th>
                        <th className="px-2.5 py-2 text-center w-20">Phòng</th>
                        <th className="px-2.5 py-2">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {extractedRows.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-2.5 py-1.5 text-center font-mono text-slate-500">{row.stt || idx + 1}</td>
                          <td className="px-2.5 py-1.5 font-medium text-slate-900">{row.lop}</td>
                          <td className="px-2.5 py-1.5 text-slate-800">{row.hocPhan}</td>
                          <td className="px-2.5 py-1.5 text-center font-mono text-slate-700">{row.ngayThi}</td>
                          <td className="px-2.5 py-1.5 text-center font-mono font-bold text-slate-900">{row.gioThi}</td>
                          <td className="px-2.5 py-1.5 font-bold text-blue-900 bg-blue-50/40">{row.cbct}</td>
                          <td className="px-2.5 py-1.5 text-center font-mono font-semibold text-slate-800">{row.phongThi}</td>
                          <td className="px-2.5 py-1.5 text-slate-500 italic">{row.ghiChu || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {extractedRows ? (
              <span>Sẵn sàng đưa <strong>{extractedRows.length}</strong> dòng vào Bảng 1</span>
            ) : (
              <span>Gợi ý: Ảnh rõ nét và đủ sáng sẽ cho kết quả nhận diện chính xác 100%</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>

            {extractedRows && (
              <button
                type="button"
                onClick={handleConfirmApply}
                id="btn-confirm-apply-ocr"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {importMode === 'replace' ? 'Áp dụng (Thay thế Bảng 1)' : 'Thêm vào Bảng 1'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
