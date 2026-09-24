"use client";

import React, { useState } from "react";
import { Lock, AlertCircle, School, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { InstallPWA } from "@/components/install-pwa";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // الدخول بكلمة المرور للإدارة فقط
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg("يرجى إدخال رمز المرور للمتابعة.");
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
        throw new Error(data.error || "رمز المرور غير صحيح.");
      }

      window.location.replace("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "تعذر تسجيل الدخول، يرجى التأكد من رمز المرور.";
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
      {/* شريط علوي */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <School className="w-5 h-5 text-slate-100" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">منظومة إدارة المدرسة الذكية</h1>
            <p className="text-[11px] text-slate-500 font-medium">بوابة الإدارة المركزية</p>
          </div>
        </div>

        <div>
          <InstallPWA variant="badge" />
        </div>
      </header>

      {/* المحتوى الرئيسي: نموذج دخول محمي بكلمة المرور فقط */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 flex flex-col justify-center">
        <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white mx-auto flex items-center justify-center mb-3 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
              تسجيل دخول الإدارة
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              أدخل رمز المرور المعتمد للدخول إلى لوحة إدارة المدرسة
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                رمز المرور:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                  dir="ltr"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loading ? "جارٍ التحقق..." : "دخول إلى لوحة الإدارة"}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              🔒 هذه البوابة مخصصة حصراً لإدارة المدرسة. المعلمون والطلاب وأولياء الأمور يدخلون مباشرة عبر روابطهم الخاصة المعتمدة.
            </p>
          </div>
        </div>
      </main>

      {/* تذييل رسمي */}
      <footer className="py-3.5 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        منظومة إدارة المدرسة المركزية • جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
