import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY chưa được cấu hình trên hệ thống. Vui lòng kiểm tra mục Settings > Secrets."
      );
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();

  // Cho phép nhận ảnh base64 dung lượng lớn (lên đến 50MB)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API OCR Lịch thi từ ảnh
  app.post("/api/extract-schedule-from-image", async (req, res) => {
    try {
      const { image, mimeType } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          error: "Vui lòng cung cấp dữ liệu hình ảnh (base64).",
        });
      }

      // Chuẩn hóa base64 nếu có data URI prefix
      const cleanBase64 = image.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");
      const detectedMime = mimeType || "image/png";

      const ai = getGemini();

      const promptText = `Bạn là trợ lý AI chuyên nghiệp về trích xuất bảng biểu lịch thi đại học/cao đẳng tại Việt Nam.
Nhiệm vụ của bạn là đọc toàn bộ bảng lịch thi trong bức ảnh và trích xuất từng dòng dữ liệu thành mảng JSON.

CÁC CỘT CẦN TRÍCH XUẤT:
1. stt: Số thứ tự (VD: "1", "2", ...).
2. lop: Mã hoặc tên lớp sinh viên dự thi (VD: "21DHTH01", "21DHTH02", "C21TH1, C21TH2"...).
3. soLuongSv: Số lượng sinh viên (nếu có, VD: "45", "80").
4. hocPhan: Tên học phần / môn thi (VD: "Chuẩn đầu ra tin học", "Lập trình Web", "Toán cao cấp"...).
5. hinhThucThi: Hình thức thi (VD: "Thực hành trên máy tính", "Tự luận", "Trắc nghiệm"...).
6. ngayThi: Ngày thi theo định dạng DD/MM/YYYY (VD: "15/09/2026").
7. gioThi: Giờ thi bắt đầu (VD: "07h00", "09h30", "13h00", "15h30", "18h00"). Nếu ảnh ghi 07:00 thì đổi thành 07h00.
8. cbct: Cán bộ coi thi.
   - CỰC KỲ QUAN TRỌNG: Giữ nguyên ĐẦY ĐỦ họ và tên của tất cả cán bộ, không viết tắt, không cắt bớt chữ cái.
   - Nếu có nhiều cán bộ thì ngăn cách bằng dấu '+' (VD: "Nguyễn Quang Hiếu + Nguyễn Trung Sỹ").
   - Nếu bảng ghi theo phòng như "305: Phạm Thị Thùy Nương + Vũ Văn Hòa" thì ghi rõ.
   - Nếu ô CBCT bị merge gộp chung cho nhiều lớp, hãy điền đầy đủ tên CBCT cho tất cả các lớp đó.
9. phongThi: Mã số phòng thi (VD: "305", "307", "305+307", "A5.305").
10. ghiChu: Ghi chú nếu có (VD: "Ghép phòng thi", "Thi chung").

QUY TẮC:
- Trích xuất toàn bộ các dòng thi trong bảng, không bỏ sót dòng nào.
- Trả về đúng mảng JSON theo schema đã định sẵn.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: detectedMime,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stt: { type: Type.STRING },
                lop: { type: Type.STRING },
                soLuongSv: { type: Type.STRING },
                hocPhan: { type: Type.STRING },
                hinhThucThi: { type: Type.STRING },
                ngayThi: { type: Type.STRING },
                gioThi: { type: Type.STRING },
                cbct: { type: Type.STRING },
                phongThi: { type: Type.STRING },
                ghiChu: { type: Type.STRING },
              },
              required: ["lop", "hocPhan", "ngayThi", "gioThi", "cbct", "phongThi"],
            },
          },
        },
      });

      const responseText = response.text || "[]";
      let extractedRows: any[] = [];
      try {
        extractedRows = JSON.parse(responseText.trim());
      } catch (parseErr) {
        console.error("Lỗi parse JSON từ Gemini response:", responseText, parseErr);
        return res.status(500).json({
          success: false,
          error: "Không thể phân tích dữ liệu JSON phản hồi từ mô hình AI.",
        });
      }

      // Chuẩn hóa format sang RawScheduleRow
      const formattedRows = extractedRows.map((r, idx) => ({
        id: `ocr-${Date.now()}-${idx + 1}`,
        stt: r.stt || idx + 1,
        lop: r.lop || "",
        soLuongSv: r.soLuongSv || "",
        hocPhan: r.hocPhan || "",
        hinhThucThi: r.hinhThucThi || "Thực hành trên máy tính",
        ngayThi: r.ngayThi || "",
        gioThi: r.gioThi || "",
        cbct: r.cbct || "",
        phongThi: r.phongThi || "",
        ghiChu: r.ghiChu || "",
      }));

      return res.json({
        success: true,
        rows: formattedRows,
        count: formattedRows.length,
      });
    } catch (err: any) {
      console.error("Lỗi trong quá trình trích xuất ảnh bằng Gemini:", err);
      return res.status(500).json({
        success: false,
        error:
          err?.message ||
          "Đã xảy ra lỗi khi phân tích ảnh lịch thi. Vui lòng kiểm tra lại ảnh hoặc kết nối.",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server đang chạy trên http://0.0.0.0:${PORT}`);
  });
}

startServer();
