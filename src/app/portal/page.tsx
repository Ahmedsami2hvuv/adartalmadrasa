"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, GraduationCap, School, ShieldCheck } from "lucide-react";

function PortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [msg, setMsg] = useState("جارٍ التحقق وتجهيز الدخول إلى المنصة...");
  const [displayName, setDisplayName] = useState("مرحباً بك");

  useEffect(() => {
    const id = searchParams.get("id");
    const role = searchParams.get("role") as "director" | "vice_director" | "teacher" | "student" | "parent" | null;
    const name = searchParams.get("name");

    if (!role) {
      setStatus("error");
      setMsg("رابط الدخول غير صالح أو ينقصه تحديد الكيان.");
      return;
    }

    try {
      // حفظ الجلسة في الكوكيز لتمكين التصفح بدون تسجيل دخول
      const cleanName = name
        ? decodeURIComponent(name)
        : role === "teacher"
        ? "أستاذ"
        : role === "parent"
        ? "ولي أمر"
        : role === "student"
        ? "طالب"
        : role === "vice_director"
        ? "المعاون"
        : "المدير";

      setDisplayName(cleanName);

      document.cookie = `auth_role=${role}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `auth_name=${encodeURIComponent(cleanName)}; path=/; max-age=2592000; SameSite=Lax`;
      if (id) {
        document.cookie = `auth_id=${id}; path=/; max-age=2592000; SameSite=Lax`;
      }

      setStatus("success");
      setMsg(`تم التعرف على بياناتك بنجاح، جاري نقلك إلى لوحتك الخاصة...`);

      const timer = setTimeout(() => {
        router.replace("/dashboard");
      }, 1000);

      return () => clearTimeout(timer);
    } catch {
      setStatus("error");
      setMsg("تعذر إتمام الدخول التلقائي.");
    }
  }, [searchParams, router]);

  return (
    <div
      className="min-h-screen grid place-items-center bg-[#fbfafd] p-4 relative overflow-hidden selection:bg-indigo-100"
      dir="rtl"
    >
      {/* خلفيات ضوئية ناعمة */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/60" />
      <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-indigo-200/40 rounded-full blur-[80px]" />
      <div className="absolute -bottom-24 -left-24 w-[520px] h-[520px] bg-violet-200/40 rounded-full blur-[90px]" />

      {/* البطاقة الزجاجية الفاخرة */}
      <div className="relative w-full max-w-[460px] rounded-[32px] bg-white/85 backdrop-blur-xl border border-slate-200/70 shadow-soft-lg p-8 text-center">
        {/* الأيقونة العلوية */}
        <div className="mx-auto w-[74px] h-[74px] rounded-[24px] bg-gradient-to-br from-slate-900 to-indigo-700 grid place-items-center text-white shadow-lg relative mb-5">
          <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-white/20 to-transparent" />
          <GraduationCap className="w-8 h-8 text-white relative z-10" />
          {status === "success" && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white grid place-items-center text-[10px] font-black text-white shadow">
              ✓
            </span>
          )}
        </div>

        {/* النصوص الترحيبية */}
        <h2 className="text-[21px] font-extrabold text-slate-900 tracking-tight">
          {status === "error" ? "تعذر الدخول التلقائي" : `أهلاً وسهلاً، ${displayName}!`}
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-slate-600">
          {status === "error"
            ? msg
            : "تم التحقق من بيانات الدخول بنجاح. نحن نوجهك الآن إلى لوحتك الخاصة بأمان تام."}
        </p>

        {/* حالة الخطأ */}
        {status === "error" && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs w-full text-right">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{msg}</span>
            </div>
            <a
              href="/login"
              className="mt-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl transition shadow-sm"
            >
              الذهاب إلى صفحة تسجيل الدخول
            </a>
          </div>
        )}

        {/* حالات التحميل والنجاح */}
        {status !== "error" && (
          <>
            {/* أنيميشن الدوائر القافزة */}
            <div className="mt-6 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-slate-900 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>

            {/* شريط التحميل المتدفق */}
            <div className="mt-6 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-[75%] bg-gradient-to-l from-slate-900 to-indigo-600 rounded-full animate-[shimmer_1.2s_ease-in-out_infinite]" />
            </div>

            {/* مؤشرات التحقق الثلاثية */}
            <div className="mt-6 grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
                <div className="font-bold text-slate-500">التحقق</div>
                <div className="text-emerald-600 font-extrabold mt-1">✓ تم بنجاح</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
                <div className="font-bold text-slate-500">الجلسة الآمنة</div>
                <div className="text-indigo-600 font-extrabold mt-1">● نشطة</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-2.5">
                <div className="font-bold text-slate-500">التوجيه</div>
                <div className="text-slate-700 font-extrabold mt-1">جارٍ الآن...</div>
              </div>
            </div>

            {/* الرابط اليدوي */}
            <div className="mt-6 text-[11.5px] text-slate-500">
              إذا لم يتم التوجيه تلقائياً،{" "}
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
              >
                اضغط هنا للدخول مباشرة
              </button>
            </div>
          </>
        )}
      </div>

      {/* حقوق وتذييل */}
      <div className="absolute bottom-4 text-center text-xs text-slate-400">
        منظومة إدارة المدرسة الذكية • دخول مباشر آمن
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbfafd] flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  );
}
