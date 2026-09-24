"use client";

import React from "react";
import { WifiOff, RefreshCw, BookOpen } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="w-24 h-24 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 text-blue-400">
        <WifiOff className="w-12 h-12 animate-pulse" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-2">أنت في وضع عدم الاتصال بالإنترنت</h1>
      <p className="text-slate-400 max-w-md text-sm sm:text-base mb-8">
        لا تقلق! التطبيق يخزن جدولك الدراسي ودرجاتك الأخيرة تلقائياً لتعمل حتى بدون اتصال. تحقق من اتصالك واضغط إعادة المحاولة.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={handleReload}
          className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-lg transition active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>إعادة المحاولة</span>
        </button>

        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 font-medium text-slate-300 border border-slate-700 transition"
        >
          <BookOpen className="w-4 h-4" />
          <span>البيانات المخزنة</span>
        </Link>
      </div>

      <div className="mt-12 text-xs text-slate-500">
        نظام إدارة المدرسة الذكية - يعمل كتطبيق PWA متكامل
      </div>
    </div>
  );
}
