import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request interface with requestId and timestamp
declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
    }
  }
}

/**
 * Request ID & Trace Middleware
 * Injects a unique UUID into req.id and returns it in X-Request-Id header.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.id = reqId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', reqId);
  next();
};

export interface ApiErrorResponse {
  success: false;
  error: string;
  errorId: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Unified Global Error Handler Middleware
 * Prevents stack trace / internal leakage to client in production.
 * Logs full details securely on the server with matching errorId.
 */
export const errorHandlerMiddleware = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const errorId = req.id || crypto.randomUUID();
  const statusCode = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  const isProduction = process.env.NODE_ENV === 'production';

  // Specific handling for JSON Body Parser limits (413 Payload Too Large)
  if (err.type === 'entity.too.large' || err.status === 413) {
    console.warn(`[${errorId}] 413 Payload Too Large on ${req.method} ${req.originalUrl}`);
    return res.status(413).json({
      success: false,
      error: 'حجم البيانات المرسلة يتجاوز الحد المسموح به لخادم الـ API (الحد الأقصى 1MB).',
      errorId,
      statusCode: 413,
    } as ApiErrorResponse);
  }

  // Specific handling for malformed JSON (400 Bad Request)
  if (err instanceof SyntaxError && 'body' in err) {
    console.warn(`[${errorId}] 400 Invalid JSON Syntax on ${req.method} ${req.originalUrl}`);
    return res.status(400).json({
      success: false,
      error: 'بنية ملف أو طلب JSON غير صالحة.',
      errorId,
      statusCode: 400,
    } as ApiErrorResponse);
  }

  // Server-side audit log with full trace
  console.error(`[ERROR_AUDIT] Error ID: ${errorId} | Path: ${req.method} ${req.originalUrl} | Status: ${statusCode}`);
  console.error(`[ERROR_AUDIT] Details:`, err?.stack || err);

  // Client response: sanitize message in production
  let userFriendlyMessage = 'حدث خطأ داخلي في الخادم أثناء معالجة الطلب.';
  if (statusCode === 400) {
    userFriendlyMessage = err.message || 'طلب غير صالح أو بيانات غير مكتملة.';
  } else if (statusCode === 429) {
    userFriendlyMessage = 'تم تجاوز عدد الطلبات المسموح به. يرجى الانتظار قليلاً والمحاولة لاحقاً.';
  } else if (statusCode === 504 || statusCode === 408) {
    userFriendlyMessage = 'استغرقت معالجة الطلب وقتاً أطول من المتوقع (Timeout).';
  } else if (!isProduction && err.message) {
    userFriendlyMessage = err.message;
  }

  res.status(statusCode).json({
    success: false,
    error: userFriendlyMessage,
    errorId,
    statusCode,
    ...(isProduction ? {} : { debugInfo: err?.message }),
  } as ApiErrorResponse);
};
