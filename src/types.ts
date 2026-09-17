/**
 * Định nghĩa kiểu dữ liệu cho Bộ Chuyển Đổi Bảng Lịch Thi sang Bảng Kê Khai Coi Thi
 */

export interface RawScheduleRow {
  id: string;
  stt?: string | number;
  lop: string;
  soLuongSv?: string | number;
  hocPhan: string;
  hinhThucThi?: string;
  ngayThi: string;
  gioThi: string;
  cbct: string;
  phongThi: string;
  ghiChu?: string;
  highlighted?: boolean;
}

export interface CaConfig {
  ca: number;
  timeRange: string; // VD: "07h00 - 08h30"
  matchHours: string[]; // Các giờ nhận diện: ["07h00", "07:00", "7h00", "7:00", "07h30"]
  isOvertimeDefault?: boolean;
}

export interface ConversionRules {
  defaultDurationMinutes: number; // Mặc định 90 phút/ca
  rateHanhChinhPerMinute: number; // 0.011 -> 90 phút = 0.99 tiết
  rateNgoaiGioPerMinute: number; // 0.011 -> 90 phút = 0.99 tiết
  weekendIsOvertime: boolean; // Thứ 7, Chủ nhật là ngoài giờ
  overtimeAfterHour: number; // >= 17h tính ngoài giờ
  roomPrefix: string; // Tiền tố phòng (VD: "A5.")
  autoAddRoomPrefix: boolean; // Tự động thêm tiền tố nếu chưa có (VD "305" -> "A5.305")
  roundDecimals: number; // Làm tròn tiết (mặc định 2 số thập phân: 0.99)
  splitSeparators: string; // Các ký tự phân tách tên CBCT (VD: "+,;,/,và,&")
}

export interface TeacherExamDetail {
  id: string;
  description: string; // VD: "15/09/2026 ca: 5 - Chuẩn đầu ra tin học - phòng: A5.305"
  ngay: string; // 15/09/2026
  ca: string | number; // 5
  hocPhan: string;
  phongThi: string;
  lopNames: string[]; // Các lớp trong ca thi này
  gioHanhChinh: number; // phút (VD: 0 hoặc 90)
  gioNgoaiGio: number; // phút (VD: 90)
  gioCong: number; // phút (VD: 90)
  tietHanhChinh: number; // tiết (VD: 0.00)
  tietNgoaiGio: number; // tiết (VD: 0.99)
  tietCong: number; // tiết (VD: 0.99)
}

export interface TeacherSummary {
  teacherName: string;
  totalGioHanhChinh: number;
  totalGioNgoaiGio: number;
  totalGioCong: number;
  totalTietHanhChinh: number;
  totalTietNgoaiGio: number;
  totalTietCong: number;
  entries: TeacherExamDetail[];
}

export interface ProcessedResult {
  teachers: TeacherSummary[];
  totalSessions: number; // Số ca thi độc lập (đã gộp phòng ghép)
  totalRawRows: number; // Tổng số dòng bảng 1 gốc
  totalMergedRooms: number; // Số dòng phòng ghép đã gộp
  unassignedRows: RawScheduleRow[]; // Các dòng thiếu CBCT nếu có
}
