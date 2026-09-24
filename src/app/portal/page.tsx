"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, School } from "lucide-react";

function PortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [msg, setMsg] = useState("جارٍ التحقق وتجهيز الدخول إلى المنصة...");

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
      const cleanName = name ? decodeURIComponent(name) : (
        role === "teacher" ? "أستاذ" :
        role === "parent" ? "ولي أمر" :
        role === "student" ? "طالب" :
        role === "vice_director" ? "المعاون" : "المدير"
      );

      document.cookie = `auth_role=${role}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `auth_name=${encodeURIComponent(cleanName)}; path=/; max-age=2592000; SameSite=Lax`;
      if (id) {
        document.cookie = `auth_id=${id}; path=/; max-age=2592000; SameSite=Lax`;
      }

      setStatus("success");
      setMsg(`مرحباً بك ${cleanName}، جارٍ توجيهك إلى لوحتك الخاصة...`);

      setTimeout(() => {
        router.replace("/dashboard");
      }, 700);
    } catch (e) {
      setStatus("error");
      setMsg("تعذر إتمام الدخول التلقائي.");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full shadow-lg flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
          <School className="w-8 h-8" />
        </div>

        <div>
          <h1 className="font-bold text-slate-900 text-base mb-1">منصة المدرسة الذكية</h1>
          <p className="text-xs text-slate-500">نظام الدخول المباشر بالرابط الخاص</p>
        </div>

        <div className="w-full pt-2">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2 text-slate-600 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-slate-800" />
              <span>{msg}</span>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <span className="font-medium">{msg}</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              <span>{msg}</span>
              <a
                href="/login"
                className="mt-2 text-xs bg-slate-900 text-white px-4 py-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                الذهاب لصفحة الدخول
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  );
}
