"use client";

import React, { useState } from "react";
import {
  Calendar,
  Award,
  BookOpen,
  Send,
  QrCode,
  TrendingUp,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";

// استيراد Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<
    "today" | "grades" | "homework" | "points" | "leave" | "qrcode"
  >("today");

  // بيانات الطالب
  const student = {
    name: "زيد طارق محمود",
    className: "الأول متوسط (شعبة أ)",
    qrCode: "STU-2025-01",
    points: 185,
    rank: 3,
    totalStudentsInClass: 28,
    attendanceRate: 96,
  };

  // جدول اليوم
  const todaySchedule = [
    { period: 1, time: "8:00 - 8:45", subject: "الرياضيات", teacher: "أ. سارة الخالد", room: "قاعة 101" },
    { period: 2, time: "8:50 - 9:35", subject: "اللغة العربية", teacher: "أ. علي الكرخي", room: "قاعة 101" },
    { period: 3, time: "9:50 - 10:35", subject: "العلوم", teacher: "أ. حسين البصري", room: "المختبر العلمي" },
    { period: 4, time: "10:40 - 11:25", subject: "اللغة الإنجليزية", teacher: "أ. منى الزبيدي", room: "قاعة 101" },
    { period: 5, time: "11:30 - 12:15", subject: "التربية الإسلامية", teacher: "أ. ماجد الهاشمي", room: "المصلى" },
  ];

  // الدرجات والرسم البياني
  const subjectsGrades = [
    { subject: "الرياضيات", score: 92, average: 78 },
    { subject: "اللغة العربية", score: 88, average: 81 },
    { subject: "العلوم", score: 95, average: 75 },
    { subject: "اللغة الإنجليزية", score: 85, average: 72 },
    { subject: "التربية الإسلامية", score: 98, average: 90 },
    { subject: "الاجتماعيات", score: 79, average: 74 },
  ];

  // بيانات رسم Chart.js
  const chartData = {
    labels: subjectsGrades.map((s) => s.subject),
    datasets: [
      {
        label: "درجتي",
        data: subjectsGrades.map((s) => s.score),
        backgroundColor: "rgba(37, 99, 235, 0.8)",
        borderRadius: 8,
      },
      {
        label: "متوسط الفصل",
        data: subjectsGrades.map((s) => s.average),
        backgroundColor: "rgba(148, 163, 184, 0.5)",
        borderRadius: 8,
      },
    ],
  };

  // الواجبات
  const [homeworkList, setHomeworkList] = useState([
    {
      id: "hw1",
      subject: "الرياضيات",
      title: "حل تمارين المعادلات الخطية صفحة 45",
      dueDate: "2026-09-28",
      description: "حل التمارين من رقم 1 إلى رقم 10 في الدفتر وكتابة الناتج النهائي هنا.",
      status: "submitted",
      solution: "تم تسليم الحل: النواتج س=5، ص=12، مجموعة الحل {3, 7}",
      score: "10 / 10",
    },
    {
      id: "hw2",
      subject: "العلوم",
      title: "بحث مبسط عن مكونات الخلية النباتية",
      dueDate: "2026-09-30",
      description: "اكتب فقرة ملخصة تشرح الفرق بين الجدار الخلوي والغشاء البلازمي.",
      status: "pending",
      solution: "",
      score: null,
    },
  ]);

  // طلبات الإجازة
  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: "l1",
      startDate: "2026-09-15",
      endDate: "2026-09-15",
      reason: "مراجعة طبية طارئة",
      status: "approved",
    },
  ]);

  // نوافذ
  const [activeSolutionModal, setActiveSolutionModal] = useState<string | null>(null);
  const [solutionInput, setSolutionInput] = useState("");
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveData, setLeaveData] = useState({ startDate: "", endDate: "", reason: "" });

  const handleSubmitSolution = (hwId: string) => {
    if (!solutionInput.trim()) return;
    setHomeworkList((prev) =>
      prev.map((h) =>
        h.id === hwId
          ? { ...h, status: "submitted", solution: solutionInput.trim() }
          : h
      )
    );
    setActiveSolutionModal(null);
    setSolutionInput("");
    alert("تم تسليم حلك بنجاح إلى معلم المادة!");
  };

  const handleRequestLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveData.reason) return;
    setLeaveRequests([
      ...leaveRequests,
      {
        id: "l" + (leaveRequests.length + 1),
        startDate: leaveData.startDate || new Date().toISOString().split("T")[0],
        endDate: leaveData.endDate || new Date().toISOString().split("T")[0],
        reason: leaveData.reason,
        status: "pending",
      },
    ]);
    setLeaveData({ startDate: "", endDate: "", reason: "" });
    setLeaveModal(false);
    alert("تم إرسال طلب الإجازة لإدارة المدرسة للمراجعة.");
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-600 selection:text-white pb-12" dir="rtl">
      {/* الرأس */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">{student.name}</h1>
              <p className="text-xs text-slate-500">{student.className}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <InstallPWA variant="badge" />
            <LogoutButton />
          </div>
        </div>

        {/* شريط التبويبات */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-slate-100 py-1.5 scrollbar-none">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "today" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>جدولي اليوم</span>
          </button>

          <button
            onClick={() => setActiveTab("grades")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "grades" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>درجاتي وغياباتي</span>
          </button>

          <button
            onClick={() => setActiveTab("homework")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "homework" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>الواجبات وحلها</span>
          </button>

          <button
            onClick={() => setActiveTab("points")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "points" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>نقاطي والترتيب</span>
          </button>

          <button
            onClick={() => setActiveTab("qrcode")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "qrcode" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>بطاقتي ورمز QR</span>
          </button>

          <button
            onClick={() => setActiveTab("leave")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "leave" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>طلبات الإجازة</span>
          </button>
        </div>
      </header>

      {/* المحتوى */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* تبويب جدول اليوم */}
        {activeTab === "today" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-md flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">مرحباً بك يا {student.name}!</h2>
                <p className="text-xs text-amber-100 mt-1">لديك 5 حصص دراسية اليوم. نتمنى لك يوماً دراسياً متميزاً.</p>
              </div>
              <div className="text-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                <span className="text-[10px] block text-amber-100">الترتيب في الفصل</span>
                <span className="text-xl font-black">المركز {student.rank}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-800">
                الحصص الدراسية المقررة لليوم
              </div>
              <div className="divide-y divide-slate-100">
                {todaySchedule.map((p) => (
                  <div key={p.period} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm">
                        {p.period}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{p.subject}</h4>
                        <p className="text-xs text-slate-500">{p.teacher} • {p.room}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold">
                      {p.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* تبويب الدرجات مع Chart.js */}
        {activeTab === "grades" && (
          <div className="space-y-6">
            {/* بطاقات المؤشرات السريعة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-slate-500">المعدل العام التراكمي</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">89.8%</div>
                  <p className="text-[11px] text-emerald-600 mt-1">تقدير: جيد جداً مرتفع</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-slate-500">نسبة الحضور المدرسي</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{student.attendanceRate}%</div>
                  <p className="text-[11px] text-slate-500 mt-1">الغياب الإجمالي: حصتان فقط</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-slate-500">تحليل المستوى الذكي</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-bold text-slate-800">مستوى مستقر ومتميز</div>
                  <p className="text-[11px] text-slate-500 mt-1">تفوق ملحوظ في مادتي العلوم والرياضيات</p>
                </CardContent>
              </Card>
            </div>

            {/* رسم بياني مقارن بالـ Chart.js */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4">مقارنة درجاتي مع متوسط الشعبة</h3>
              <div className="h-64">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "top", rtl: true },
                    },
                  }}
                />
              </div>
            </div>

            {/* جدول الدرجات */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b text-slate-600">
                  <tr>
                    <th className="p-3">المادة الدراسية</th>
                    <th className="p-3">درجتي</th>
                    <th className="p-3">متوسط الفصل</th>
                    <th className="p-3">التقييم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectsGrades.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-slate-800">{item.subject}</td>
                      <td className="p-3 font-bold text-blue-600">{item.score} / 100</td>
                      <td className="p-3 text-slate-500">{item.average}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.score >= 90 ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {item.score >= 90 ? "ممتاز" : "جيد جداً"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* تبويب الواجبات وحلها */}
        {activeTab === "homework" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">الواجبات المدرسية المطلوبة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {homeworkList.map((hw) => (
                <div key={hw.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-bold text-xs">{hw.subject}</span>
                      <span className="text-xs text-slate-500">آخر موعد: {hw.dueDate}</span>
                    </div>
                    <h3 className="font-bold text-base text-slate-800 mb-2">{hw.title}</h3>
                    <p className="text-xs text-slate-600 mb-4 leading-relaxed">{hw.description}</p>
                    {hw.solution && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-3">
                        <div className="font-bold text-slate-700 mb-1">حلك المسلم:</div>
                        <p className="text-slate-600">{hw.solution}</p>
                        {hw.score && (
                          <div className="mt-2 text-emerald-600 font-bold">الدرجة: {hw.score}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    {hw.status === "submitted" ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم تسليم الواجب بنجاح</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setActiveSolutionModal(hw.id);
                          setSolutionInput("");
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4 ml-1.5" />
                        كتابة وتسليم الحل الآن
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* تبويب النقاط والترتيب */}
        {activeTab === "points" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-2xl shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-purple-200">رصيدك الحالي من نقاط التميز</span>
                  <div className="text-4xl font-black mt-1">{student.points} نقطة</div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-amber-300" />
                </div>
              </div>
              <p className="text-xs text-purple-100 mt-4">
                تمنح النقاط بناءً على الانضباط، حل الواجبات في موعدها، والتفاعل الصفي المتميز.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-sm text-slate-800 mb-3">سجل أحدث النقاط المحصلة</h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-between">
                  <span>إجابة نموذجية في مادة الرياضيات وتفاعل صفي</span>
                  <span className="font-bold">+5 نقاط</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-between">
                  <span>تسليم واجب العلوم قبل الموعد المحدد</span>
                  <span className="font-bold">+3 نقاط</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* تبويب رمز QR الخاص بالطالب */}
        {activeTab === "qrcode" && (
          <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-slate-200 text-center shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">بطاقة الحضور الرقمية</h3>
            <p className="text-xs text-slate-500 mb-6">أظهر هذا الرمز لمعلم المادة عند الحصة لتسجيل حضورك فورياً</p>

            <div className="p-6 bg-slate-900 rounded-2xl inline-block mx-auto mb-4 border-4 border-blue-500/20 shadow-inner">
              <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center p-3 text-slate-900 font-mono text-center">
                <div>
                  <QrCode className="w-32 h-32 mx-auto text-slate-900" />
                  <span className="text-xs font-bold block mt-2 text-slate-700">{student.qrCode}</span>
                </div>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-800">{student.name}</div>
            <div className="text-[11px] text-slate-500">{student.className}</div>
          </div>
        )}

        {/* تبويب طلبات الإجازة */}
        {activeTab === "leave" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">طلبات الإجازة والأعذار</h2>
                <p className="text-xs text-slate-500">تقديم عذر غياب رسمي للمراجعة والاعتماد من الإدارة</p>
              </div>
              <Button onClick={() => setLeaveModal(true)} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 ml-1.5" />
                تقديم طلب إجازة
              </Button>
            </div>

            <div className="space-y-3">
              {leaveRequests.map((lr) => (
                <div key={lr.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{lr.reason}</div>
                    <div className="text-[11px] text-slate-500 mt-1">التاريخ: {lr.startDate} إلى {lr.endDate}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    lr.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {lr.status === "approved" ? "تمت الموافقة" : "قيد المراجعة"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* نافذة تسليم حل الواجب */}
      {activeSolutionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">تسليم حل الواجب (نصي)</h3>
            <p className="text-xs text-slate-500 mb-4">اكتب خطوات الحل أو النتائج النهائية للمعلم:</p>
            <textarea
              rows={5}
              value={solutionInput}
              onChange={(e) => setSolutionInput(e.target.value)}
              placeholder="اكتب حلك هنا بالتفصيل..."
              className="w-full px-3 py-2 border rounded-xl text-xs mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setActiveSolutionModal(null)}>إلغاء</Button>
              <Button onClick={() => handleSubmitSolution(activeSolutionModal)} className="bg-blue-600 hover:bg-blue-700">
                تسليم الإجابة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة طلب إجازة */}
      {leaveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-4">طلب إجازة أو تقديم عذر غياب</h3>
            <form onSubmit={handleRequestLeave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">من تاريخ:</label>
                <input
                  type="date"
                  required
                  value={leaveData.startDate}
                  onChange={(e) => setLeaveData({ ...leaveData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">إلى تاريخ:</label>
                <input
                  type="date"
                  required
                  value={leaveData.endDate}
                  onChange={(e) => setLeaveData({ ...leaveData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">سبب الإجازة أو العذر:</label>
                <textarea
                  required
                  rows={3}
                  value={leaveData.reason}
                  onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })}
                  placeholder="اكتب سبب الغياب بالتفصيل..."
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setLeaveModal(false)}>إلغاء</Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700">إرسال الطلب</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
