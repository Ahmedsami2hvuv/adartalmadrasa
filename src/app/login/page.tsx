"use client";

import React, { useState } from "react";
import { Lock, AlertCircle, School, Eye, EyeOff, ArrowRight } from "lucide-react";
import { InstallPWA } from "@/components/install-pwa";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg("يرجى إدخال كلمة المرور للمتابعة.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "كلمة المرور غير صحيحة.");
      }

      // الانتقال المباشر إلى لوحة التحكم
      window.location.replace("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "تعذر تسجيل الدخول، يرجى التأكد من كلمة المرور.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-100 flex flex-col justify-between selection:bg-slate-800 selection:text-white"
      dir="rtl"
    >
      {/* شريط علوي رسمي ومبسط */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <School className="w-5 h-5 text-slate-100" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">نظام إدارة المدرسة</h1>
            <p className="text-[11px] text-slate-500 font-medium">بوابة الدخول المركزية</p>
          </div>
        </div>

        <div>
          <InstallPWA variant="badge" />
        </div>
      </header>

      {/* واجهة الدخول بكلمة المرور فقط */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-7 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Lock className="w-6 h-6 text-slate-700" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">تسجيل الدخول للنظام</h2>
            <p className="text-xs text-slate-500 mt-1">
              أدخل كلمة المرور المعتمدة للوصول إلى لوحة التحكم
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 leading-relaxed animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الخاصة بك"
                  required
                  autoFocus
                  disabled={loading}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 placeholder:text-slate-400 bg-white transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارٍ التحقق...</span>
                </>
              ) : (
                <>
                  <span>دخول النظام</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* تذييل رسمي */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        منظومة إدارة المدرسة المركزية • جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
