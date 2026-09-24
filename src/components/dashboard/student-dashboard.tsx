"use client";

import React, { useState } from "react";
import {
  Calendar,
  Award,
  BookOpen,
  Send,
  QrCode,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  Clock,
  School,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function StudentDashboard({ currentUserName }: { currentUserName?: string }) {
  const [activeTab, setActiveTab] = useState<
    "today" | "grades" | "homework" | "points" | "leave" | "qrcode"
  >("today");

  const student = {
    name: currentUserName || "زيد طارق محمود",
    className: "الأول متوسط (شعبة أ)",
    qrCode: "STU-2025-01",
    points: 185,
    rank: 3,
    attendanceRate: 96,
  };

  const todaySchedule = [
    { period: 1, time: "8:00 - 8:45", subject: "الرياضيات", teacher: "أ. سارة الخالد" },
    { period: 2, time: "8:50 - 9:35", subject: "اللغة العربية", teacher: "أ. علي الكرخي" },
    { period: 3, time: "9:50 - 10:35", subject: "العلوم", teacher: "أ. حسين البصري" },
    { period: 4, time: "10:40 - 11:25", subject: "اللغة الإنجليزية", teacher: "أ. منى الزبيدي" },
    { period: 5, time: "11:30 - 12:15", subject: "التربية الإسلامية", teacher: "أ. ماجد الهاشمي" },
  ];

  const subjectsGrades = [
    { subject: "الرياضيات", score: 92, average: 78 },
    { subject: "اللغة العربية", score: 88, average: 81 },
    { subject: "العلوم", score: 95, average: 75 },
    { subject: "اللغة الإنجليزية", score: 85, average: 72 },
    { subject: "التربية الإسلامية", score: 98, average: 90 },
  ];

  const chartData = {
    labels: subjectsGrades.map((s) => s.subject),
    datasets: [
      {
        label: "درجتي",
        data: subjectsGrades.map((s) => s.score),
        backgroundColor: "#0f172a",
        borderRadius: 4,
      },
      {
        label: "متوسط الشعبة",
        data: subjectsGrades.map((s) => s.average),
        backgroundColor: "#94a3b8",
        borderRadius: 4,
      },
    ],
  };

  const [homeworkList, setHomeworkList] = useState([
    {
      id: "hw1",
      subject: "الرياضيات",
      title: "حل تمارين المعادلات الخطية صفحة 45",
      dueDate: "2026-09-28",
      description: "حل التمارين من رقم 1 إلى رقم 10 في الدفتر وكتابة الناتج النهائي هنا.",
      status: "submitted",
      solution: "س = 5، ص = 12، مجموعة الحل {3, 7}",
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

  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: "l1",
      startDate: "2026-09-15",
      endDate: "2026-09-15",
      reason: "مراجعة طبية",
      status: "approved",
    },
  ]);

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
    alert("تم تسليم الحل للمعلم.");
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
    alert("تم تقديم طلب الإجازة للمراجعة.");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-slate-800 selection:text-white pb-10" dir="rtl">
      {/* الرأس */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">بوابة الطالب</h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {student.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{student.className}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <InstallPWA variant="badge" />
            <LogoutButton />
          </div>
        </div>

        {/* التبويبات */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 border-t border-slate-100 py-1 scrollbar-none">
          {[
            { id: "today", label: "جدولي اليوم", icon: Calendar },
            { id: "grades", label: "الدرجات والغياب", icon: TrendingUp },
            { id: "homework", label: "الواجبات", icon: FileCheck },
            { id: "points", label: "النقاط والترتيب", icon: Award },
            { id: "qrcode", label: "بطاقة الحضور QR", icon: QrCode },
            { id: "leave", label: "طلبات الإجازة", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* المحتوى */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full mt-6 flex-1">
        {/* اليوم */}
        {activeTab === "today" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-sm">جدول الحصص المقررة اليوم</div>
                <div className="text-xs text-slate-500">الأول متوسط (شعبة أ)</div>
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-500">الترتيب بالفصل: </span>
                <span className="font-bold text-slate-900 text-sm">المركز {student.rank}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs divide-y divide-slate-100">
              {todaySchedule.map((p) => (
                <div key={p.period} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded bg-slate-100 text-slate-800 font-bold flex items-center justify-center">
                      {p.period}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{p.subject}</div>
                      <div className="text-[11px] text-slate-500">{p.teacher}</div>
                    </div>
                  </div>
                  <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {p.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* الدرجات */}
        {activeTab === "grades" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">المعدل العام</div>
                <div className="text-2xl font-bold text-slate-900">89.6%</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">نسبة الحضور</div>
                <div className="text-2xl font-bold text-slate-900">{student.attendanceRate}%</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-bold text-slate-800 mb-3">رسم بياني لمقارنة الدرجات مع متوسط الفصل</h3>
              <div className="h-56">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "top", rtl: true } },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* الواجبات */}
        {activeTab === "homework" && (
          <div className="space-y-3">
            {homeworkList.map((hw) => (
              <div key={hw.id} className="bg-white border border-slate-200 rounded-lg p-4 text-xs">
                <div className="flex justify-between text-slate-500 mb-1">
                  <span className="font-semibold text-slate-800">{hw.subject}</span>
                  <span>موعد التسليم: {hw.dueDate}</span>
                </div>
                <div className="font-bold text-slate-900 text-sm mb-1">{hw.title}</div>
                <p className="text-slate-600 mb-2">{hw.description}</p>
                {hw.status === "submitted" ? (
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                    <span className="font-semibold">الحل المسلم: </span>{hw.solution}
                    {hw.score && <span className="mr-2 text-emerald-700 font-bold">({hw.score})</span>}
                  </div>
                ) : (
                  <Button
                    onClick={() => { setActiveSolutionModal(hw.id); setSolutionInput(""); }}
                    className="bg-slate-900 text-white text-xs h-8 mt-1"
                  >
                    <Send className="w-3 h-3 ml-1.5" />
                    تسليم الإجابة
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* النقاط والترتيب */}
        {activeTab === "points" && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 max-w-md">
            <div className="text-xs text-slate-500 mb-1">رصيد نقاط التميز والالتزام</div>
            <div className="text-3xl font-bold text-slate-900 mb-2">{student.points} نقطة</div>
            <p className="text-xs text-slate-600">
              تمنح النقاط بناءً على الانضباط الصفي والواجبات المنجزة بدقة.
            </p>
          </div>
        )}

        {/* باركود QR */}
        {activeTab === "qrcode" && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-sm mx-auto text-center">
            <h3 className="font-bold text-slate-900 text-sm mb-1">رمز الحضور المدرسي (QR)</h3>
            <p className="text-xs text-slate-500 mb-4">يعرض للمعلم عند بدء الحصة لتسجيل الحضور</p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg inline-block mb-3">
              <QrCode className="w-36 h-36 mx-auto text-slate-900" />
            </div>
            <div className="font-mono text-xs text-slate-700 font-semibold">{student.qrCode}</div>
          </div>
        )}

        {/* طلبات الإجازة */}
        {activeTab === "leave" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900">سجل طلبات الإجازة</h2>
              <Button onClick={() => setLeaveModal(true)} className="bg-slate-900 text-white text-xs h-8">
                تقديم طلب إجازة
              </Button>
            </div>
            {leaveRequests.map((lr) => (
              <div key={lr.id} className="bg-white border border-slate-200 rounded-lg p-3 text-xs flex justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{lr.reason}</div>
                  <div className="text-slate-500 text-[11px]">{lr.startDate} إلى {lr.endDate}</div>
                </div>
                <span className="font-semibold text-slate-700">
                  {lr.status === "approved" ? "تمت الموافقة" : "قيد المراجعة"}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* نافذة تسليم حل الواجب */}
      {activeSolutionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-900 mb-2">تسليم حل الواجب</h3>
            <textarea
              rows={4}
              value={solutionInput}
              onChange={(e) => setSolutionInput(e.target.value)}
              placeholder="اكتب حلك هنا..."
              className="w-full p-2 border rounded border-slate-300 text-xs mb-3"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setActiveSolutionModal(null)} className="text-xs h-8">إلغاء</Button>
              <Button onClick={() => handleSubmitSolution(activeSolutionModal)} className="bg-slate-900 text-white text-xs h-8">
                تسليم
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الإجازة */}
      {leaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-900 mb-3">تقديم طلب إجازة</h3>
            <form onSubmit={handleRequestLeave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1">من تاريخ:</label>
                <input
                  type="date"
                  required
                  value={leaveData.startDate}
                  onChange={(e) => setLeaveData({ ...leaveData, startDate: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">إلى تاريخ:</label>
                <input
                  type="date"
                  required
                  value={leaveData.endDate}
                  onChange={(e) => setLeaveData({ ...leaveData, endDate: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">السبب:</label>
                <textarea
                  required
                  rows={3}
                  value={leaveData.reason}
                  onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setLeaveModal(false)} className="text-xs h-8">إلغاء</Button>
                <Button type="submit" className="bg-slate-900 text-white text-xs h-8">إرسال</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
