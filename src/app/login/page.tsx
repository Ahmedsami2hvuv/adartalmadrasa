"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Shield,
  UserCheck,
  BookOpen,
  Users,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        // فحص دور المستخدم من profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const role = profile?.role || "student";
        localStorage.setItem(
          "demo_user",
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            role: role,
            name: data.user.user_metadata?.full_name || "مستخدم",
          })
        );
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء تسجيل الدخول";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  // تسجيل دخول تجريبي سريع بنقرة واحدة لسرعة المعاينة والبيع
  const handleQuickDemoLogin = (role: string, name: string) => {
    localStorage.setItem(
      "demo_user",
      JSON.stringify({
        id: "demo-" + role + "-id",
        role: role,
        name: name,
        email: `${role}@school.edu`,
      })
    );
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white" dir="rtl">
      <div className="w-full max-w-md">
        {/* الشعار واسم النظام */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 mx-auto flex items-center justify-center shadow-xl shadow-blue-500/20 mb-3">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">نظام إدارة المدرسة الذكية</h1>
          <p className="text-sm text-slate-400 mt-1">بوابة الدخول الموحدة للكوادر والطلاب وأولياء الأمور</p>
        </div>

        {/* بطاقة تسجيل الدخول الرئيسية */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSupabaseLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                البريد الإلكتروني أو اسم المستخدم
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.com"
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  required
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  required
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <span>{loading ? "جارٍ التحقق..." : "تسجيل الدخول"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* خط فاصل */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-slate-900 px-3 text-[11px] text-slate-400 font-semibold uppercase">
              أو تجربة الدخول المباشر (وضع الاستعراض الفوري)
            </span>
          </div>

          {/* أزرار الدخول السريع لاختبار كل دور */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("director", "أ. أحمد السامي (المدير العام)")}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-right flex items-center gap-2.5 transition active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-blue-300">لوحة المدير</div>
                <div className="text-[10px] text-slate-400">إدارة شاملة</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin("vice_director", "أ. محمد عبد الله (معاون المدير)")}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-right flex items-center gap-2.5 transition active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-indigo-300">معاون المدير</div>
                <div className="text-[10px] text-slate-400">جداول وصفوف</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin("teacher", "أ. سارة الخالد (مدرسة الرياضيات)")}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-right flex items-center gap-2.5 transition active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300">لوحة المدرس</div>
                <div className="text-[10px] text-slate-400">غياب ودرجات</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin("student", "زيد طارق (طالب - الأول متوسط)")}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-right flex items-center gap-2.5 transition active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-amber-300">لوحة الطالب</div>
                <div className="text-[10px] text-slate-400">جدول ونقاط وواجبات</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin("parent", "أبو زيد (ولي أمر الطالب زيد)")}
              className="col-span-2 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-right flex items-center justify-center gap-2.5 transition active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-purple-300">لوحة ولي الأمر</div>
                <div className="text-[10px] text-slate-400">متابعة الأبناء والأقساط وتقرير PDF</div>
              </div>
            </button>
          </div>
        </div>

        {/* تلميح سفلي */}
        <div className="text-center mt-6 text-xs text-slate-500">
          منصة سحابية متوافقة مع Vercel و Supabase • تدعم PWA
        </div>
      </div>
    </div>
  );
}
