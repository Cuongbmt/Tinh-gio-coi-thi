/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { RawScheduleRow, ConversionRules, CaConfig } from './types';
import { SAMPLE_SCHEDULE_ROWS, DEFAULT_RULES, DEFAULT_CA_CONFIGS } from './data/sampleData';
import { processTable1ToTable2, parsePastedTable } from './utils/parser';
import { Header } from './components/Header';
import { Table1Input } from './components/Table1Input';
import { Table2Output } from './components/Table2Output';
import { ConfigModal } from './components/ConfigModal';
import { ExcelGuideModal } from './components/ExcelGuideModal';
import { ImageOcrModal } from './components/ImageOcrModal';
import { SplitSquareVertical, Table, CheckCircle2, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'schedule_app_raw_rows_v3';

export default function App() {
  const [rawRows, setRawRows] = useState<RawScheduleRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return SAMPLE_SCHEDULE_ROWS;
  });

  const [rules, setRules] = useState<ConversionRules>(DEFAULT_RULES);
  const [caConfigs, setCaConfigs] = useState<CaConfig[]>(DEFAULT_CA_CONFIGS);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isImageOcrOpen, setIsImageOcrOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'table2' | 'table1'>('split');

  // Lưu tự động vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rawRows));
    } catch (e) {
      console.error(e);
    }
  }, [rawRows]);

  // Tính toán Bảng 2 tự động khi Bảng 1 hoặc Cấu hình thay đổi
  const processed = useMemo(() => {
    return processTable1ToTable2(rawRows, rules, caConfigs);
  }, [rawRows, rules, caConfigs]);

  // Xử lý dán văn bản từ clipboard
  const handlePasteText = (text: string) => {
    const parsed = parsePastedTable(text);
    if (parsed.length > 0) {
      setRawRows(parsed);
    }
  };

  // Xử lý khi nhận diện dữ liệu từ ảnh (thay thế hoặc nối thêm)
  const handleApplyImageRows = (newRows: RawScheduleRow[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setRawRows(newRows);
    } else {
      setRawRows((prev) => [...prev, ...newRows]);
    }
  };

  // Nạp lại dữ liệu mẫu đúng như trong 2 hình ảnh người dùng gửi
  const handleLoadSample = () => {
    setRawRows(SAMPLE_SCHEDULE_ROWS);
    setRules(DEFAULT_RULES);
  };

  // Xóa trắng bảng
  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu bảng để nhập lại từ đầu?')) {
      setRawRows([]);
    }
  };

  // Lắng nghe phím tắt Ctrl+V toàn trang khi không focus vào input/textarea
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
        return; // Để người dùng dán bình thường trong input
      }

      // Kiểm tra nếu người dùng dán ảnh từ clipboard (chụp màn hình)
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            e.preventDefault();
            setIsImageOcrOpen(true);
            return;
          }
        }
      }

      // Nếu dán text từ Excel có chứa tab
      const text = e.clipboardData?.getData('text');
      if (text && text.includes('\t')) {
        e.preventDefault();
        handlePasteText(text);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <Header
        onLoadSample={handleLoadSample}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onReset={handleReset}
        onOpenImageOcr={() => setIsImageOcrOpen(true)}
        totalTeachers={processed.teachers.length}
        totalSessions={processed.totalSessions}
        mergedRoomsCount={processed.totalMergedRooms}
      />

      {/* Main Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 flex flex-col gap-4">
        {/* Layout Switcher & Fast Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Chế độ hiển thị:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'split'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SplitSquareVertical className="w-3.5 h-3.5 text-blue-600" />
                Song song (Bảng 1 & 2)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table2')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'table2'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-emerald-600" />
                Toàn màn hình Bảng 2 (Kê khai)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table1')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'table1'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-blue-600" />
                Toàn màn hình Bảng 1 (Nguồn)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Dữ liệu đồng bộ tức thì
            </span>
          </div>
        </div>

        {/* Content View Grid */}
        <div
          className={`grid gap-4 flex-1 ${
            viewMode === 'split'
              ? 'grid-cols-1 lg:grid-cols-12 min-h-[620px]'
              : 'grid-cols-1 min-h-[620px]'
          }`}
        >
          {/* Table 1: Nguồn */}
          {(viewMode === 'split' || viewMode === 'table1') && (
            <div
              className={`flex flex-col min-h-[450px] ${
                viewMode === 'split' ? 'lg:col-span-5' : 'w-full'
              }`}
            >
              <Table1Input
                rows={rawRows}
                onChangeRows={setRawRows}
                onPasteText={handlePasteText}
                onLoadSample={handleLoadSample}
                onOpenImageOcr={() => setIsImageOcrOpen(true)}
              />
            </div>
          )}

          {/* Table 2: Đích (Kết quả kê khai tiết) */}
          {(viewMode === 'split' || viewMode === 'table2') && (
            <div
              className={`flex flex-col min-h-[450px] ${
                viewMode === 'split' ? 'lg:col-span-7' : 'w-full'
              }`}
            >
              <Table2Output
                teachers={processed.teachers}
                rules={rules}
                mergedRoomsCount={processed.totalMergedRooms}
              />
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        rules={rules}
        caConfigs={caConfigs}
        onSave={(newRules, newCaConfigs) => {
          setRules(newRules);
          setCaConfigs(newCaConfigs);
        }}
      />

      <ExcelGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ImageOcrModal
        isOpen={isImageOcrOpen}
        onClose={() => setIsImageOcrOpen(false)}
        onApplyRows={handleApplyImageRows}
        currentRowsCount={rawRows.length}
      />
    </div>
  );
}
