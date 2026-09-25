"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Award,
  Send,
  QrCode,
  TrendingUp,
  FileCheck,
  Clock,
  School,
  Loader2,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/client";

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string>("");
  const [studentData, setStudentData] = useState({
    name: currentUserName || "طالب",
    className: "الصف الدراسي",
    classId: "",
    qrCode: "STU-0000",
    points: 0,
    rank: 1,
    attendanceRate: 100,
  });

  const [todaySchedule, setTodaySchedule] = useState<{ period: number; time: string; subject: string; teacher: string }[]>([]);
  const [subjectsGrades, setSubjectsGrades] = useState<{ subject: string; score: number; average: number }[]>([]);
  const [homeworkList, setHomeworkList] = useState<{ id: string; subject: string; title: string; dueDate: string; description: string; status: string; solution?: string; score?: string }[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<{ id: string; startDate: string; endDate: string; reason: string; status: string }[]>([]);

  const [activeSolutionModal, setActiveSolutionModal] = useState<string | null>(null);
  const [solutionInput, setSolutionInput] = useState("");
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveData, setLeaveData] = useState({ startDate: "", endDate: "", reason: "" });

  const loadStudentData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) return;

      // 1. جلب سجل الطالب
      const { data: studentRec } = await supabase
        .from("students")
        .select("id, class_id, qr_code, points, classes(name, section), profiles(full_name)")
        .eq("profile_id", userId)
        .single();

      if (studentRec) {
        setStudentId(studentRec.id);
        const cls = studentRec.classes as unknown as { name: string; section: string } | null;
        const prof = studentRec.profiles as unknown as { full_name: string } | null;

        setStudentData((prev) => ({
          ...prev,
          name: prof?.full_name || prev.name,
          classId: studentRec.class_id,
          className: cls ? `${cls.name} (${cls.section})` : "غير معين",
          qrCode: studentRec.qr_code || "STU-0000",
          points: studentRec.points || 0,
        }));

        // 2. جلب جدول الحصص لليوم
        const todayDay = (new Date().getDay() + 1);
        const { data: dbSchedules } = await supabase
          .from("weekly_schedules")
          .select("period, subjects(name), teachers(profiles(full_name))")
          .eq("class_id", studentRec.class_id)
          .eq("day_of_week", todayDay)
          .order("period");

        if (dbSchedules) {
          setTodaySchedule(
            dbSchedules.map((sc: unknown) => {
              const row = sc as { period: number; subjects?: { name: string }; teachers?: { profiles?: { full_name: string } } };
              return {
                period: row.period,
                time: `الحصة ${row.period}`,
                subject: row.subjects?.name || "مادة",
                teacher: row.teachers?.profiles?.full_name || "معلم",
              };
            })
          );
        }

        // 3. جلب الدرجات الحقيقية
        const { data: dbGrades } = await supabase
          .from("grades")
          .select("score, subjects(name)")
          .eq("student_id", studentRec.id);

        if (dbGrades && dbGrades.length > 0) {
          setSubjectsGrades(
            dbGrades.map((g: unknown) => {
              const gr = g as { score: number; subjects?: { name: string } };
              return {
                subject: gr.subjects?.name || "مادة",
                score: Number(gr.score) || 0,
                average: 75,
              };
            })
          );
        }

        // 4. جلب الواجبات لصف الطالب
        const { data: dbHw } = await supabase
          .from("homeworks")
          .select("id, title, description, due_date, subjects(name)")
          .eq("class_id", studentRec.class_id);

        // جلب تسليمات الطالب
        const { data: dbSubmissions } = await supabase
          .from("homework_submissions")
          .select("homework_id, solution_text, score")
          .eq("student_id", studentRec.id);

        if (dbHw) {
          setHomeworkList(
            dbHw.map((h: unknown) => {
              const hw = h as { id: string; title: string; description: string; due_date: string; subjects?: { name: string } };
              const userSub = dbSubmissions?.find((s) => s.homework_id === hw.id);
              return {
                id: hw.id,
                title: hw.title,
                subject: hw.subjects?.name || "واجب",
                dueDate: hw.due_date,
                description: hw.description,
                status: userSub ? "submitted" : "pending",
                solution: userSub?.solution_text || "",
                score: userSub?.score ? `${userSub.score} / 10` : undefined,
              };
            })
          );
        }

        // 5. جلب طلبات الإجازة
        const { data: dbLeaves } = await supabase
          .from("leave_requests")
          .select("id, start_date, end_date, reason, status")
          .eq("student_id", studentRec.id);

        if (dbLeaves) {
          setLeaveRequests(
            dbLeaves.map((l) => ({
              id: l.id,
              startDate: l.start_date,
              endDate: l.end_date,
              reason: l.reason,
              status: l.status,
            }))
          );
        }
      }
    } catch (err) {
      console.warn("Student data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  // تسليم الواجب في سوبابيس
  const handleSubmitSolution = async (hwId: string) => {
    if (!solutionInput.trim() || !studentId) return;
    try {
      const supabase = createClient();
      await supabase.from("homework_submissions").upsert({
        homework_id: hwId,
        student_id: studentId,
        solution_text: solutionInput.trim(),
        status: "submitted",
      }, { onConflict: "homework_id,student_id" });

      loadStudentData();
      alert("تم تسليم حل الواجب إلى معلم المادة بنجاح.");
    } catch (e) {
      console.error(e);
    }
    setActiveSolutionModal(null);
    setSolutionInput("");
  };

  // تقديم طلب إجازة
  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveData.reason || !studentId) return;
    try {
      const supabase = createClient();
      await supabase.from("leave_requests").insert({
        student_id: studentId,
        start_date: leaveData.startDate || new Date().toISOString().split("T")[0],
        end_date: leaveData.endDate || new Date().toISOString().split("T")[0],
        reason: leaveData.reason,
        status: "pending",
      });
      loadStudentData();
      alert("تم إرسال طلب الإجازة لإدارة المدرسة.");
    } catch (e) {
      console.error(e);
    }
    setLeaveData({ startDate: "", endDate: "", reason: "" });
    setLeaveModal(false);
  };

  const chartData = {
    labels: subjectsGrades.length > 0 ? subjectsGrades.map((s) => s.subject) : ["الرياضيات", "اللغة العربية", "العلوم"],
    datasets: [
      {
        label: "درجتي",
        data: subjectsGrades.length > 0 ? subjectsGrades.map((s) => s.score) : [90, 85, 92],
        backgroundColor: "#0f172a",
        borderRadius: 4,
      },
      {
        label: "متوسط الشعبة",
        data: subjectsGrades.length > 0 ? subjectsGrades.map((s) => s.average) : [75, 78, 72],
        backgroundColor: "#94a3b8",
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row selection:bg-slate-800 selection:text-white" dir="rtl">
      {/* 1. القائمة الجانبية للشاشات الكبيرة (Sidebar Desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-l border-slate-200 sticky top-0 h-screen shrink-0 shadow-2xs z-30">
        {/* رأس القائمة الجانبية */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <School className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-sm text-slate-900 truncate">بوابة الطالب</h1>
              <p className="text-[11px] text-slate-500">{studentData.className}</p>
            </div>
          </div>

          <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
            <div className="min-w-0 pr-1">
              <span className="text-[10px] text-slate-500 block">الطالب:</span>
              <span className="text-xs font-bold text-slate-900 truncate block">
                {studentData.name}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
              {studentData.points} نقطة
            </span>
          </div>
        </div>

        {/* روابط التنقل الرئيسية في القائمة الجانبية */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: "today", label: "جدولي اليوم", icon: Calendar, count: todaySchedule.length },
            { id: "grades", label: "الدرجات والغياب", icon: TrendingUp, count: null },
            { id: "homework", label: "الواجبات المدرسية", icon: FileCheck, count: homeworkList.length },
            { id: "points", label: "نقاطي والترتيب", icon: Award, count: null },
            { id: "qrcode", label: "بطاقة الحضور QR", icon: QrCode, count: null },
            { id: "leave", label: "طلبات الإجازة", icon: Clock, count: leaveRequests.length },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== null && item.count > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* أسفل القائمة الجانبية: تثبيت التطبيق وتسجيل الخروج */}
        <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50">
          <InstallPWA variant="badge" className="w-full" />
          <LogoutButton className="w-full" />
        </div>
      </aside>

      {/* 2. شريط علوي للهواتف المحمولة (Mobile Header) */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
            title="فتح القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-xs text-slate-900">بوابة الطالب</span>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-md font-bold bg-slate-100 text-slate-800 border border-slate-200 truncate max-w-[140px]">
          {studentData.name}
        </span>
      </div>

      {/* Drawer القائمة الجانبية للهواتف المحمولة */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-slate-900" />
                <span className="font-bold text-xs text-slate-900">قائمة الطالب</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {[
                { id: "today", label: "جدولي اليوم", icon: Calendar, count: todaySchedule.length },
                { id: "grades", label: "الدرجات والغياب", icon: TrendingUp, count: null },
                { id: "homework", label: "الواجبات المدرسية", icon: FileCheck, count: homeworkList.length },
                { id: "points", label: "نقاطي والترتيب", icon: Award, count: null },
                { id: "qrcode", label: "بطاقة الحضور QR", icon: QrCode, count: null },
                { id: "leave", label: "طلبات الإجازة", icon: Clock, count: leaveRequests.length },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as typeof activeTab);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== null && item.count > 0 && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50">
              <InstallPWA variant="badge" className="w-full" />
              <LogoutButton className="w-full" />
            </div>
          </div>
        </div>
      )}

      {/* 3. منطقة المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* رأس ديسكتوب علوي أنيق */}
        <div className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              {activeTab === "today" && "جدول حصص اليوم المقررة"}
              {activeTab === "grades" && "الدرجات ونسبة الحضور والغياب"}
              {activeTab === "homework" && "الواجبات المدرسية المطلوب تسليمها"}
              {activeTab === "points" && "لوحة الشرف والنقاط والسلوك"}
              {activeTab === "qrcode" && "بطاقة الدوام الرقمية (QR)"}
              {activeTab === "leave" && "تقديم ومتابعة طلبات الإجازة"}
            </h2>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">أهلاً بك،</span>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {studentData.name} ({studentData.className})
            </span>
          </div>
        </div>

        {/* المحتوى */}
        <main className="p-4 md:p-6 max-w-7xl w-full mx-auto space-y-5 flex-1">
        {/* اليوم */}
        {activeTab === "today" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-sm">حصص اليوم المقررة</div>
                <div className="text-xs text-slate-500">{studentData.className}</div>
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-500">رصيد النقاط: </span>
                <span className="font-bold text-slate-900 text-sm">{studentData.points} نقطة</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs divide-y divide-slate-100">
              {todaySchedule.map((p, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
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
                    الحصة {p.period}
                  </span>
                </div>
              ))}
              {todaySchedule.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs">
                  لا توجد حصص مجدولة لهذا اليوم.
                </div>
              )}
            </div>
          </div>
        )}

        {/* الدرجات والرسم البياني */}
        {activeTab === "grades" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-bold text-slate-800 mb-3">رسم بياني لمستوى الدرجات الأكاديمية</h3>
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

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3">المادة</th>
                    <th className="p-3">الدرجة المسجلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectsGrades.map((g, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold text-slate-900">{g.subject}</td>
                      <td className="p-3 font-bold text-slate-900">{g.score}</td>
                    </tr>
                  ))}
                  {subjectsGrades.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-6 text-center text-slate-400">
                        لم يتم رصد درجات حتى الآن.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
            {homeworkList.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs">
                لا توجد واجبات مطلوبة حالياً.
              </div>
            )}
          </div>
        )}

        {/* النقاط والترتيب */}
        {activeTab === "points" && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 max-w-md">
            <div className="text-xs text-slate-500 mb-1">رصيدك الفعلي من نقاط التميز في سوبابيس</div>
            <div className="text-3xl font-bold text-slate-900 mb-2">{studentData.points} نقطة</div>
            <p className="text-xs text-slate-600">
              تُمنح النقاط تلقائياً بناءً على تقييمات المعلم السلوكية وحل الواجبات.
            </p>
          </div>
        )}

        {/* كود QR */}
        {activeTab === "qrcode" && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-sm mx-auto text-center">
            <h3 className="font-bold text-slate-900 text-sm mb-1">رمز الحضور المدرسي (QR)</h3>
            <p className="text-xs text-slate-500 mb-4">أظهر هذا الرمز للمعلم في بداية الحصة لتسجيل الحضور</p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg inline-block mb-3">
              <QrCode className="w-36 h-36 mx-auto text-slate-900" />
            </div>
            <div className="font-mono text-xs text-slate-700 font-semibold">{studentData.qrCode}</div>
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
            {leaveRequests.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs">
                لا توجد طلبات إجازة مسجلة.
              </div>
            )}
          </div>
        )}
      </main>
      </div>

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
