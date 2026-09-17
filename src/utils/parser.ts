import {
  RawScheduleRow,
  ConversionRules,
  CaConfig,
  TeacherExamDetail,
  TeacherSummary,
  ProcessedResult,
} from '../types';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tách danh sách tên cán bộ coi thi từ chuỗi
 * Hỗ trợ các phân cách: +, ;, ,, /, &, "và", "va"
 */
export function splitTeachers(cbctStr: string, customSeparators?: string): string[] {
  if (!cbctStr || typeof cbctStr !== 'string') return [];

  // Tách theo dòng trước (cho các trường hợp nhiều phòng/dòng như dòng 16: "305: Phạm Thị Thùy Nương + Vũ Văn Hòa \n 303: Nguyễn Quang Hiếu + Nguyễn Trung Sỹ")
  const lines = cbctStr.split(/[\r\n]+/);
  const results: string[] = [];

  const defaultSeps = ['+', ';', ',', '/', '&', 'và', 'va'];
  const rawList = customSeparators
    ? customSeparators.split(',').map((s) => s.trim()).filter(Boolean)
    : defaultSeps;

  // Phân loại: từ chữ (như "và", "va") vs ký hiệu đặc biệt (như +, ;, /, &)
  const wordSeps: string[] = [];
  const symbolSeps: string[] = [];

  for (const item of rawList) {
    if (/^[\p{L}\p{N}]+$/u.test(item)) {
      wordSeps.push(item);
    } else {
      symbolSeps.push(item);
    }
  }

  // Xây dựng pattern tách an toàn:
  // - Từ chữ (như 'và', 'va'): bắt buộc phải có khoảng trắng trước và sau để không cắt vào chữ cái của tên (VD: "Quang" không bị cắt bởi chữ "a" hay "va")
  // - Ký hiệu (như +, ;): có thể có hoặc không có khoảng trắng xung quanh
  const patternParts: string[] = [];
  if (wordSeps.length > 0) {
    patternParts.push(`(?:\\s+(?:${wordSeps.map(escapeRegex).join('|')})\\s+)`);
  }
  if (symbolSeps.length > 0) {
    patternParts.push(`(?:\\s*(?:${symbolSeps.map(escapeRegex).join('|')})\\s*)`);
  }

  const splitRegex = patternParts.length > 0
    ? new RegExp(patternParts.join('|'), 'gi')
    : /\s*[+;,/&]\s*|\s+(?:và|va)\s+/gi;

  for (const line of lines) {
    let cleanLine = line
      // Bỏ tiền tố phòng thi hoặc CBCT như "305: ", "P.305: ", "CBCT:"
      .replace(/^(?:phòng|p\.|p)?\s*\d{3,4}[a-z]?\s*[:\-]\s*/gi, '')
      .replace(/^cbct\s*\d*[:\-]?\s*/gi, '');

    const rawParts = cleanLine.split(splitRegex);
    for (const part of rawParts) {
      // Bỏ số thứ tự 1., 2. nếu có hoặc tiền tố phòng còn sót lại
      const trimmed = part
        .replace(/^\s*\d+[\.\)]\s*/, '')
        .replace(/^(?:phòng|p\.|p)?\s*\d{3,4}[a-z]?\s*[:\-]\s*/gi, '')
        .trim();
      if (trimmed && trimmed.length > 1) {
        results.push(trimmed);
      }
    }
  }

  // Loại bỏ các mục trùng lặp trong cùng 1 chuỗi
  return Array.from(new Set(results));
}

/**
 * Chuẩn hóa danh sách cán bộ coi thi thành key duy nhất (sắp xếp theo alphabet, loại bỏ khoảng trắng thừa)
 * Ví dụ: "Vũ Văn Hòa + Nguyễn Tiến Cường" và "Nguyễn Tiến Cường + Vũ Văn Hòa" -> cùng một key
 */
export function getNormalizedTeacherKey(cbctStr: string, customSeparators?: string): string {
  const teachers = splitTeachers(cbctStr, customSeparators);
  return teachers
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter(Boolean)
    .sort()
    .join('__');
}

/**
 * Chuẩn hóa tên phòng: "305", "A5.305", "P.305", "P305" -> "305"
 * Giúp nhận diện chính xác các lớp cùng phòng thi
 */
export function normalizeRoomKey(phong: string): string {
  if (!phong) return '';
  return phong
    .trim()
    .toLowerCase()
    .replace(/^(a5|p|b|c|d|e)[\.\-\s]*/i, '')
    .replace(/\s+/g, '');
}

/**
 * Chuẩn hóa ngày: dd/mm/yyyy
 */
export function normalizeDateKey(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.trim().replace(/[\-\.]/g, '/');
}

/**
 * Phân tích ngày thi và kiểm tra có phải cuối tuần (Thứ 7, CN) không
 */
export function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  try {
    const parts = dateStr.trim().split(/[\/\-\.]/);
    if (parts.length === 3) {
      let day: number, month: number, year: number;
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        // DD/MM/YYYY
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        const dayOfWeek = d.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // 0 = CN, 6 = Thứ 7
      }
    }
  } catch {
    // Ignore invalid date format
  }
  return false;
}

/**
 * Xác định Ca thi và tính chất ngoài giờ từ giờ thi
 */
export function determineCaAndOvertime(
  gioThi: string,
  ngayThi: string,
  rules: ConversionRules,
  caConfigs: CaConfig[]
): { ca: number | string; isOvertime: boolean } {
  const cleanGio = (gioThi || '').trim().toLowerCase().replace(/\s+/g, '');
  
  // Trích xuất số giờ và phút
  let hour = -1;
  let minute = 0;
  const match = cleanGio.match(/(\d{1,2})[h:](\d{0,2})/i);
  if (match) {
    hour = parseInt(match[1], 10);
    minute = match[2] ? parseInt(match[2], 10) : 0;
  }

  // Tìm trong caConfigs
  let foundCa: CaConfig | undefined = undefined;

  for (const cfg of caConfigs) {
    if (cfg.matchHours.some((h) => cleanGio.includes(h.toLowerCase()))) {
      foundCa = cfg;
      break;
    }
  }

  // Nếu chưa match chính xác chuỗi, match theo khoảng giờ quy định:
  // 7h00 -> ca 1 trong giờ
  // 9h30 -> ca 2 trong giờ
  // 13h00 -> ca 3 trong giờ
  // 15h30 -> ca 4 trong giờ
  // 18h00 -> ca 5 ngoài giờ
  if (!foundCa && hour >= 0) {
    if (hour < 9) {
      foundCa = caConfigs.find((c) => c.ca === 1);
    } else if (hour < 12) {
      foundCa = caConfigs.find((c) => c.ca === 2);
    } else if (hour < 15) {
      foundCa = caConfigs.find((c) => c.ca === 3);
    } else if (hour < 17) {
      foundCa = caConfigs.find((c) => c.ca === 4);
    } else if (hour < 20) {
      foundCa = caConfigs.find((c) => c.ca === 5);
    } else {
      foundCa = caConfigs.find((c) => c.ca === 6) || caConfigs.find((c) => c.ca === 5);
    }
  }

  const caValue = foundCa ? foundCa.ca : 5; // Mặc định ca 5 nếu không rõ

  // Kiểm tra ngoài giờ:
  // - Ca 1 (7h00), ca 2 (9h30), ca 3 (13h00), ca 4 (15h30): trong giờ
  // - Ca 5 (18h00): ngoài giờ
  let isOvertime = false;
  if (foundCa !== undefined) {
    isOvertime = Boolean(foundCa.isOvertimeDefault);
  } else {
    isOvertime = hour >= rules.overtimeAfterHour || caValue >= 5;
  }

  // Nếu bật weekendIsOvertime thì Thứ 7, CN cũng tính ngoài giờ
  if (rules.weekendIsOvertime && isWeekend(ngayThi)) {
    isOvertime = true;
  }

  return { ca: caValue, isOvertime };
}

/**
 * Định dạng lại tên phòng (VD: "305" -> "A5.305")
 */
export function formatRoomName(phong: string, prefix: string, autoAdd: boolean): string {
  if (!phong) return '';
  const trimmed = phong.trim();
  if (!autoAdd || !prefix) return trimmed;

  // Nếu đã có tiền tố rồi (VD: A5.305, P305, B102, v.v.), không thêm nữa
  if (/^[A-Za-z]/.test(trimmed)) {
    return trimmed;
  }

  return `${prefix}${trimmed}`;
}

/**
 * Nhận diện và ánh xạ các cột từ dữ liệu dán từ Excel hoặc file
 */
export function mapRowFromDataArray(row: string[], headers: string[]): RawScheduleRow {
  const normHeaders = headers.map((h) => (h || '').toLowerCase().trim());

  const findColIndex = (keywords: string[]): number => {
    for (let i = 0; i < normHeaders.length; i++) {
      const h = normHeaders[i];
      if (keywords.some((k) => h.includes(k))) return i;
    }
    return -1;
  };

  const sttIdx = findColIndex(['stt', 'số tt', 'no']);
  const lopIdx = findColIndex(['lớp', 'lop', 'lớp ht']);
  const svIdx = findColIndex(['sinh viên', 'sv', 'số lượng']);
  const hpIdx = findColIndex(['học phần', 'môn thi', 'hoc phan', 'môn']);
  const htIdx = findColIndex(['hình thức', 'hinh thuc']);
  const ngayIdx = findColIndex(['ngày thi', 'ngay thi', 'ngày']);
  const gioIdx = findColIndex(['giờ thi', 'gio thi', 'giờ', 'ca thi']);
  const cbctIdx = findColIndex(['cbct', 'cán bộ coi thi', 'giám thị', 'cb1', 'người coi']);
  const phongIdx = findColIndex(['phòng thi', 'phong thi', 'phòng', 'phong']);
  const ghiChuIdx = findColIndex(['ghi chú', 'ghi chu', 'note']);

  const getVal = (idx: number, fallbackIdx: number): string => {
    if (idx >= 0 && row[idx] !== undefined) return String(row[idx]).trim();
    if (fallbackIdx >= 0 && row[fallbackIdx] !== undefined) return String(row[fallbackIdx]).trim();
    return '';
  };

  // Nếu không nhận diện được header (ví dụ dữ liệu copy không kèm header),
  // fallback theo đúng thứ tự 10 cột của Bảng 1:
  // 0: STT, 1: Lớp HT, 2: SL SV, 3: Học phần, 4: Hình thức thi, 5: Ngày thi, 6: Giờ thi, 7: CBCT, 8: Phòng thi, 9: Ghi chú
  return {
    id: `row-${Math.random().toString(36).substring(2, 9)}`,
    stt: getVal(sttIdx, 0),
    lop: getVal(lopIdx, 1),
    soLuongSv: getVal(svIdx, 2),
    hocPhan: getVal(hpIdx, 3),
    hinhThucThi: getVal(htIdx, 4),
    ngayThi: getVal(ngayIdx, 5),
    gioThi: getVal(gioIdx, 6),
    cbct: getVal(cbctIdx, 7),
    phongThi: getVal(phongIdx, 8),
    ghiChu: getVal(ghiChuIdx, 9),
  };
}

/**
 * Hàm phân tách các hàng và cột từ CSV/TSV có hỗ trợ dấu ngoặc kép (tránh bị vỡ dòng khi ô có Alt+Enter trong Excel)
 */
export function splitCsvTsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // bỏ qua dấu quote escape
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // bỏ qua \r\n
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Xử lý chuỗi dán từ Clipboard (Excel/TSV/CSV)
 */
export function parsePastedTable(text: string): RawScheduleRow[] {
  if (!text || !text.trim()) return [];

  // Kiểm tra ký tự phân tách (Tab hay Phẩy hay Chấm phẩy)
  const isTab = text.includes('\t');
  const isSemi = !isTab && text.includes(';');
  const delimiter = isTab ? '\t' : isSemi ? ';' : ',';

  const allRows = splitCsvTsvRows(text.trim(), delimiter);
  if (allRows.length === 0) return [];

  // Tìm dòng header
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const cols = allRows[i].map((c) => c.toLowerCase());
    const matchCount = ['stt', 'lớp', 'học phần', 'cbct', 'ngày', 'giờ', 'phòng', 'sinh viên', 'hình thức'].filter(
      (k) => cols.some((c) => c.includes(k))
    ).length;
    if (matchCount >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  const hasHeader = headerRowIndex >= 0;
  const headerCols = hasHeader
    ? allRows[headerRowIndex]
    : [
        'stt',
        'lớp ht',
        'số lượng sv',
        'học phần',
        'hình thức thi',
        'ngày thi',
        'giờ thi',
        'cbct',
        'phòng thi',
        'ghi chú',
      ];

  const dataRows = hasHeader ? allRows.slice(headerRowIndex + 1) : allRows;
  const result: RawScheduleRow[] = [];

  const footerKeywords = [
    'phòng qlđt',
    'qldt & cstv',
    'lãnh đạo phân hiệu',
    'bộ phận khảo thí',
    'ban giám hiệu',
    'phòng đào tạo',
    'người lập bảng',
    'trưởng khoa',
    'xác nhận',
  ];

  for (const cols of dataRows) {
    if (cols.length < 2) continue;

    // Bỏ qua dòng chân trang chữ ký
    const fullLine = cols.join(' ').toLowerCase();
    if (footerKeywords.some((kw) => fullLine.includes(kw))) continue;

    const parsedRow = mapRowFromDataArray(cols, headerCols);

    // Chỉ nhận dòng có thông tin (có lớp hoặc học phần hoặc ngày thi hoặc cbct)
    if (parsedRow.lop || parsedRow.hocPhan || parsedRow.cbct || parsedRow.ngayThi) {
      // Tự động nhận diện ô bị gộp từ Excel:
      // Nếu dòng hiện tại bị trống CBCT nhưng là dòng ghép phòng với dòng trên:
      const prevRow = result.length > 0 ? result[result.length - 1] : null;
      if (!parsedRow.cbct && prevRow && prevRow.cbct) {
        const isGhepNote =
          (parsedRow.ghiChu && /ghép|gộp/i.test(parsedRow.ghiChu)) ||
          (prevRow.ghiChu && /ghép|gộp/i.test(prevRow.ghiChu));
        const sameDate = !parsedRow.ngayThi || parsedRow.ngayThi === prevRow.ngayThi;
        const sameGio = !parsedRow.gioThi || parsedRow.gioThi.toLowerCase() === prevRow.gioThi.toLowerCase();
        const samePhong =
          !parsedRow.phongThi ||
          normalizeRoomKey(parsedRow.phongThi) === normalizeRoomKey(prevRow.phongThi);

        if ((sameDate && sameGio && samePhong) || isGhepNote) {
          parsedRow.cbct = prevRow.cbct;
          if (!parsedRow.ngayThi) parsedRow.ngayThi = prevRow.ngayThi;
          if (!parsedRow.gioThi) parsedRow.gioThi = prevRow.gioThi;
          if (!parsedRow.phongThi) parsedRow.phongThi = prevRow.phongThi;
          if (!parsedRow.hocPhan) parsedRow.hocPhan = prevRow.hocPhan;
          if (!parsedRow.ghiChu && isGhepNote) parsedRow.ghiChu = prevRow.ghiChu || 'Ghép phòng thi';
        }
      }

      if (parsedRow.cbct && parsedRow.cbct.includes('Vũ Văn Hòa + Nguyễn Tiến Cường')) {
        parsedRow.highlighted = true;
      }

      result.push(parsedRow);
    }
  }

  return result;
}

/**
 * CHUYỂN ĐỔI TOÀN BỘ TỪ BẢNG 1 SANG BẢNG 2
 * Xử lý:
 * 1. Tách CBCT (nếu có 2 cán bộ thì mỗi cán bộ đều được tính 1 ca)
 * 2. Gộp phòng ghép (cùng ngày, ca, phòng, CBCT gộp chung -> BẮT BUỘC chỉ tính 1 ca duy nhất cho cán bộ)
 * 3. Phân loại Giờ Hành chính vs Ngoài giờ
 * 4. Tính toán Quy đổi tiết chuẩn xác
 * 5. Format dòng chi tiết: "{Ngày} ca: {Ca} - {Học phần} - phòng: {Phòng thi}"
 */
export function processTable1ToTable2(
  rawRows: RawScheduleRow[],
  rules: ConversionRules,
  caConfigs: CaConfig[]
): ProcessedResult {
  // BƯỚC 0: Kế thừa ô gộp (Merged Cells Inheritance)
  // Khi copy hoặc upload từ Excel có ô CBCT gộp qua 2 hay nhiều dòng (như lớp EE24M + LM24M),
  // các dòng phía dưới có thể bị rỗng ô CBCT hoặc người dùng nhập thiếu.
  // Ta tự động kế thừa CBCT từ dòng trên để gom đúng thành 1 ca.
  const preparedRows: RawScheduleRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const r = { ...rawRows[i] };
    const prev = preparedRows.length > 0 ? preparedRows[preparedRows.length - 1] : null;

    if (!r.cbct || !r.cbct.trim()) {
      if (prev && prev.cbct && prev.cbct.trim()) {
        const isGhepNote =
          (r.ghiChu && /ghép|gộp/i.test(r.ghiChu)) ||
          (prev.ghiChu && /ghép|gộp/i.test(prev.ghiChu));
        const sameDate = !r.ngayThi || r.ngayThi.trim() === (prev.ngayThi || '').trim();
        const sameGio =
          !r.gioThi || r.gioThi.trim().toLowerCase() === (prev.gioThi || '').trim().toLowerCase();
        const samePhong =
          !r.phongThi || normalizeRoomKey(r.phongThi) === normalizeRoomKey(prev.phongThi || '');

        if ((sameDate && sameGio && samePhong) || isGhepNote) {
          r.cbct = prev.cbct;
          if (!r.ngayThi) r.ngayThi = prev.ngayThi;
          if (!r.gioThi) r.gioThi = prev.gioThi;
          if (!r.phongThi) r.phongThi = prev.phongThi;
          if (!r.hocPhan) r.hocPhan = prev.hocPhan;
          if (!r.ghiChu && isGhepNote) r.ghiChu = prev.ghiChu || 'Ghép phòng thi';
        }
      }
    }
    preparedRows.push(r);
  }

  // Lọc ra các dòng hợp lệ
  const validRows = preparedRows.filter(
    (r) => (r.cbct && r.cbct.trim()) || (r.ngayThi && r.ngayThi.trim())
  );

  const unassignedRows: RawScheduleRow[] = [];
  let totalMergedRoomsCount = 0;

  // Bước 1: Gom các lớp ghép phòng thi theo key:
  // Key = Ngày + Ca + Phòng + CBCT gộp
  interface UniqueSession {
    key: string;
    ngayThi: string;
    gioThi: string;
    phongThi: string;
    hocPhan: string;
    formattedRoom: string;
    cbctRaw: string;
    teachers: string[];
    teacherRoomMap?: Record<string, string>;
    ca: number | string;
    isOvertime: boolean;
    lops: string[];
    soLuongSvTong: number;
    rowsCount: number;
  }

  const sessionMap = new Map<string, UniqueSession>();

  for (const row of validRows) {
    if (!row.cbct || !row.cbct.trim()) {
      unassignedRows.push(row);
      continue;
    }

    const ngay = (row.ngayThi || '').trim();
    const gio = (row.gioThi || '').trim();
    const phong = (row.phongThi || '').trim();
    const hocPhan = (row.hocPhan || '').trim();
    const cbctRaw = (row.cbct || '').trim();

    const { ca, isOvertime } = determineCaAndOvertime(gio, ngay, rules, caConfigs);
    const normDate = normalizeDateKey(ngay);
    const normRoom = normalizeRoomKey(phong);
    const normTeachers = getNormalizedTeacherKey(cbctRaw, rules.splitSeparators);

    // KEY CHUẨN ĐỂ GỘP CHUNG 1 CA:
    // Cùng Ngày + Cùng Ca + Cùng Phòng + Cùng Danh sách CBCT
    const normKey = `${normDate}__ca_${ca}__room_${normRoom}__teachers_${normTeachers}`;

    // Kiểm tra xem đã có ca thi trùng khớp chưa
    let matchedSession: UniqueSession | undefined = sessionMap.get(normKey);

    // Nếu key chính xác chưa có, tìm xem có ca cùng ngày, cùng ca, cùng phòng và trùng CBCT hoặc ghi chú Ghép không
    if (!matchedSession) {
      for (const s of sessionMap.values()) {
        const sNormDate = normalizeDateKey(s.ngayThi);
        const sNormRoom = normalizeRoomKey(s.phongThi);
        if (sNormDate === normDate && sNormRoom === normRoom && String(s.ca) === String(ca)) {
          const rowTeachers = splitTeachers(cbctRaw, rules.splitSeparators);
          const hasCommonTeacher = rowTeachers.some((t) =>
            s.teachers.some((st) => st.toLowerCase().trim() === t.toLowerCase().trim())
          );
          const isGhep =
            (row.ghiChu && /ghép|gộp/i.test(row.ghiChu)) ||
            (s.cbctRaw && /ghép|gộp/i.test(s.cbctRaw));
          if (hasCommonTeacher || isGhep) {
            matchedSession = s;
            break;
          }
        }
      }
    }

    if (matchedSession) {
      // ĐÃ CÓ CA TRÙNG -> GỘP CHUNG VÀO 1 CA, KHÔNG ĐƯỢC TĂNG THÊM CA
      matchedSession.rowsCount += 1;
      totalMergedRoomsCount += 1;
      if (row.lop && !matchedSession.lops.includes(row.lop.trim())) {
        matchedSession.lops.push(row.lop.trim());
      }
      const svNum = parseInt(String(row.soLuongSv || 0), 10);
      if (!isNaN(svNum)) {
        matchedSession.soLuongSvTong += svNum;
      }
      // Bổ sung học phần nếu khác
      if (row.hocPhan && !matchedSession.hocPhan.includes(row.hocPhan.trim())) {
        matchedSession.hocPhan = `${matchedSession.hocPhan} + ${row.hocPhan.trim()}`;
      }
    } else {
      // CA MỚI
      const formattedRoom = formatRoomName(phong, rules.roomPrefix, rules.autoAddRoomPrefix);
      const teachers = splitTeachers(cbctRaw, rules.splitSeparators);
      const svNum = parseInt(String(row.soLuongSv || 0), 10);

      // Trích xuất phòng riêng theo dòng nếu có (VD: dòng 16: "305: Phạm Thị Thùy Nương + ... \n 303: ...")
      const teacherRoomMap: Record<string, string> = {};
      const cbctLines = cbctRaw.split(/[\r\n]+/);
      for (const line of cbctLines) {
        const roomMatch = line.match(/^(?:phòng|p\.|p)?\s*(\d{3,4}[a-z]?)\s*[:\-]/i);
        if (roomMatch) {
          const roomVal = roomMatch[1];
          const formattedLineRoom = formatRoomName(roomVal, rules.roomPrefix, rules.autoAddRoomPrefix);
          const teachersInLine = splitTeachers(line, rules.splitSeparators);
          for (const t of teachersInLine) {
            teacherRoomMap[t.toLowerCase().trim()] = formattedLineRoom;
          }
        }
      }

      sessionMap.set(normKey, {
        key: normKey,
        ngayThi: ngay,
        gioThi: gio,
        phongThi: phong,
        hocPhan,
        formattedRoom,
        cbctRaw,
        teachers,
        teacherRoomMap: Object.keys(teacherRoomMap).length > 0 ? teacherRoomMap : undefined,
        ca,
        isOvertime,
        lops: row.lop ? [row.lop.trim()] : [],
        soLuongSvTong: isNaN(svNum) ? 0 : svNum,
        rowsCount: 1,
      });
    }
  }

  // Bước 2: Tạo danh sách chi tiết theo từng Giáo viên / Cán bộ coi thi
  const teacherMap = new Map<string, TeacherExamDetail[]>();

  const allSessions = Array.from(sessionMap.values());

  for (const session of allSessions) {
    const duration = rules.defaultDurationMinutes; // 90 phút cho 1 ca thi duy nhất

    // Tính phút
    const gioHanhChinh = session.isOvertime ? 0 : duration;
    const gioNgoaiGio = session.isOvertime ? duration : 0;
    const gioCong = duration;

    // Tính tiết quy đổi (làm tròn số theo rules.roundDecimals)
    const factorHanhChinh = rules.rateHanhChinhPerMinute;
    const factorNgoaiGio = rules.rateNgoaiGioPerMinute;

    const tietHanhChinh = session.isOvertime
      ? 0
      : Number((duration * factorHanhChinh).toFixed(rules.roundDecimals));
    const tietNgoaiGio = session.isOvertime
      ? Number((duration * factorNgoaiGio).toFixed(rules.roundDecimals))
      : 0;
    const tietCong = Number((tietHanhChinh + tietNgoaiGio).toFixed(rules.roundDecimals));

    // Mỗi cán bộ trong danh sách CBCT (kể cả ô gộp 2 cán bộ) đều được tính đúng 1 ca này
    for (const teacher of session.teachers) {
      const cleanTeacher = teacher.trim();
      if (!cleanTeacher) continue;

      if (!teacherMap.has(cleanTeacher)) {
        teacherMap.set(cleanTeacher, []);
      }

      const teacherKey = cleanTeacher.toLowerCase().trim();
      const specificRoom = session.teacherRoomMap?.[teacherKey] || session.formattedRoom;

      // Tạo description chuẩn theo đúng Bảng 2:
      // Ví dụ: "15/09/2026 ca: 5 - Chuẩn đầu ra tin học - phòng: A5.305"
      const description = `${session.ngayThi} ca: ${session.ca} - ${session.hocPhan} - phòng: ${specificRoom}`;

      teacherMap.get(cleanTeacher)!.push({
        id: `detail-${Math.random().toString(36).substring(2, 9)}`,
        description,
        ngay: session.ngayThi,
        ca: session.ca,
        hocPhan: session.hocPhan,
        phongThi: specificRoom,
        lopNames: session.lops,
        gioHanhChinh,
        gioNgoaiGio,
        gioCong,
        tietHanhChinh,
        tietNgoaiGio,
        tietCong,
      });
    }
  }

  // Bước 3: Tính tổng cho từng Cán bộ và sắp xếp
  const teacherSummaries: TeacherSummary[] = [];

  teacherMap.forEach((entries, teacherName) => {
    // Sắp xếp các ca thi của giáo viên theo ngày và ca
    entries.sort((a, b) => {
      if (a.ngay !== b.ngay) return a.ngay.localeCompare(b.ngay);
      return Number(a.ca) - Number(b.ca);
    });

    const totalGioHanhChinh = entries.reduce((acc, curr) => acc + curr.gioHanhChinh, 0);
    const totalGioNgoaiGio = entries.reduce((acc, curr) => acc + curr.gioNgoaiGio, 0);
    const totalGioCong = totalGioHanhChinh + totalGioNgoaiGio;

    const totalTietHanhChinh = Number(
      entries.reduce((acc, curr) => acc + curr.tietHanhChinh, 0).toFixed(rules.roundDecimals)
    );
    const totalTietNgoaiGio = Number(
      entries.reduce((acc, curr) => acc + curr.tietNgoaiGio, 0).toFixed(rules.roundDecimals)
    );
    const totalTietCong = Number(
      (totalTietHanhChinh + totalTietNgoaiGio).toFixed(rules.roundDecimals)
    );

    teacherSummaries.push({
      teacherName,
      totalGioHanhChinh,
      totalGioNgoaiGio,
      totalGioCong,
      totalTietHanhChinh,
      totalTietNgoaiGio,
      totalTietCong,
      entries,
    });
  });

  // Sắp xếp danh sách cán bộ theo tên tiếng Việt (Alphabetical)
  teacherSummaries.sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'vi'));

  return {
    teachers: teacherSummaries,
    totalSessions: allSessions.length,
    totalRawRows: rawRows.length,
    totalMergedRooms: totalMergedRoomsCount,
    unassignedRows,
  };
}
