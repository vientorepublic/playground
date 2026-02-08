/**
 * Buffer Analysis Engine + Express 보안 미들웨어 PoC(Proof of Concept)
 *
 * 이 코드는 업로드된 파일의 버퍼를 분석하여 보안 위협을 감지하는 Express 미들웨어를 구현합니다.
 * 주요 기능은 다음과 같습니다:
 *
 * 1. 매직 바이트 기반의 MIME 타입 감지: 파일 확장자가 위조된 경우를 방지합니다.
 * 2. 의심스러운 패턴(XSS, SQL Injection, Shell code 등) 스캔: 업로드된 파일 내 악성 코드를 탐지합니다.
 *
 * 이 미들웨어는 Multer와 함께 사용되어 파일 업로드 시점에 보안 검사를 수행합니다.
 */
import express from "express";
import multer from "multer";
import { BufferAnalysisEngine, analyzeSuspiciousPatterns } from "buffer-analysis-engine";

const app = express();
// 파일 업로드를 위해 메모리 스토리지를 사용하는 Multer 설정
// 실제 운영 환경에서는 디스크 스토리지나 클라우드 스토리지를 사용할 수 있지만,
// 버퍼 분석을 위해 여기서는 메모리에 파일을 버퍼로 유지합니다.
const upload = multer({ storage: multer.memoryStorage() });

// 버퍼 분석 엔진 초기화
const engine = new BufferAnalysisEngine();

/**
 * Buffer Analysis Engine을 활용한 Express 보안 미들웨어
 * 업로드된 파일의 버퍼를 검사하여 다음을 수행합니다:
 * 1. 매직 바이트 기반의 MIME 타입 감지 (확장자 위조 방지)
 * 2. 의심스러운 패턴(XSS, SQL Injection, Shell code 등) 스캔
 */
const fileSecurityMiddleware = (req, res, next) => {
  if (!req.file) {
    // 파일이 없는 경우 400 에러 반환
    return res.status(400).json({
      error: "No File Uploaded",
      message: "No file was uploaded in the request.",
    });
  }

  const buffer = req.file.buffer;
  const filename = req.file.originalname;

  console.log(`\n[Security Check Start] Filename: ${filename}`);

  // 1. 버퍼 분석 (매직 바이트 감지 등)
  // analyzeBuffer는 파일의 내용을 기반으로 실제 MIME 타입을 추론합니다.
  const analysisResult = engine.analyzeBuffer(buffer, filename);

  // 2. 의심스러운 패턴 분석
  // XSS 스크립트, SQL 인젝션 구문 등 악성 패턴을 검사합니다.
  const securityResult = analyzeSuspiciousPatterns(buffer);

  // 분석 결과 로그
  console.log(`- Detected MIME type: ${analysisResult.detectedMimeType || "Unknown"}`);
  if (securityResult.hasSuspicious) {
    console.warn(`- [Warning] Suspicious patterns detected!: ${securityResult.patterns.join(", ")}`);
  } else {
    console.log(`- No suspicious patterns detected`);
  }

  // 3. 보안 정책 적용 (예시)

  // 정책 1: 의심스러운 패턴이 발견되면 업로드 차단
  if (securityResult.hasSuspicious) {
    return res.status(400).json({
      error: "Security Violation",
      message: "Security threats detected in the file. Upload has been blocked.",
      detectedThreats: securityResult.patterns,
    });
  }

  // 정책 2: 확장자와 실제 내용(Magic Bytes) 불일치 시 경고 또는 차단
  // (여기서는 정보만 제공하고 차단하진 않지만, 필요에 따라 차단 로직 추가 가능)
  if (analysisResult.detectedMimeType && req.file.mimetype !== analysisResult.detectedMimeType) {
    console.warn(`- [Warning] MIME type mismatch (Client: ${req.file.mimetype}, Detected: ${analysisResult.detectedMimeType})`);
  }

  // 검사 결과를 request 객체에 첨부하여 다음 핸들러에서 사용할 수 있게 함
  req.fileSecurity = {
    analysis: analysisResult,
    security: securityResult,
  };

  next();
};

// 업로드 라우트 정의
app.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            error: "Upload Error",
            message: "Unexpected field name. Please use form-data key 'file' for your file upload.",
          });
        }
        return res.status(400).json({ error: "Multer Error", message: err.message });
      } else if (err) {
        return next(err);
      }
      next();
    });
  },
  fileSecurityMiddleware, // 보안 미들웨어가 req.file을 검사
  (req, res) => {
    // 보안 검사를 통과한 경우 실행됨
    res.json({
      success: true,
      message: "File has been safely uploaded and scanned.",
      filename: req.file.originalname,
      scanResult: req.fileSecurity,
    });
  },
);

// 전역 에러 핸들러 추가
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server Error", message: err.message });
});

// 서버 시작
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Secure File Upload Server is running on http://localhost:${PORT}`);
  console.log(`Send a POST request to /upload to test file uploads.`);
});
