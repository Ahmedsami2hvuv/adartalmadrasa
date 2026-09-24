"use client";

import React, { useState } from "react";
import { Lock, AlertCircle, School, Eye, EyeOff, ArrowRight, Users, GraduationCap, UserCheck, ShieldCheck, HeartHandshake } from "lucide-react";
import { InstallPWA } from "@/components/install-pwa";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // الدخول بكلمة المرور
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

  // الدخول المباشر السريع للكيان
  const handleDirectRoleLogin = (role: string, name: string) => {
    document.cookie = `auth_role=${role}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `auth_name=${encodeURIComponent(name)}; path=/; max-age=2592000; SameSite=Lax`;
    window.location.replace("/dashboard");
  };

  const entities = [
    {
      id: "director",
      title: "كيان المدير العام",
      desc: "لوحة القيادة المركزية والإدارة الشاملة",
      icon: ShieldCheck,
      color: "bg-slate-900 text-white",
      border: "border-slate-800",
      defaultName: "المدير العام",
    },
    {
      id: "vice_director",
      title: "كيان المعاون الإداري",
      desc: "متابعة الشؤون الإدارية وسجلات المدرسة",
      icon: UserCheck,
      color: "bg-indigo-900 text-white",
      border: "border-indigo-800",
      defaultName: "المعاون الإداري",
    },
    {
      id: "teacher",
      title: "كيان المدرس",
      desc: "جدول الحصص، رصد الغياب، والدرجات",
      icon: Users,
      color: "bg-emerald-800 text-white",
      border: "border-emerald-700",
      defaultName: "أستاذ المادة",
    },
    {
      id: "student",
      title: "كيان الطالب",
      desc: "جدول الدروس، الواجبات، والتقييمات",
      icon: GraduationCap,
      color: "bg-blue-800 text-white",
      border: "border-blue-700",
      defaultName: "الطالب",
    },
    {
      id: "parent",
      title: "كيان ولي أمر الطالب",
      desc: "متابعة حضور وغياب الابن والمستوى الدراسي",
      icon: HeartHandshake,
      color: "bg-amber-800 text-white",
      border: "border-amber-700",
      defaultName: "ولي الأمر",
    },
  ];

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
            <p className="text-[11px] text-slate-500 font-medium">بوابة الكيانات التعليمية الموحدة</p>
          </div>
        </div>

        <div>
          <InstallPWA variant="badge" />
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 flex flex-col justify-center">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5">
            اختر الكيان للدخول المباشر للنظام
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            يمكنك الدخول المباشر إلى أي كيان بنقرة واحدة، أو تسجيل الدخول بكلمة المرور
          </p>
        </div>

        {/* شبكة الكيانات الخمسة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {entities.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleDirectRoleLogin(item.id, item.defaultName)}
                className="bg-white border border-slate-200 hover:border-slate-400 p-4 rounded-xl text-right transition shadow-2xs hover:shadow-xs group flex items-start gap-3.5"
              >
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-slate-800">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {item.desc}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
                    <span>دخول مباشر</span>
                    <ArrowRight className="w-3 h-3 rotate-180" />
                  </div>
                </div>
              </button>
            );
          })}

          {/* صندوق الدخول بكلمة المرور المخصصة */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-slate-900 text-xs">الدخول بكلمة المرور</span>
              </div>
              {errorMsg && (
                <div className="p-2 mb-2 rounded bg-rose-50 text-rose-700 text-[11px] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleLogin} className="space-y-2 mt-1">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة المرور المعتمدة..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                {loading ? "جارٍ التحقق..." : "تأكيد الدخول"}
              </button>
            </form>
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
