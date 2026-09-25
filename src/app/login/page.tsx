"use client";

import React, { useState } from "react";
import { Lock, AlertCircle, School, Eye, EyeOff, ShieldCheck, X, QrCode, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { InstallPWA } from "@/components/install-pwa";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // الدخول بالرمز السري للمدير والمعاون فقط
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg("يرجى إدخال الرمز السري للمتابعة.");
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
        throw new Error(data.error || "الرمز السري غير صحيح.");
      }

      window.location.replace("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "تعذر تسجيل الدخول، يرجى التأكد من الرمز السري.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen grid lg:grid-cols-[1.15fr_1fr] bg-[#fbfafd] selection:bg-indigo-100"
      dir="rtl"
    >
      {/* القسم التعريفي الداكن (يظهر في الشاشات الكبيرة) */}
      <div className="relative hidden lg:flex overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] p-12 flex-col justify-between text-white">
        {/* خلفية التوهج الدائري الشبكي */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-indigo-500/20 blur-[90px]" />
        <div className="absolute -bottom-32 -left-24 w-[520px] h-[520px] rounded-full bg-violet-500/20 blur-[110px]" />

        {/* الترويسة العلوية في الجانب الداكن */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/10 grid place-items-center shadow-lg">
              <School className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-extrabold text-base leading-tight">
                منظومة إدارة المدرسة الذكية
              </div>
              <div className="text-white/60 text-[11px] tracking-[0.2em] mt-1 font-mono">
                SMART SCHOOL MANAGEMENT
              </div>
            </div>
          </div>
        </div>

        {/* المحتوى المركزي الترويجي */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>إدارة تعليمية مركزية ذكية وفورية</span>
            </div>
            <h1 className="text-[40px] leading-[1.1] font-[800] text-white">
              قيادة مدرسية محكمة،
              <br />
              تبدأ من{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-200 to-white">
                لوحةٍ واحدة
              </span>
            </h1>
            <p className="text-white/70 leading-7 text-[15px] max-w-[430px]">
              منصة شاملة للإشراف على شؤون المدرسة والتحكم المركزي بجميع العمليات: حضور فوري، رصد درجات، وتقارير ميدانية بدقة عالية.
            </p>
          </div>

          {/* إحصائيات المؤشرات السريعة */}
          <div className="grid grid-cols-3 gap-3 max-w-[440px]">
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-3.5 backdrop-blur">
              <div className="text-white font-extrabold text-[18px]">100%</div>
              <div className="text-white/60 text-[11px] mt-1">حماية وسرية تامة</div>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-3.5 backdrop-blur">
              <div className="text-white font-extrabold text-[18px]">+50%</div>
              <div className="text-white/60 text-[11px] mt-1">كفاءة العمل الإداري</div>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-3.5 backdrop-blur">
              <div className="text-white font-extrabold text-[18px]">24/7</div>
              <div className="text-white/60 text-[11px] mt-1">مزامنة سحابية حية</div>
            </div>
          </div>

          {/* بطاقة ثقة واقتباس */}
          <div className="rounded-[20px] bg-white/[0.06] border border-white/10 p-4 flex gap-3 items-center backdrop-blur max-w-[440px]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white shrink-0 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white/90 text-[12.5px] font-semibold leading-5">
                بوابة محمية ببروتوكولات التشفير المعتمدة لمدير المدرسة والمعاون.
              </div>
              <div className="text-white/50 text-[10.5px] mt-1">
                صلاحيات الإشراف الإداري والتحكم الكامل
              </div>
            </div>
          </div>
        </div>

        {/* التذييل في الجانب الداكن */}
        <div className="relative z-10 flex items-center justify-between text-white/40 text-[11px]">
          <span>© 2026 منظومة إدارة المدرسة الذكية</span>
          <div className="flex items-center gap-3">
            <span>الخصوصية والأمان</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>الدعم الفني</span>
          </div>
        </div>
      </div>

      {/* قسم تسجيل الدخول (اليمين في الهواتف، واليسار في الحواسيب) */}
      <div className="flex flex-col justify-between p-4 sm:p-8 bg-gradient-to-b from-white to-[#f8f7ff]">
        {/* الترويسة العليا للموبايل وزر التثبيت */}
        <div className="flex items-center justify-between mb-4">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#0f172a] grid place-items-center text-white shadow-sm">
              <School className="w-5 h-5" />
            </div>
            <span className="text-[13px] font-extrabold text-slate-900">
              إدارة المدرسة الذكية
            </span>
          </div>
          <div className="mr-auto">
            <InstallPWA variant="badge" />
          </div>
        </div>

        {/* بطاقة تسجيل الدخول المركزية */}
        <div className="w-full max-w-[440px] mx-auto my-auto">
          <div className="rounded-[32px] shadow-soft-lg bg-white/95 backdrop-blur-xl border border-slate-200/70 p-6 sm:p-8">
            {/* رأس البطاقة */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>دخول الإدارة فقط</span>
                </div>
                <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight">
                  تسجيل دخول الإدارة
                </h2>
                <p className="text-slate-500 text-[12.5px] mt-1 leading-relaxed">
                  مخصص حصرياً للمدير والمعاون عبر إدخال الرمز السري المعتمد.
                </p>
              </div>

              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-800 text-white grid place-items-center shadow-md shrink-0">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            {/* رسالة الخطأ إن وجدت */}
            {errorMsg && (
              <div className="p-3 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-[in_.2s_ease]">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* نموذج إدخال الرمز السري فقط */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-slate-700">
                    الرمز السري للمدير / المعاون:
                  </label>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    إدارة فقط
                  </span>
                </div>

                <div className="relative group">
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <Lock className="w-4 h-4" />
                  </span>

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="أدخل الرمز السري هنا..."
                    className="w-full h-[50px] pr-11 pl-16 rounded-2xl bg-slate-50 border border-slate-200 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 focus:bg-white transition-all font-mono"
                    dir="ltr"
                    autoFocus
                  />

                  {/* أزرار المسح وإظهار الرمز */}
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {password.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPassword("");
                          if (errorMsg) setErrorMsg("");
                        }}
                        className="w-7 h-7 grid place-items-center rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition"
                        title="مسح المكتوب"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="w-8 h-8 grid place-items-center rounded-xl hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition"
                      title={showPassword ? "إخفاء الرمز السري" : "إظهار الرمز السري"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* زر الدخول الآمن */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] rounded-2xl bg-gradient-to-l from-[#0f172a] to-[#4338ca] text-white font-bold text-[14px] shadow-[0_10px_20px_-8px_rgba(67,56,202,0.6)] hover:shadow-[0_14px_28px_-10px_rgba(67,56,202,0.7)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>جارٍ التحقق وتأكيد الصلاحية...</span>
                  </>
                ) : (
                  <>
                    <span>دخول آمن إلى لوحة الإدارة</span>
                    <ArrowLeft className="w-4 h-4 opacity-80" />
                  </>
                )}
              </button>
            </form>

            {/* فاصل جمالي */}
            <div className="relative py-3 my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400">
                  دخول الكيانات الأخرى
                </span>
              </div>
            </div>

            {/* زر توجيه لبوابة الدخول السريعة بالباركود أو الروابط المباشرة */}
            <a
              href="/portal"
              className="w-full h-[50px] rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 hover:bg-white hover:border-indigo-200 hover:shadow-soft transition-all flex items-center justify-center gap-2 text-[12.5px] font-bold text-slate-700 group"
            >
              <QrCode className="w-4 h-4 text-slate-800 group-hover:text-indigo-600 transition-colors" />
              <span>بوابة المعلمين والطلاب وأولياء الأمور</span>
              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-mono">
                Portal
              </span>
            </a>

            {/* حالة الأمان والتشغيل */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">النظام يعمل • تشفير طرف لطرف</span>
              </div>
              <div className="flex gap-2 font-bold text-slate-600">
                <span>نسخة آمنة</span>
              </div>
            </div>
          </div>

          {/* تنبيه وشروط الاستخدام */}
          <div className="mt-4 text-center text-[11px] text-slate-400 leading-relaxed">
            منظومة إدارة المدرسة الذكية • مخصصة للمصرح لهم فقط
          </div>
        </div>

        {/* تذييل الصفحة في الأسفل */}
        <div className="text-center text-xs text-slate-400 py-2">
          جميع الحقوق محفوظة © 2026
        </div>
      </div>
    </div>
  );
}
