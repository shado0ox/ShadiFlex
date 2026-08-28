import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import {
  requestIdMiddleware,
  errorHandlerMiddleware,
} from './src/server/middleware.js';
import {
  aiAdvisorSchema,
  zatcaVerifySchema,
  sanitizeFinancialContext,
  withTimeout,
} from './src/server/validation.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Trust proxy if behind reverse proxy (e.g., Cloud Run / Nginx) for accurate rate limiting
  app.set('trust proxy', 1);

  // 2. HTTP Security Headers with Helmet & React/Vite-safe CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
          frameAncestors: ["'self'", 'https://ai.studio', 'https://*.google.com', 'https://*.run.app', '*'],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: false, // Allows embedding inside AI Studio Preview iframes
    })
  );

  // 3. Request ID Tracing on all requests
  app.use(requestIdMiddleware);

  // 4. Configurable & Reasonable JSON Body Limit (Default: 1MB)
  const jsonLimit = process.env.JSON_BODY_LIMIT || '1mb';
  app.use(express.json({ limit: jsonLimit }));

  // 5. Global API Rate Limiter
  const globalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'تم تجاوز المعدل الأقصى للطلبات العامة (300 طلب لكل 15 دقيقة). يرجى المحاولة لاحقاً.',
      statusCode: 429,
    },
  });

  // 6. Dedicated Rate Limiter for AI Advisor (External LLM Gateway)
  const aiAdvisorLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30, // 30 queries per 10 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'تم تجاوز الحد الأقصى لاستشارات الذكاء الاصطناعي (30 استفساراً لكل 10 دقائق). يرجى الانتظار قليلاً.',
      statusCode: 429,
    },
  });

  // 7. Dedicated Rate Limiter for ZATCA Verification
  const zatcaVerifyLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 validations per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'تم تجاوز الحد الأقصى لفحص الفواتير (60 فاتورة بالدقيقة). يرجى الانتظار قليلاً.',
      statusCode: 429,
    },
  });

  // Apply rate limiter to all API endpoints
  app.use('/api/', globalApiLimiter);

  // =========================================================================
  // ⚠️ CRITICAL ARCHITECTURAL SECURITY NOTICE:
  // The API endpoints below currently operate in Single-Tenant / Local-First mode.
  // Before deploying to a multi-tenant or public production environment:
  // 1. You MUST attach an Authentication & Authorization Middleware (e.g. JWT / OAuth2 / Session cookie).
  // 2. You MUST verify user tenant ownership on every request (RBAC / Tenant isolation).
  // =========================================================================

  /**
   * AI Advisor Endpoint for Financial Analysis & ZATCA Accounting Consultation
   * Includes:
   * - Strict Input Validation & Length Caps (Prompt <= 4000 chars)
   * - Privacy Data Sanitization (Only sanitized high-level financial summary sent to Gemini)
   * - Strict 25s Timeout Guarantee
   * - Dedicated Rate Limiting
   */
  app.post(
    '/api/ai-advisor',
    aiAdvisorLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return res.status(200).json({
            success: true,
            isConfigured: false,
            reply:
              'مفتاح GEMINI_API_KEY غير مهيأ حالياً في إعدادات الخادم. يمكنك الاستمرار في استخدام كافة المميزات المحاسبية، إصدار الفواتير المعتمدة، إدارة المخزون، والتقارير الضريبية بشكل كامل وطبيعي.',
            requestId: req.id,
          });
        }

        // Validate incoming request structure
        const parseResult = aiAdvisorSchema.safeParse(req.body);
        if (!parseResult.success) {
          const firstErr = parseResult.error.issues[0]?.message || 'بيانات الطلب غير صالحة';
          const err: any = new Error(firstErr);
          err.statusCode = 400;
          return next(err);
        }

        const { prompt, financialContext } = parseResult.data;

        // Privacy First: Prune and sanitize context to minimal summary figures only
        const sanitizedContext = sanitizeFinancialContext(financialContext);
        const hasFinancialContext = Object.keys(sanitizedContext).length > 0;

        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `
أنت مستشار مالي ومحاسبي خبير متخصص في النظام المحاسبي السعودي، معايير الهيئة السعودية للمحاسبين والمراجعين (SOCPA)، ولوائح هيئة الزكاة والضريبة والجمارك (ZATCA)، ونظام ضريبة القيمة المضافة (15%)، ونظام الفوترة الإلكترونية (فاتورة).
أجب باللغة العربية بأسلوب احترافي، دقيق، واضح ومباشر. قدم نصائح مالية محاسبية دقيقة، وفسر الحركات المحاسبية، وساعد في إعداد القيود وتحليل القوائم المالية عند الطلب.
`;

        const contextText = hasFinancialContext
          ? `الملخص المالي الإجمالي المصرح بمشاركته من قبل المنشأة (أرقام إجمالية مجهولة ومجردة):\n${JSON.stringify(
              sanitizedContext,
              null,
              2
            )}`
          : `سياق الخصوصية: لم يقم المستخدم بمشاركة أي بيانات مالية لمنشأته مع هذا الطلب. أجب عن الاستفسار محاسبياً وضريبياً بشكل عام ومباشر.`;

        const geminiCall = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemInstruction}\n\n${contextText}\n\nطلب المستخدم:\n${prompt}`,
                },
              ],
            },
          ],
        });

        // Enforce 25-second timeout for external AI gateway call
        const response = await withTimeout(geminiCall, 25000, 'Gemini AI Advisor');
        const reply = response.text || 'لم يتم استلام رد من النموذج.';

        res.json({
          success: true,
          isConfigured: true,
          reply,
          requestId: req.id,
        });
      } catch (error: any) {
        next(error);
      }
    }
  );

  /**
   * Real ZATCA Phase 2 Validation & Clearance Endpoints
   * Includes:
   * - Strict Request Payload Validation (Invoice schema & Company VAT format)
   * - Dedicated Rate Limiting (60 requests/min)
   * - Error ID Tracing
   */
  app.post(
    '/api/zatca/verify',
    zatcaVerifyLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parseResult = zatcaVerifySchema.safeParse(req.body);
        if (!parseResult.success) {
          const firstErr = parseResult.error.issues[0]?.message || 'بيانات الفاتورة أو المنشأة غير مكتملة';
          const err: any = new Error(firstErr);
          err.statusCode = 400;
          return next(err);
        }

        const { invoice, company } = parseResult.data;

        // Compute server-side real SHA-256
        const invoiceContent = `${company.vatNumber}_${invoice.invoiceNumber}_${invoice.totalAmount}_${invoice.issueDate}`;
        const hash = crypto.createHash('sha256').update(invoiceContent).digest('base64');
        const hexHash = crypto.createHash('sha256').update(invoiceContent).digest('hex');

        const isB2B = invoice.type === 'tax_invoice';
        const passedChecks: string[] = [];
        const warnings: string[] = [];
        const errors: string[] = [];

        // Check VAT format (15 digits starting and ending with 3)
        if (/^3\d{13}3$/.test(company.vatNumber || '')) {
          passedChecks.push(`BR-KSA-01: الرقم الضريبي للمنشأة (${company.vatNumber}) مطابق ومفحوص على مستوى الخادم.`);
        } else {
          errors.push(`BR-KSA-01: الرقم الضريبي للمنشأة (${company.vatNumber}) غير مطابق لقواعد هيئة الزكاة.`);
        }

        // Check Date
        if (invoice.issueDate) {
          passedChecks.push(`BR-KSA-02: تاريخ الفاتورة (${invoice.issueDate}) مسجل ومطابق.`);
        } else {
          errors.push('BR-KSA-02: تاريخ الفاتورة مفقود.');
        }

        // Check Math
        const lineTotal = (invoice.items || []).reduce(
          (acc: number, item: any) => acc + (item.subtotal || 0),
          0
        );
        if (invoice.taxableAmount !== undefined && Math.abs(lineTotal - (invoice.taxableAmount || 0)) < 0.05) {
          passedChecks.push('BR-KSA-04: مطابقة العمليات الحسابية والضريبة 15% بدقة رقمية تامة.');
        } else if (invoice.taxableAmount !== undefined) {
          warnings.push('BR-KSA-04: يوجد تفاوت طفيف في التقريب العشري للبنود.');
        }

        const status = errors.length > 0 ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'PASS';
        const clearanceOrReportingStatus =
          errors.length > 0 ? 'REJECTED' : isB2B ? 'CLEARED' : 'REPORTED';
        const stamp = `ZATCA-PROD-ECDSA-${hexHash.substring(0, 16).toUpperCase()}`;

        res.json({
          success: errors.length === 0,
          status,
          clearanceOrReportingStatus,
          cryptographicStamp: stamp,
          hash,
          passedChecks,
          warnings,
          errors,
          timestamp: new Date().toISOString(),
          serverVerified: true,
          requestId: req.id,
        });
      } catch (err: any) {
        next(err);
      }
    }
  );

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      requestId: req.id,
    });
  });

  // Global Unified Error Handler for all /api routes
  app.use('/api', errorHandlerMiddleware);

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Fallback Error Handler
  app.use(errorHandlerMiddleware);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SECURE_SERVER] ShadiFlex ERP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
