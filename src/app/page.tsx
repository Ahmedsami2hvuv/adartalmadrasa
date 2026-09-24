import Link from "next/link";
import {
  GraduationCap,
  Users,
  QrCode,
  Calendar,
  Send,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { InstallPWA } from "@/components/install-pwa";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-600 selection:text-white">
      {/* شريط علوي */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                مدرستي الذكية
              </span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-medium">
                نظام إدارة المدارس السحابي المتكامل
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <InstallPWA variant="badge" />
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition active:scale-95"
            >
              <span>دخول النظام</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* القسم الرئيسي الترويجي */}
      <main className="flex-1">
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>جاهز للبيع والاستخدام الفوري للمدارس الأهلية والحكومية</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              إدارة مدرستك أصبحت أسهل،{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
                أذكى، وأسرع بكثير.
              </span>
            </h1>

            <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              منظومة سحابية متكاملة تشمل 5 لوحات تحكم متخصصة (المدير، المدرس، الطالب، ولي الأمر)،
              مع دعم العمل دون إنترنت كـ PWA، مسح حضور الطلاب بالباركود QR، وبوت تيليجرام تفاعلي.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <span>تجربة النظام الآن فوراً</span>
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div className="w-full sm:w-auto">
                <InstallPWA variant="button" />
              </div>
            </div>

            {/* بطاقة PWA الإرشادية */}
            <div className="max-w-xl mx-auto mb-16 text-right">
              <InstallPWA variant="banner" />
            </div>

            {/* شبكة الميزات الأساسية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-right">
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">5 لوحات تحكم مخصصة</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  لوحة للمدير، المعاون، المعلم، الطالب، وولي الأمر بصلاحيات دقيقة وتأمين كامل عبر سياسات سوبابيس (RLS).
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">تسجيل حضور ذكي بـ QR</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  بطاقة رقمية لكل طالب تحتوي باركود يمسحه المدرس بكاميرا هاتفه في ثوانٍ، لتسجيل الحضور وتحديث فوري لولي الأمر.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">تطبيق ويب تقدمي (PWA)</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  يثبت بنقرة واحدة كتطبيق جوال مستقل دون متجر تطبيقات، ويعمل حتى عند انقطاع الإنترنت مع تخزين مؤقت للجدول والدرجات.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">الجدول الأسبوعي الذكي</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  بناء الجداول الدراسية مع خوارزمية ذكية لمنع تضارب حصص المعلمين، مع إمكانية تحديد 5 أو 6 أيام عمل بسهولة.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">بوت تيليجرام وتنبيهات</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  إشعار صباحي يومي للمعلم بجدوله، وتنبيه قبل الحصة بـ 10 دقائق، وأوامر سريعة مثل /دروسي_اليوم و /احصائية_اليوم.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">تقارير PDF وإدارة الأقساط</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  توليد كشوفات درجات وتقارير دورية احترافية بضغطة زر لطباعتها أو إرسالها لولي الأمر، مع متابعة دقيقة للمستحقات المالية.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* التذييل */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>نظام إدارة المدرسة الذكية - تم البناء بواسطة Next.js 14 و Supabase ومستضاف على Vercel</p>
      </footer>
    </div>
  );
}
