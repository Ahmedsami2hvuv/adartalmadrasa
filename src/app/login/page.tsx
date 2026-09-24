"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lock, Mail, AlertCircle, School } from "lucide-react";
import { InstallPWA } from "@/components/install-pwa";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // فحص الجلسة في الخلفية دون حجب واجهة تسجيل الدخول
  useEffect(() => {
    async function verifySession() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          window.location.replace("/dashboard");
        }
      } catch (e) {
        // تجاهل أي بطء في الخلفية
      }
    }
    verifySession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials") || error.message.includes("invalid")) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        }
        throw error;
      }

      if (data?.user) {
        // فحص حالة الحساب
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("id", data.user.id)
          .single();

        if (profile && profile.is_active === false) {
          await supabase.auth.signOut();
          throw new Error("هذا الحساب معطل حالياً من قبل إدارة المدرسة.");
        }

        window.location.replace("/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "تعذر تسجيل الدخول، يرجى التأكد من البيانات والمحاولة لاحقاً.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between selection:bg-slate-800 selection:text-white" dir="rtl">
      {/* شريط علوي بسيط */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <School className="w-5 h-5 text-slate-100" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">نظام إدارة المدرسة</h1>
            <p className="text-[11px] text-slate-500">بوابة الإدارة المركزية الموحدة</p>
          </div>
        </div>

        <div>
          <InstallPWA variant="badge" />
        </div>
      </header>

      {/* نموذج تسجيل الدخول الفوري */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">تسجيل الدخول للنظام</h2>
            <p className="text-xs text-slate-500 mt-1">
              أدخل البريد الإلكتروني وكلمة المرور الخاصة بحسابك في المدرسة
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.edu"
                  required
                  autoFocus
                  className="w-full pl-3 pr-9 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 placeholder:text-slate-400 bg-white"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3 pr-9 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 placeholder:text-slate-400 bg-white"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {loading ? "جارٍ التحقق..." : "دخول النظام"}
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
