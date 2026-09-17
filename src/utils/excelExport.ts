import * as XLSX from 'xlsx';
import { TeacherSummary, RawScheduleRow } from '../types';
import { mapRowFromDataArray, normalizeRoomKey } from './parser';

/**
 * Format giá trị từ ô Excel (ngày tháng, giờ, số, chuỗi)
 */
function formatExcelCellValue(val: any, headerHint: string): string {
  if (val === null || val === undefined) return '';

  if (val instanceof Date) {
    const d = val.getUTCDate().toString().padStart(2, '0');
    const m = (val.getUTCMonth() + 1).toString().padStart(2, '0');
    const y = val.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }

  if (typeof val === 'number') {
    // Nếu là cột giờ thi hoặc số thập phân < 1 (giờ trong Excel được lưu dạng phân số ngày 0 -> 1)
    if (headerHint === 'time' || (val > 0 && val < 1)) {
      const totalMinutes = Math.round(val * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}`;
    }

    // Nếu là cột ngày thi hoặc số serial date Excel (thường từ 30000 đến 65000, tương ứng năm 1982 -> 2077)
    if (headerHint === 'date' || (val >= 30000 && val <= 65000)) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      const d = date.getUTCDate().toString().padStart(2, '0');
      const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const y = date.getUTCFullYear();
      return `${d}/${m}/${y}`;
    }

    return String(val);
  }

  let str = String(val).trim();

  // Chuẩn hóa định dạng giờ nếu người dùng gõ 18:00 hoặc 18:00:00 -> 18h00
  if (headerHint === 'time') {
    const timeMatch = str.match(/^(\d{1,2})[:h](\d{2})(?::\d{2})?$/i);
    if (timeMatch) {
      str = `${timeMatch[1].padStart(2, '0')}h${timeMatch[2]}`;
    }
  }

  // Chuẩn hóa định dạng ngày nếu người dùng gõ yyyy-mm-dd -> dd/mm/yyyy
  if (headerHint === 'date') {
    const isoMatch = str.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
    if (isoMatch) {
      str = `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
    }
  }

  return str;
}

/**
 * Kiểm tra xem dòng có phải là dòng chữ ký / chân trang không
 */
function isSignatureOrFooterRow(rowCols: string[]): boolean {
  const fullText = rowCols.join(' ').toLowerCase();
  const signatureKeywords = [
    'phòng qlđt',
    'qldt & cstv',
    'lãnh đạo phân hiệu',
    'bộ phận khảo thí',
    'ban giám hiệu',
    'phòng đào tạo',
    'người lập bảng',
    'trưởng khoa',
    'trưởng bộ môn',
    'xác nhận',
    'ký và ghi rõ',
    'chữ ký',
  ];

  return signatureKeywords.some((kw) => fullText.includes(kw));
}

/**
 * Đọc file Excel (.xlsx, .xls, .csv) tải lên từ máy tính
 */
export async function readExcelFile(file: File): Promise<RawScheduleRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellNF: true,
          cellText: true,
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          resolve([]);
          return;
        }

        // Tự động tìm sheet chứa dữ liệu lịch thi tốt nhất
        let targetSheetName = workbook.SheetNames[0];
        let maxScore = -1;

        for (const sName of workbook.SheetNames) {
          const ws = workbook.Sheets[sName];
          if (!ws || !ws['!ref']) continue;

          // Kiểm tra nhanh vài chục ô đầu tiên của sheet
          let score = 0;
          const range = XLSX.utils.decode_range(ws['!ref']);
          const maxRow = Math.min(range.e.r, 20);
          const maxCol = Math.min(range.e.c, 15);

          for (let r = range.s.r; r <= maxRow; r++) {
            for (let c = range.s.c; c <= maxCol; c++) {
              const cell = ws[XLSX.utils.encode_cell({ r, c })];
              if (cell && cell.v !== undefined) {
                const cellTxt = String(cell.v).toLowerCase();
                if (cellTxt.includes('cbct') || cellTxt.includes('cán bộ')) score += 5;
                if (cellTxt.includes('lớp')) score += 3;
                if (cellTxt.includes('học phần')) score += 3;
                if (cellTxt.includes('ngày thi') || cellTxt.includes('ngày')) score += 2;
                if (cellTxt.includes('phòng')) score += 2;
              }
            }
          }

          if (score > maxScore) {
            maxScore = score;
            targetSheetName = sName;
          }
        }

        const worksheet = workbook.Sheets[targetSheetName];

        // Xử lý unroll các ô bị gộp (Merge cells) trong Excel
        // Để các dòng phía dưới nhận đúng giá trị của ô gộp (VD: ô CBCT, Phòng thi, Ghi chú gộp cho 2 dòng)
        if (worksheet['!merges'] && Array.isArray(worksheet['!merges'])) {
          worksheet['!merges'].forEach((merge) => {
            const startCellRef = XLSX.utils.encode_cell(merge.s);
            const masterCell = worksheet[startCellRef];
            if (masterCell && (masterCell.v !== undefined || masterCell.w !== undefined)) {
              for (let R = merge.s.r; R <= merge.e.r; ++R) {
                for (let C = merge.s.c; C <= merge.e.c; ++C) {
                  if (R === merge.s.r && C === merge.s.c) continue;
                  const targetRef = XLSX.utils.encode_cell({ r: R, c: C });
                  worksheet[targetRef] = { ...masterCell };
                }
              }
            }
          });
        }

        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: true,
        });

        if (!rawRows || rawRows.length === 0) {
          resolve([]);
          return;
        }

        // Tìm dòng header thực tế (chấm điểm từ dòng 0 đến 35)
        let headerRowIndex = 0;
        let bestHeaderScore = 0;

        for (let i = 0; i < Math.min(rawRows.length, 35); i++) {
          const rowArr = rawRows[i] || [];
          const rowStr = rowArr.map((c) => String(c || '').toLowerCase()).join(' ');
          let score = 0;
          if (rowStr.includes('cbct') || rowStr.includes('cán bộ coi thi') || rowStr.includes('giám thị')) score += 5;
          if (rowStr.includes('lớp') || rowStr.includes('lop')) score += 3;
          if (rowStr.includes('học phần') || rowStr.includes('môn thi')) score += 3;
          if (rowStr.includes('ngày') || rowStr.includes('ngay')) score += 2;
          if (rowStr.includes('giờ') || rowStr.includes('ca')) score += 2;
          if (rowStr.includes('phòng') || rowStr.includes('phong')) score += 2;
          if (rowStr.includes('stt')) score += 1;

          if (score > bestHeaderScore) {
            bestHeaderScore = score;
            headerRowIndex = i;
          }
        }

        const headerRow = rawRows[headerRowIndex] || [];
        const headers = headerRow.map((c) => String(c || '').replace(/[\r\n]+/g, ' ').trim());

        // Xác định loại cột cho từng index dựa trên header
        const colHints: string[] = headers.map((h) => {
          const lower = h.toLowerCase();
          if (lower.includes('ngày') || lower.includes('ngay')) return 'date';
          if (lower.includes('giờ') || lower.includes('gio') || lower.includes('ca')) return 'time';
          if (lower.includes('phòng') || lower.includes('phong')) return 'room';
          return 'text';
        });

        const dataRows = rawRows.slice(headerRowIndex + 1);
        const parsedList: RawScheduleRow[] = [];

        for (const r of dataRows) {
          if (!r || !Array.isArray(r)) continue;

          // Format từng cell theo gợi ý cột
          const stringCols = r.map((c, colIdx) => formatExcelCellValue(c, colHints[colIdx] || 'text'));

          // Bỏ qua dòng hoàn toàn rỗng
          if (stringCols.every((c) => c === '')) continue;

          // Bỏ qua dòng chữ ký lãnh đạo / chân trang
          if (isSignatureOrFooterRow(stringCols)) continue;

          const mapped = mapRowFromDataArray(stringCols, headers);

          // Phải có ít nhất thông tin hợp lệ (Lớp, Học phần, Ngày thi, hoặc CBCT)
          if (mapped.lop || mapped.hocPhan || mapped.cbct || mapped.ngayThi) {
            // Kiểm tra kế thừa nếu là ô gộp chưa được unroll
            const prevRow = parsedList.length > 0 ? parsedList[parsedList.length - 1] : null;
            if (!mapped.cbct && prevRow && prevRow.cbct) {
              const isGhep =
                (mapped.ghiChu && /ghép|gộp/i.test(mapped.ghiChu)) ||
                (prevRow.ghiChu && /ghép|gộp/i.test(prevRow.ghiChu));
              const sameDate = !mapped.ngayThi || mapped.ngayThi === prevRow.ngayThi;
              const sameGio = !mapped.gioThi || mapped.gioThi.toLowerCase() === prevRow.gioThi.toLowerCase();
              const samePhong =
                !mapped.phongThi ||
                normalizeRoomKey(mapped.phongThi) === normalizeRoomKey(prevRow.phongThi);

              if ((sameDate && sameGio && samePhong) || isGhep) {
                mapped.cbct = prevRow.cbct;
                if (!mapped.ngayThi) mapped.ngayThi = prevRow.ngayThi;
                if (!mapped.gioThi) mapped.gioThi = prevRow.gioThi;
                if (!mapped.phongThi) mapped.phongThi = prevRow.phongThi;
                if (!mapped.hocPhan) mapped.hocPhan = prevRow.hocPhan;
                if (!mapped.ghiChu && isGhep) mapped.ghiChu = prevRow.ghiChu || 'Ghép phòng thi';
              }
            }

            // Đánh dấu highlight nếu là cặp thầy Vũ Văn Hòa + Nguyễn Tiến Cường
            if (mapped.cbct && mapped.cbct.includes('Vũ Văn Hòa + Nguyễn Tiến Cường')) {
              mapped.highlighted = true;
            }

            parsedList.push(mapped);
          }
        }

        resolve(parsedList);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Xuất dữ liệu Bảng 2 ra file Excel (.xlsx) chuẩn cấu trúc 2 tầng tiêu đề
 */
export function exportTable2ToExcel(teachers: TeacherSummary[], fileName?: string) {
  // Tạo mảng dữ liệu với cấu trúc 2 hàng header:
  const wsData: any[][] = [
    // Hàng 1
    ['Họ và tên', 'Ngày', 'ca', 'Giờ coi thi', '', '', 'Quy đổi tiết', '', ''],
    // Hàng 2
    ['', '', '', 'Hành chính', 'Ngoài giờ', 'Cộng', 'Hành chính', 'Ngoài giờ', 'Cộng'],
  ];

  interface TeacherBlock {
    summaryRowIndex: number; // 1-based index in Excel
    entryStartIndex: number;
    entryEndIndex: number;
  }

  const teacherBlocks: TeacherBlock[] = [];
  let currentRow = 2; // header chiếm row 1 và 2

  for (const teacher of teachers) {
    currentRow++;
    const summaryRowIndex = currentRow;

    // Dòng tổng hợp của Giáo viên
    wsData.push([
      teacher.teacherName,
      '',
      '',
      teacher.totalGioHanhChinh,
      teacher.totalGioNgoaiGio,
      teacher.totalGioCong,
      teacher.totalTietHanhChinh,
      teacher.totalTietNgoaiGio,
      teacher.totalTietCong,
    ]);

    const entryStartIndex = currentRow + 1;

    // Các dòng chi tiết ca thi của giáo viên
    for (const entry of teacher.entries) {
      currentRow++;
      wsData.push([
        entry.description,
        entry.ngay,
        entry.ca,
        entry.gioHanhChinh > 0 ? entry.gioHanhChinh : 0,
        entry.gioNgoaiGio > 0 ? entry.gioNgoaiGio : 0,
        entry.gioCong,
        entry.tietHanhChinh,
        entry.tietNgoaiGio,
        entry.tietCong,
      ]);
    }

    const entryEndIndex = currentRow;
    teacherBlocks.push({
      summaryRowIndex,
      entryStartIndex,
      entryEndIndex,
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Gắn công thức tính Excel chính xác vào từng ô theo chuẩn nhà trường
  for (const block of teacherBlocks) {
    // 1. Công thức cho từng dòng chi tiết ca thi:
    for (let r = block.entryStartIndex; r <= block.entryEndIndex; r++) {
      // Cột F: Cộng giờ coi thi = D + E
      const fVal = wsData[r - 1][5];
      ws['F' + r] = { t: 'n', v: fVal, f: `D${r}+E${r}` };

      // Cột G: Quy đổi tiết Hành chính = D/50*0.5*1.1
      const gVal = wsData[r - 1][6];
      ws['G' + r] = { t: 'n', v: gVal, f: `D${r}/50*0.5*1.1` };

      // Cột H: Quy đổi tiết Ngoài giờ = E/50*0.5*1.1
      const hVal = wsData[r - 1][7];
      ws['H' + r] = { t: 'n', v: hVal, f: `E${r}/50*0.5*1.1` };

      // Cột I: Cộng tiết quy đổi = G + H
      const iVal = wsData[r - 1][8];
      ws['I' + r] = { t: 'n', v: iVal, f: `G${r}+H${r}` };
    }

    // 2. Công thức cho dòng Tổng của Cán bộ:
    const s = block.summaryRowIndex;
    if (block.entryEndIndex >= block.entryStartIndex) {
      // Cột D: Tổng phút hành chính
      ws['D' + s] = {
        t: 'n',
        v: wsData[s - 1][3],
        f: `SUM(D${block.entryStartIndex}:D${block.entryEndIndex})`,
      };
      // Cột E: Tổng phút ngoài giờ
      ws['E' + s] = {
        t: 'n',
        v: wsData[s - 1][4],
        f: `SUM(E${block.entryStartIndex}:E${block.entryEndIndex})`,
      };
      // Cột F: Tổng phút cộng = D + E
      ws['F' + s] = { t: 'n', v: wsData[s - 1][5], f: `D${s}+E${s}` };
      // Cột G: Tổng tiết hành chính
      ws['G' + s] = {
        t: 'n',
        v: wsData[s - 1][6],
        f: `SUM(G${block.entryStartIndex}:G${block.entryEndIndex})`,
      };
      // Cột H: Tổng tiết ngoài giờ
      ws['H' + s] = {
        t: 'n',
        v: wsData[s - 1][7],
        f: `SUM(H${block.entryStartIndex}:H${block.entryEndIndex})`,
      };
      // Cột I: Tổng tiết cộng = G + H
      ws['I' + s] = { t: 'n', v: wsData[s - 1][8], f: `G${s}+H${s}` };
    }
  }

  // Thiết lập Merge Cells (D1:F1, G1:I1)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Họ và tên
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Ngày
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // ca
    { s: { r: 0, c: 3 }, e: { r: 0, c: 5 } }, // Giờ coi thi
    { s: { r: 0, c: 6 }, e: { r: 0, c: 8 } }, // Quy đổi tiết
  ];

  // Thiết lập độ rộng cột
  ws['!cols'] = [
    { wch: 48 }, // Họ và tên / Mô tả
    { wch: 14 }, // Ngày
    { wch: 8 },  // ca
    { wch: 12 }, // HC
    { wch: 12 }, // NG
    { wch: 12 }, // Cộng
    { wch: 12 }, // Tiết HC
    { wch: 12 }, // Tiết NG
    { wch: 12 }, // Tiết Cộng
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bang_2_Ke_Khai');

  const exportName = fileName || `Bang_2_Ke_Khai_Coi_Thi_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, exportName);
}

/**
 * Tạo nội dung dạng Tab-Separated Text để dán trực tiếp (Ctrl+V) vào Excel
 */
export function generateClipboardTextForExcel(teachers: TeacherSummary[]): string {
  const lines: string[] = [];

  // Header dòng 1
  lines.push(['Họ và tên', 'Ngày', 'ca', 'Giờ coi thi', '', '', 'Quy đổi tiết', '', ''].join('\t'));
  // Header dòng 2
  lines.push(['', '', '', 'Hành chính', 'Ngoài giờ', 'Cộng', 'Hành chính', 'Ngoài giờ', 'Cộng'].join('\t'));

  for (const teacher of teachers) {
    // Dòng tổng cán bộ
    lines.push([
      teacher.teacherName,
      '',
      '',
      teacher.totalGioHanhChinh || '',
      teacher.totalGioNgoaiGio || '',
      teacher.totalGioCong,
      teacher.totalTietHanhChinh,
      teacher.totalTietNgoaiGio,
      teacher.totalTietCong,
    ].join('\t'));

    // Các dòng chi tiết
    for (const entry of teacher.entries) {
      lines.push([
        entry.description,
        entry.ngay,
        entry.ca,
        entry.gioHanhChinh || '',
        entry.gioNgoaiGio || '',
        entry.gioCong,
        entry.tietHanhChinh.toFixed(2),
        entry.tietNgoaiGio.toFixed(2),
        entry.tietCong.toFixed(2),
      ].join('\t'));
    }
  }

  return lines.join('\n');
}
