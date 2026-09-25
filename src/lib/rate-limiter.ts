import { NextRequest } from "next/server";

interface RequestRecord {
  timestamps: number[];
  bannedUntil?: number;
  violationCount: number;
}

// تخزين محلي سريع في الذاكرة لتتبع الآي بي والزيارات
// هذا يضمن أداء فائق السرعة بدون استهلاك قاعدة البيانات أو رصيد فيرسل
const ipStore = new Map<string, RequestRecord>();

// إعدادات نظام الحماية
export const RATE_LIMIT_CONFIG = {
  // الحد الأقصى للطلبات خلال نافذة الدقيقة (60 ثانية)
  MAX_REQUESTS_PER_MINUTE: 80,
  // الحد الأقصى للطلبات خلال الانفجار السريع (10 ثوانٍ) لمنع هجمات السبام السريعة
  MAX_BURST_REQUESTS_10S: 25,
  // مدة الحظر الأولية بالمللي ثانية (15 دقيقة)
  INITIAL_BAN_DURATION_MS: 15 * 60 * 1000,
  // مدة الحظر المضاعف في حال تكرار الهجوم (ساعة كاملة)
  EXTENDED_BAN_DURATION_MS: 60 * 60 * 1000,
  // الحد الأقصى لسجلات الآي بي في الذاكرة لمنع امتلاء الرام
  MAX_MAP_ENTRIES: 10000,
};

// استخراج عنوان الآي بي الحقيقي للزائر
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  // @ts-ignore
  if (request.ip) return request.ip;

  return "unknown-ip";
}

// دالة تنظيف الذاكرة دورياً لإزالة العناوين القديمة
function cleanupOldRecords() {
  const now = Date.now();
  if (ipStore.size > RATE_LIMIT_CONFIG.MAX_MAP_ENTRIES) {
    ipStore.forEach((record, ip) => {
      // إزالة السجلات التي انتهى حظرها ولم ترسل طلبات منذ أكثر من ساعة
      const isBanned = record.bannedUntil && record.bannedUntil > now;
      const lastRequest = record.timestamps[record.timestamps.length - 1] || 0;
      if (!isBanned && now - lastRequest > 60 * 60 * 1000) {
        ipStore.delete(ip);
      }
    });
  }
}

export interface SecurityCheckResult {
  allowed: boolean;
  banned: boolean;
  remainingTimeSeconds?: number;
  reason?: string;
  ip: string;
}

/**
 * فحص أمان الزيارة: هل مسموح للآي بي بالمرور أم يتم حظره فوراً؟
 */
export function checkRateLimit(request: NextRequest): SecurityCheckResult {
  const ip = getClientIp(request);
  const now = Date.now();

  // عدم تطبيق الحظر القاسي على الاستضافة المحلية أثناء التطوير
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
    return { allowed: true, banned: false, ip };
  }

  // تنظيف السجلات القديمة بين الحين والآخر
  if (Math.random() < 0.05) {
    cleanupOldRecords();
  }

  let record = ipStore.get(ip);
  if (!record) {
    record = { timestamps: [now], violationCount: 0 };
    ipStore.set(ip, record);
    return { allowed: true, banned: false, ip };
  }

  // 1. هل الآي بي محظور حالياً؟
  if (record.bannedUntil && record.bannedUntil > now) {
    const remainingTimeSeconds = Math.ceil((record.bannedUntil - now) / 1000);
    return {
      allowed: false,
      banned: true,
      remainingTimeSeconds,
      reason: "تم حظر هذا العنوان مؤقتاً بسبب رصد عدد هائل من الزيارات المكررة.",
      ip,
    };
  }

  // إذا انتهت فترة الحظر السابقة، نزيل حالة الحظر
  if (record.bannedUntil && record.bannedUntil <= now) {
    record.bannedUntil = undefined;
  }

  // تنظيف الطوابع الزمنية التي مر عليها أكثر من 60 ثانية
  record.timestamps = record.timestamps.filter((t) => now - t <= 60 * 1000);
  record.timestamps.push(now);

  // 2. فحص الانفجار السريع (آخر 10 ثوانٍ)
  const last10sRequests = record.timestamps.filter((t) => now - t <= 10 * 1000).length;
  if (last10sRequests > RATE_LIMIT_CONFIG.MAX_BURST_REQUESTS_10S) {
    record.violationCount += 1;
    const banDuration =
      record.violationCount > 1
        ? RATE_LIMIT_CONFIG.EXTENDED_BAN_DURATION_MS
        : RATE_LIMIT_CONFIG.INITIAL_BAN_DURATION_MS;

    record.bannedUntil = now + banDuration;
    const remainingTimeSeconds = Math.ceil(banDuration / 1000);

    return {
      allowed: false,
      banned: true,
      remainingTimeSeconds,
      reason: "تم حظر هذا الجهاز فوراً بسبب إرسال طلبات مكثفة وسريعة جداً (محاولة إغراق).",
      ip,
    };
  }

  // 3. فحص عدد الطلبات في الدقيقة الكاملة
  if (record.timestamps.length > RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE) {
    record.violationCount += 1;
    const banDuration =
      record.violationCount > 1
        ? RATE_LIMIT_CONFIG.EXTENDED_BAN_DURATION_MS
        : RATE_LIMIT_CONFIG.INITIAL_BAN_DURATION_MS;

    record.bannedUntil = now + banDuration;
    const remainingTimeSeconds = Math.ceil(banDuration / 1000);

    return {
      allowed: false,
      banned: true,
      remainingTimeSeconds,
      reason: "تم تجاوز الحد المسموح به للزيارات في الدقيقة الواحدة.",
      ip,
    };
  }

  return { allowed: true, banned: false, ip };
}

/**
 * صفحة استجابة جذابة باللغة العربية تظهر للمستخدم أو الأداة المحظورة
 */
export function createBlockedResponse(result: SecurityCheckResult): Response {
  const minutes = Math.ceil((result.remainingTimeSeconds || 60) / 60);

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم تقييد الوصول مؤقتاً | نظام حماية الموقع</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    body {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 1.25rem;
      padding: 2.5rem 2rem;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(239, 68, 68, 0.15);
      backdrop-filter: blur(12px);
    }
    .shield-icon {
      width: 72px;
      height: 72px;
      background: rgba(239, 68, 68, 0.15);
      border: 2px solid #ef4444;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
      color: #ef4444;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.75rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.975rem;
      line-height: 1.6;
      margin-bottom: 1.25rem;
    }
    .info-badge {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid #334155;
      padding: 0.85rem 1.25rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      color: #cbd5e1;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .info-badge strong {
      color: #f87171;
    }
    .timer {
      font-weight: 700;
      color: #38bdf8;
    }
    .footer {
      font-size: 0.8rem;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="shield-icon">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h1>تم تقييد الوصول مؤقتاً</h1>
    <p>${result.reason || "تم رصد عدد هائل وغير طبيعي من الزيارات المتكررة من جهازك."}</p>
    
    <div class="info-badge">
      <div>تم تفعيل جدار الحماية لحماية موارد وسيرفرات الموقع من الاستنزاف.</div>
      <div>مدة الحظر المتبقية: <span class="timer">حوالي ${minutes} دقيقة</span></div>
      <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">عنوان الآي بي: ${result.ip}</div>
    </div>

    <p style="font-size: 0.85rem; margin-bottom: 0;">يرجى إغلاق أدوات إعادة التحميل التلقائي أو التوقف عن إرسال الطلبات، وسيتم فك الحظر تلقائياً بعد انتهاء المدة.</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 429,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": String(result.remainingTimeSeconds || 60),
      "X-RateLimit-Banned": "true",
    },
  });
}
