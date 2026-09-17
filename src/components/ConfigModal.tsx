import React, { useState } from 'react';
import { ConversionRules, CaConfig } from '../types';
import { Settings, X, RotateCcw, Check, Clock, Calculator, ShieldCheck } from 'lucide-react';
import { DEFAULT_RULES, DEFAULT_CA_CONFIGS } from '../data/sampleData';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: ConversionRules;
  caConfigs: CaConfig[];
  onSave: (newRules: ConversionRules, newCaConfigs: CaConfig[]) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  rules,
  caConfigs,
  onSave,
}) => {
  const [localRules, setLocalRules] = useState<ConversionRules>({ ...rules });
  const [localCaConfigs, setLocalCaConfigs] = useState<CaConfig[]>([...caConfigs]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetType: 'standard_099' | 'standard_45min' | 'standard_overtime_15') => {
    if (presetType === 'standard_099') {
      setLocalRules({
        ...localRules,
        defaultDurationMinutes: 90,
        rateHanhChinhPerMinute: 0.011,
        rateNgoaiGioPerMinute: 0.011,
        roundDecimals: 2,
      });
    } else if (presetType === 'standard_45min') {
      // 1 tiết = 45 phút => 90 phút = 2.0 tiết
      setLocalRules({
        ...localRules,
        defaultDurationMinutes: 90,
        rateHanhChinhPerMinute: 1 / 45, // 0.0222
        rateNgoaiGioPerMinute: 1 / 45,
        roundDecimals: 2,
      });
    } else if (presetType === 'standard_overtime_15') {
      // Hành chính 90 phút = 0.99 tiết, Ngoài giờ nhân hệ số 1.5 = 1.485 tiết
      setLocalRules({
        ...localRules,
        defaultDurationMinutes: 90,
        rateHanhChinhPerMinute: 0.011,
        rateNgoaiGioPerMinute: 0.011 * 1.5,
        roundDecimals: 2,
      });
    }
  };

  const handleSave = () => {
    onSave(localRules, localCaConfigs);
    onClose();
  };

  const handleResetDefaults = () => {
    setLocalRules({ ...DEFAULT_RULES });
    setLocalCaConfigs([...DEFAULT_CA_CONFIGS]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cấu Hình Quy Tắc Xử Lý & Ca Thi</h3>
              <p className="text-xs text-slate-500">
                Tùy chỉnh hệ số quy đổi tiết, ca thi và quy tắc ngoài giờ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Preset nhanh */}
          <div>
            <label className="font-bold text-slate-900 mb-2 block">
              Mẫu cấu hình sẵn (Presets):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('standard_099')}
                className="p-2.5 text-left border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 rounded-xl transition-colors"
              >
                <div className="font-bold text-emerald-900">Chuẩn mẫu Bảng 2 (Ảnh)</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  90 phút = 0.99 tiết (hệ số 0.011)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('standard_45min')}
                className="p-2.5 text-left border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <div className="font-bold text-slate-900">Chuẩn 1 tiết = 45 phút</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  90 phút = 2.00 tiết (hệ số 1/45)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('standard_overtime_15')}
                className="p-2.5 text-left border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <div className="font-bold text-slate-900">Ngoài giờ nhân hệ số 1.5</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  HC: 0.99 tiết, NG: 1.49 tiết
                </div>
              </button>
            </div>
          </div>

          {/* Quy tắc Quy đổi Tiết */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <Calculator className="w-4 h-4 text-blue-600" />
              1. Thời lượng ca thi & Tỷ lệ quy đổi tiết
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thời lượng mỗi ca thi (phút)
                </label>
                <input
                  type="number"
                  value={localRules.defaultDurationMinutes}
                  onChange={(e) =>
                    setLocalRules({
                      ...localRules,
                      defaultDurationMinutes: parseInt(e.target.value, 10) || 90,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tỷ lệ tiết Hành chính (tiết / phút)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={localRules.rateHanhChinhPerMinute}
                  onChange={(e) =>
                    setLocalRules({
                      ...localRules,
                      rateHanhChinhPerMinute: parseFloat(e.target.value) || 0.011,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  90 phút = {(localRules.defaultDurationMinutes * localRules.rateHanhChinhPerMinute).toFixed(2)} tiết
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tỷ lệ tiết Ngoài giờ (tiết / phút)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={localRules.rateNgoaiGioPerMinute}
                  onChange={(e) =>
                    setLocalRules({
                      ...localRules,
                      rateNgoaiGioPerMinute: parseFloat(e.target.value) || 0.011,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  90 phút = {(localRules.defaultDurationMinutes * localRules.rateNgoaiGioPerMinute).toFixed(2)} tiết
                </span>
              </div>
            </div>
          </div>

          {/* Quy tắc Phân loại Ngoài Giờ */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              2. Tiêu chí xác định Giờ Hành chính vs Ngoài giờ
            </h4>

            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-semibold text-slate-800 mb-2">Quy định phân ca & giờ:</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-bold text-slate-900 block">Ca 1: 07h00</span>
                    <span className="text-emerald-700 font-medium">Trong giờ</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-bold text-slate-900 block">Ca 2: 09h30</span>
                    <span className="text-emerald-700 font-medium">Trong giờ</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-bold text-slate-900 block">Ca 3: 13h00</span>
                    <span className="text-emerald-700 font-medium">Trong giờ</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-bold text-slate-900 block">Ca 4: 15h30</span>
                    <span className="text-emerald-700 font-medium">Trong giờ</span>
                  </div>
                  <div className="p-2 rounded bg-amber-50 border border-amber-300">
                    <span className="font-bold text-amber-950 block">Ca 5: 18h00</span>
                    <span className="text-amber-800 font-bold">Ngoài giờ</span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localRules.weekendIsOvertime}
                  onChange={(e) =>
                    setLocalRules({ ...localRules, weekendIsOvertime: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-800">
                  Thứ Bảy và Chủ Nhật luôn tính là Ngoài giờ (nếu không chọn thì tính theo ca)
                </span>
              </label>

              <div className="flex items-center gap-3 pt-1">
                <span className="font-medium text-slate-800">
                  Ca thi bắt đầu từ mấy giờ trở đi tính Ngoài giờ:
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="12"
                    max="23"
                    value={localRules.overtimeAfterHour}
                    onChange={(e) =>
                      setLocalRules({
                        ...localRules,
                        overtimeAfterHour: parseInt(e.target.value, 10) || 17,
                      })
                    }
                    className="w-16 p-1.5 border border-slate-300 rounded text-center font-mono"
                  />
                  <span>giờ (VD: 17h00 hoặc 18h00)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quy tắc Tên Phòng & Tách CBCT */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              3. Chuẩn hóa phòng thi và tách Cán bộ coi thi
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localRules.autoAddRoomPrefix}
                    onChange={(e) =>
                      setLocalRules({ ...localRules, autoAddRoomPrefix: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-800">
                    Tự động thêm tiền tố phòng nếu Bảng 1 chỉ ghi số
                  </span>
                </label>

                {localRules.autoAddRoomPrefix && (
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-slate-600">Tiền tố phòng:</span>
                    <input
                      type="text"
                      value={localRules.roomPrefix}
                      onChange={(e) =>
                        setLocalRules({ ...localRules, roomPrefix: e.target.value })
                      }
                      className="w-20 p-1 border border-slate-300 rounded font-mono text-center"
                      placeholder="A5."
                    />
                    <span className="text-slate-500 text-[11px]">(Ví dụ: "305" → "A5.305")</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ký tự phân cách tên 2 cán bộ coi thi
                </label>
                <input
                  type="text"
                  value={localRules.splitSeparators}
                  onChange={(e) =>
                    setLocalRules({ ...localRules, splitSeparators: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="+, ;, ,, /, &, và, va"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Ví dụ: "Vũ Văn Hòa + Nguyễn Tiến Cường"
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục mặc định
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs"
            >
              <Check className="w-4 h-4" />
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
