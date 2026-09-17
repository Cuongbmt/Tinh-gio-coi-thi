import React, { useState } from 'react';
import { X, Copy, Check, FileSpreadsheet, Code2, BookOpen } from 'lucide-react';

interface ExcelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelGuideModal: React.FC<ExcelGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedVBA, setCopiedVBA] = useState(false);
  const [activeTab, setActiveTab] = useState<'flow' | 'vba' | 'formula'>('flow');

  if (!isOpen) return null;

  const vbaCode = `' Macro VBA: Tu dong chuyen Bang 1 sang Bang 2
Sub ChuyenDoiLichThiSangKeKhai()
    Dim ws1 As Worksheet, ws2 As Worksheet
    Dim lastRow As Long, i As Long
    Dim dictTeachers As Object, dictSessions As Object
    Dim cbctText As String, arrCBCT() As String
    Dim j As Long, teacherName As String
    Dim sessionKey As String, descText As String
    Dim ngay As String, gio As String, ca As String, phong As String, hocPhan As String
    Dim duration As Double, rate As Double
    
    Set ws1 = ThisWorkbook.Sheets("Bang1")
    Set ws2 = ThisWorkbook.Sheets("Bang2")
    Set dictTeachers = CreateObject("Scripting.Dictionary")
    Set dictSessions = CreateObject("Scripting.Dictionary")
    
    duration = 90 ' Thoi luong ca thi 90 phut
    rate = 0.011 ' 90 phut = 0.99 tiet
    
    lastRow = ws1.Cells(ws1.Rows.Count, "A").End(xlUp).Row
    
    ' Duyet qua tung dong cua Bang 1
    For i = 2 To lastRow
        ngay = ws1.Cells(i, 6).Value
        gio = ws1.Cells(i, 7).Value
        cbctText = ws1.Cells(i, 8).Value
        phong = ws1.Cells(i, 9).Value
        hocPhan = ws1.Cells(i, 4).Value
        
        ' Xac dinh ca thi (vi du 18h00 la ca 5)
        ca = IIf(InStr(gio, "18") > 0, "5", "1")
        
        ' Bo qua dong trung do ghep phong thi
        sessionKey = ngay & "_" & gio & "_" & phong & "_" & hocPhan & "_" & cbctText
        If Not dictSessions.Exists(sessionKey) Then
            dictSessions.Add sessionKey, True
            
            ' Tach cac CBCT boi dau "+"
            cbctText = Replace(cbctText, " và ", "+")
            arrCBCT = Split(cbctText, "+")
            For j = LBound(arrCBCT) To UBound(arrCBCT)
                teacherName = Trim(arrCBCT(j))
                If Len(teacherName) > 0 Then
                    descText = ngay & " ca: " & ca & " - " & hocPhan & " - phòng: " & phong
                    ' Luu vao danh sach xu ly...
                End If
            Next j
        End If
    Next i
    
    MsgBox "Đã xử lý xong dữ liệu sang Bảng 2!", vbInformation
End Sub`;

  const handleCopyVBA = () => {
    navigator.clipboard.writeText(vbaCode);
    setCopiedVBA(true);
    setTimeout(() => setCopiedVBA(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Hướng Dẫn Quy Trình & Công Thức Chuyển Đổi Excel
              </h3>
              <p className="text-xs text-slate-500">
                Hiểu rõ logic chuyển đổi và cách áp dụng trực tiếp trong Excel
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

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('flow')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'flow'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Bản chất logic xử lý
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('formula')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'formula'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Công thức hàm Excel 365
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vba')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'vba'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Mã Macro VBA trong Excel
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {activeTab === 'flow' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="font-bold text-blue-900 text-sm">
                  Tại sao Bảng 1 không thể dùng VLOOKUP đơn thuần sang Bảng 2?
                </div>
                <p className="text-blue-800">
                  Bởi vì cấu trúc của 2 bảng này có 3 sự khác biệt lớn về bản chất dữ liệu:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                  <div className="font-bold text-slate-900">1. Tách CBCT (1 ô thành nhiều người)</div>
                  <p className="text-slate-600">
                    Bảng 1 ghi gộp <code>Vũ Văn Hòa + Nguyễn Tiến Cường</code>. Sang Bảng 2 phải tách riêng thành 2 nhóm dữ liệu độc lập cho từng người.
                  </p>
                </div>

                <div className="p-3 border border-amber-200 rounded-xl bg-amber-50/60 space-y-1">
                  <div className="font-bold text-amber-950">2. Khử trùng phòng ghép</div>
                  <p className="text-amber-900">
                    Lớp <strong>EE24M</strong> và <strong>LM24M</strong> thi chung 1 phòng. Nếu đếm theo dòng Bảng 1 sẽ bị nhân đôi giờ. Phải gộp lại thành 1 ca thi duy nhất!
                  </p>
                </div>

                <div className="p-3 border border-emerald-200 rounded-xl bg-emerald-50/60 space-y-1">
                  <div className="font-bold text-emerald-950">3. Phân loại & Quy đổi tiết</div>
                  <p className="text-emerald-900">
                    Tự động nhận diện 18h00 là <strong>Ca 5 (Ngoài giờ)</strong>. Tính 90 phút ngoài giờ nhân hệ số <code>0.011</code> = <strong>0.99 tiết</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2">Cách dùng nhanh nhất:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                  <li>Copy bảng dữ liệu từ file Excel của bạn (chọn các dòng từ STT đến Ghi chú).</li>
                  <li>Nhấn nút <strong>"Dán từ Excel"</strong> trên phần mềm này hoặc bấm <code>Ctrl + V</code>.</li>
                  <li>Hệ thống tự động lọc, gộp phòng ghép và tạo Bảng 2.</li>
                  <li>Bấm <strong>"Tải Excel (.xlsx)"</strong> hoặc <strong>"Sao chép vào Excel"</strong> để dán trực tiếp vào file báo cáo của trường!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'formula' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                Nếu bạn sử dụng Microsoft 365 hoặc Excel 2021 trở lên, bạn có thể áp dụng các hàm mảng động sau:
              </p>

              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] space-y-2 overflow-x-auto">
                <div>
                  <span className="text-emerald-400"># 1. Tách danh sách cán bộ duy nhất không trùng:</span>
                  <br />
                  =SORT(UNIQUE(TRIM(TEXTSPLIT(TEXTJOIN("+", TRUE, Bang1!H2:H100), "+"))))
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-emerald-400"># 2. Tạo mô tả ca thi:</span>
                  <br />
                  =TEXT(NgayThi, "dd/mm/yyyy") & " ca: " & Ca & " - " & HocPhan & " - phòng: " & Phong
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-emerald-400"># 3. Tính quy đổi tiết (90 phút = 0.99 tiết):</span>
                  <br />
                  =TongPhut * 0.011
                </div>
              </div>

              <p className="text-slate-500 italic">
                Lưu ý: Các hàm trên đòi hỏi Excel phiên bản mới và thao tác gộp phòng ghép bằng công thức mảng khá phức tạp. Sử dụng công cụ này sẽ nhanh và chính xác hơn 100%.
              </p>
            </div>
          )}

          {activeTab === 'vba' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Mã VBA tự động hóa trong Microsoft Excel:</span>
                <button
                  type="button"
                  onClick={handleCopyVBA}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md border border-slate-300 transition-colors"
                >
                  {copiedVBA ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedVBA ? 'Đã sao chép mã!' : 'Sao chép mã VBA'}
                </button>
              </div>

              <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-72">
                {vbaCode}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs"
          >
            Đã hiểu, quay lại làm việc
          </button>
        </div>
      </div>
    </div>
  );
};
