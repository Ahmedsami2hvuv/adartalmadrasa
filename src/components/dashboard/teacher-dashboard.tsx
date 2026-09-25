"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  CheckSquare,
  Award,
  BookOpen,
  FileCheck,
  QrCode,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  ClipboardList,
  Loader2,
  Menu,
  X,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";
import { QRScannerModal } from "@/components/qr-scanner";
import { createClient } from "@/lib/supabase/client";

interface StudentAttendance {
  studentId: string;
  studentName: string;
  qrCode: string;
  status: "present" | "absent" | "late";
}

interface GradeEntry {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  score: number;
}

interface Homework {
  id: string;
  title: string;
  className: string;
  subject: string;
  description: string;
  dueDate: string;
}

interface Submission {
  id: string;
  homeworkId: string;
  studentName: string;
  solutionText: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
}

export function TeacherDashboard({ currentUserName }: { currentUserName?: string }) {
  const [activeTab, setActiveTab] = useState<
    "schedule" | "attendance" | "grades" | "homeworks" | "behavior" | "lesson_plan"
  >("schedule");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [selectedClass, setSelectedClass] = useState("");
  const [classesList, setClassesList] = useState<{ id: string; name: string }[]>([]);

  const [scheduleList, setScheduleList] = useState<{ day: number; period: number; className: string; subject: string }[]>([]);
  const [attendanceList, setAttendanceList] = useState<StudentAttendance[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [lessonPlans, setLessonPlans] = useState<{ id: string; date: string; period: number; className: string; title: string; objectives: string }[]>([]);
  const [behaviorNotes, setBehaviorNotes] = useState<{ id: string; studentName: string; type: string; note: string; points: number }[]>([]);
  const [botUsername, setBotUsername] = useState<string>("");

  // النوافذ
  const [newHwModal, setNewHwModal] = useState(false);
  const [newHwData, setNewHwData] = useState({ title: "", description: "", dueDate: "" });
  const [newPlanModal, setNewPlanModal] = useState(false);
  const [newPlanData, setNewPlanData] = useState({ title: "", objectives: "", period: 1 });
  const [newBehaviorModal, setNewBehaviorModal] = useState(false);
  const [newBehaviorData, setNewBehaviorData] = useState({ studentId: "", note: "", type: "positive" });

  // جلب بيانات المعلم والصفوف من سوبابيس
  const loadTeacherData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // 0. جلب معرّف بوت التيليجرام من إعدادات المدرسة
      try {
        const { data: dbSettings } = await supabase.from("school_settings").select("telegram_bot_username").limit(1).single();
        if (dbSettings?.telegram_bot_username) {
          setBotUsername(dbSettings.telegram_bot_username);
        }
      } catch (err) {
        console.warn("Could not fetch school settings:", err);
      }

      // 1. جلب الصفوف
      const { data: dbClasses } = await supabase.from("classes").select("id, name, section");
      if (dbClasses && dbClasses.length > 0) {
        const formatted = dbClasses.map((c) => ({ id: c.id, name: `${c.name} (${c.section})` }));
        setClassesList(formatted);
        if (!selectedClass && formatted[0]) {
          setSelectedClass(formatted[0].id);
        }
      }

      // 2. جلب جدول المعلم
      if (userId) {
        const { data: teacherRec } = await supabase.from("teachers").select("id").eq("profile_id", userId).single();
        const teacherId = teacherRec?.id;

        if (teacherId) {
          const { data: dbSchedules } = await supabase
            .from("weekly_schedules")
            .select("day_of_week, period, classes(name, section), subjects(name)")
            .eq("teacher_id", teacherId);

          if (dbSchedules) {
            setScheduleList(
              dbSchedules.map((sc: unknown) => {
                const s = sc as {
                  day_of_week: number;
                  period: number;
                  classes?: { name: string; section: string };
                  subjects?: { name: string };
                };
                return {
                  day: s.day_of_week,
                  period: s.period,
                  className: s.classes ? `${s.classes.name} (${s.classes.section})` : "صف",
                  subject: s.subjects?.name || "مادة",
                };
              })
            );
          }
        }
      }

      // 3. جلب الواجبات والخطط والملاحظات
      const { data: dbHw } = await supabase.from("homeworks").select("id, title, description, due_date, classes(name, section), subjects(name)");
      if (dbHw) {
        setHomeworks(
          dbHw.map((h: unknown) => {
            const hw = h as { id: string; title: string; description: string; due_date: string; classes?: { name: string; section: string }; subjects?: { name: string } };
            return {
              id: hw.id,
              title: hw.title,
              description: hw.description,
              dueDate: hw.due_date,
              className: hw.classes ? `${hw.classes.name} (${hw.classes.section})` : "الصف",
              subject: hw.subjects?.name || "المادة",
            };
          })
        );
      }

      const { data: dbPlans } = await supabase.from("daily_lesson_plans").select("id, date, period, lesson_title, objectives, classes(name, section)");
      if (dbPlans) {
        setLessonPlans(
          dbPlans.map((p: unknown) => {
            const pl = p as { id: string; date: string; period: number; lesson_title: string; objectives: string; classes?: { name: string; section: string } };
            return {
              id: pl.id,
              date: pl.date,
              period: pl.period,
              title: pl.lesson_title,
              objectives: pl.objectives,
              className: pl.classes ? `${pl.classes.name} (${pl.classes.section})` : "الصف",
            };
          })
        );
      }

      const { data: dbBehavior } = await supabase.from("behavior_notes").select("id, note_type, note, points_impact, students(profiles(full_name))");
      if (dbBehavior) {
        setBehaviorNotes(
          dbBehavior.map((b: unknown) => {
            const row = b as { id: string; note_type: string; note: string; points_impact: number; students?: { profiles?: { full_name: string } } };
            return {
              id: row.id,
              studentName: row.students?.profiles?.full_name || "طالب",
              type: row.note_type,
              note: row.note,
              points: row.points_impact,
            };
          })
        );
      }
    } catch (err) {
      console.warn("Load teacher data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    loadTeacherData();
  }, [loadTeacherData]);

  // جلب طلاب الصف المختار لتسجيل الحضور
  useEffect(() => {
    async function loadClassStudents() {
      if (!selectedClass) return;
      try {
        const supabase = createClient();
        const today = new Date().toISOString().split("T")[0];

        const { data: studentsData } = await supabase
          .from("students")
          .select("id, qr_code, profiles(full_name)")
          .eq("class_id", selectedClass);

        const { data: attendancesToday } = await supabase
          .from("attendances")
          .select("student_id, status")
          .eq("date", today)
          .eq("period", currentPeriod);

        if (studentsData) {
          setAttendanceList(
            studentsData.map((s: unknown) => {
              const row = s as { id: string; qr_code: string; profiles?: { full_name: string } };
              const att = attendancesToday?.find((a) => a.student_id === row.id);
              return {
                studentId: row.id,
                studentName: row.profiles?.full_name || "طالب",
                qrCode: row.qr_code,
                status: (att?.status as "present" | "absent" | "late") || "present",
              };
            })
          );
        }
      } catch (e) {
        console.warn(e);
      }
    }
    loadClassStudents();
  }, [selectedClass, currentPeriod]);

  // مسح QR وتحديث سوبابيس
  const handleQRScanned = async (code: string) => {
    const student = attendanceList.find((s) => s.qrCode === code);
    if (student) {
      await updateAttendanceInDB(student.studentId, "present");
      setAttendanceList((prev) =>
        prev.map((s) => (s.qrCode === code ? { ...s, status: "present" } : s))
      );
      alert(`تم تسجيل حضور: ${student.studentName}`);
    } else {
      alert(`الرمز غير موجود في هذا الصف: ${code}`);
    }
  };

  const updateAttendanceInDB = async (studentId: string, status: "present" | "absent" | "late") => {
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("attendances").upsert({
        student_id: studentId,
        class_id: selectedClass,
        date: today,
        period: currentPeriod,
        status: status,
      }, { onConflict: "student_id,date,period" });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAttendanceStatus = async (studentId: string, status: "present" | "absent" | "late") => {
    setAttendanceList((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
    await updateAttendanceInDB(studentId, status);
  };

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHwData.title) return;
    try {
      const supabase = createClient();
      await supabase.from("homeworks").insert({
        title: newHwData.title,
        class_id: selectedClass || classesList[0]?.id,
        description: newHwData.description,
        due_date: newHwData.dueDate || new Date().toISOString().split("T")[0],
      });
      loadTeacherData();
    } catch (e) {
      console.error(e);
    }
    setNewHwData({ title: "", description: "", dueDate: "" });
    setNewHwModal(false);
  };

  const handleAddLessonPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanData.title) return;
    try {
      const supabase = createClient();
      await supabase.from("daily_lesson_plans").insert({
        class_id: selectedClass || classesList[0]?.id,
        period: newPlanData.period,
        lesson_title: newPlanData.title,
        objectives: newPlanData.objectives,
        date: new Date().toISOString().split("T")[0],
      });
      loadTeacherData();
    } catch (e) {
      console.error(e);
    }
    setNewPlanData({ title: "", objectives: "", period: 1 });
    setNewPlanModal(false);
  };

  const handleAddBehavior = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBehaviorData.note) return;
    try {
      const supabase = createClient();
      const targetStudent = attendanceList[0]?.studentId;
      if (targetStudent) {
        await supabase.from("behavior_notes").insert({
          student_id: targetStudent,
          note_type: newBehaviorData.type,
          note: newBehaviorData.note,
          points_impact: newBehaviorData.type === "positive" ? 5 : -3,
        });
        loadTeacherData();
      }
    } catch (e) {
      console.error(e);
    }
    setNewBehaviorData({ studentId: "", note: "", type: "positive" });
    setNewBehaviorModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row selection:bg-slate-800 selection:text-white" dir="rtl">
      {/* 1. القائمة الجانبية للشاشات المتوسطة والكبيرة (Sidebar Desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-l border-slate-200 sticky top-0 h-screen shrink-0 shadow-2xs z-30">
        {/* رأس القائمة الجانبية */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-sm text-slate-900 truncate">لوحة المعلم</h1>
              <p className="text-[11px] text-slate-500">نظام إدارة التدريس</p>
            </div>
          </div>

          <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
            <div className="min-w-0 pr-1">
              <span className="text-[10px] text-slate-500 block">المعلم المسجل:</span>
              <span className="text-xs font-bold text-slate-900 truncate block">
                {currentUserName || "معلم المادة"}
              </span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shrink-0">
              نشط ومصرح
            </span>
          </div>
        </div>

        {/* روابط التنقل الرئيسية في القائمة الجانبية */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: "schedule", label: "جدولي الأسبوعي", icon: Calendar, count: scheduleList.length },
            { id: "attendance", label: "تسجيل الحضور (QR)", icon: CheckSquare, count: null },
            { id: "grades", label: "رصد الدرجات", icon: Award, count: null },
            { id: "homeworks", label: "الواجبات المدرسية", icon: FileCheck, count: homeworks.length },
            { id: "behavior", label: "الملاحظات السلوكية", icon: BookOpen, count: null },
            { id: "lesson_plan", label: "الخطة اليومية", icon: ClipboardList, count: lessonPlans.length },
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
                {item.count !== null && (
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

        {/* قسم بوت التيليجرام داخل القائمة الجانبية */}
        {botUsername && (
          <div className="p-3 mx-3 mb-2 rounded-xl bg-sky-50 border border-sky-200">
            <div className="flex items-center gap-2 mb-1.5">
              <MessageCircle className="w-4 h-4 text-sky-600" />
              <span className="text-[11px] font-bold text-sky-900">بوت التيليجرام المدرسي</span>
            </div>
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 w-full py-1.5 bg-[#229ED9] hover:bg-[#1e8ec3] text-white rounded-lg text-[11px] font-bold shadow-2xs transition"
            >
              <span>فتح البوت @{botUsername} ↗</span>
            </a>
          </div>
        )}

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
          <span className="font-bold text-xs text-slate-900">لوحة المعلم</span>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-md font-bold bg-slate-100 text-slate-800 border border-slate-200 truncate max-w-[140px]">
          {currentUserName || "معلم المادة"}
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
                <BookOpen className="w-5 h-5 text-slate-900" />
                <span className="font-bold text-xs text-slate-900">قائمة المعلم</span>
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
                { id: "schedule", label: "جدولي الأسبوعي", icon: Calendar, count: scheduleList.length },
                { id: "attendance", label: "تسجيل الحضور (QR)", icon: CheckSquare, count: null },
                { id: "grades", label: "رصد الدرجات", icon: Award, count: null },
                { id: "homeworks", label: "الواجبات المدرسية", icon: FileCheck, count: homeworks.length },
                { id: "behavior", label: "الملاحظات السلوكية", icon: BookOpen, count: null },
                { id: "lesson_plan", label: "الخطة اليومية", icon: ClipboardList, count: lessonPlans.length },
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
                    {item.count !== null && (
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
              {activeTab === "schedule" && "جدول الحصص الأسبوعي للمعلم"}
              {activeTab === "attendance" && "تسجيل الحضور السريع عبر QR"}
              {activeTab === "grades" && "رصد درجات الطلاب والتقييمات"}
              {activeTab === "homeworks" && "إدارة الواجبات والأنشطة البيتية"}
              {activeTab === "behavior" && "سجل الملاحظات السلوكية والتربوية"}
              {activeTab === "lesson_plan" && "دفتر التحضير والخطة اليومية"}
            </h2>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">مرحباً بك،</span>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {currentUserName || "معلم المادة"}
            </span>
          </div>
        </div>

        {/* المحتوى */}
        <main className="p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
        {/* بطاقة بوت التيليجرام للمعلم */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-sm">بوت التيليجرام لمتابعة الحصص والإشعارات</h2>
              <p className="text-xs text-sky-100">
                {botUsername ? (
                  <>
                    يمكنك الدخول للبوت المدرسي <span className="font-mono underline font-bold">@{botUsername}</span> وإرسال أمر <span className="font-mono bg-white/20 px-1 py-0.5 rounded font-bold">/دروسي_اليوم</span> لمشاهدة حصصك مباشرة في هاتفك.
                  </>
                ) : (
                  "بإمكان إدارة المدرسة تحديد اسم مستخدم البوت (Bot Username) في تبويب الإعدادات لتمكين المعلمين والطلاب من الدخول إليه مباشرة."
                )}
              </p>
            </div>
          </div>
          {botUsername && (
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-blue-700 hover:bg-sky-50 rounded-lg text-xs font-bold shadow-xs transition self-start sm:self-auto shrink-0"
            >
              <span>فتح البوت الآن ↗</span>
            </a>
          )}
        </div>
        {/* الجدول الأسبوعي */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900">جدول الحصص المخصص لك في المدرسة</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { id: 1, name: "الأحد" },
                { id: 2, name: "الإثنين" },
                { id: 3, name: "الثلاثاء" },
                { id: 4, name: "الأربعاء" },
                { id: 5, name: "الخميس" },
              ].map((dayObj) => {
                const daySchedules = scheduleList.filter((s) => s.day === dayObj.id);
                return (
                  <div key={dayObj.id} className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="font-bold text-slate-900 text-xs mb-2 pb-1.5 border-b border-slate-100">
                      {dayObj.name}
                    </div>
                    <div className="space-y-1.5">
                      {daySchedules.map((sc, i) => (
                        <div key={i} className="p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                          <div className="font-semibold text-slate-900">الحصة {sc.period}</div>
                          <div className="text-slate-600">{sc.className} - {sc.subject}</div>
                        </div>
                      ))}
                      {daySchedules.length === 0 && (
                        <div className="text-[11px] text-slate-400 p-2 text-center">لا توجد حصص</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* الحضور والغياب مع QR */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">الصف:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                >
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <span className="font-semibold text-slate-700 mr-2">الحصة:</span>
                <select
                  value={currentPeriod}
                  onChange={(e) => setCurrentPeriod(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                >
                  {[1, 2, 3, 4, 5].map((p) => (
                    <option key={p} value={p}>الحصة {p}</option>
                  ))}
                </select>
              </div>

              <Button
                onClick={() => setScannerOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
              >
                <QrCode className="w-3.5 h-3.5 ml-1.5" />
                مسح باركود الطالب (الكاميرا)
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">رمز الحضور (QR)</th>
                    <th className="p-3">الحالة الحالية</th>
                    <th className="p-3 text-center">تحديث فوري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceList.map((stu) => (
                    <tr key={stu.studentId} className="hover:bg-slate-50/60">
                      <td className="p-3 font-semibold text-slate-900">{stu.studentName}</td>
                      <td className="p-3 font-mono text-slate-600">{stu.qrCode}</td>
                      <td className="p-3">
                        {stu.status === "present" && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                            <CheckCircle className="w-3.5 h-3.5" /> حاضر
                          </span>
                        )}
                        {stu.status === "absent" && (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-xs">
                            <XCircle className="w-3.5 h-3.5" /> غائب
                          </span>
                        )}
                        {stu.status === "late" && (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                            <Clock className="w-3.5 h-3.5" /> متأخر
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => toggleAttendanceStatus(stu.studentId, "present")}
                            className="px-2 py-0.5 rounded text-xs border border-slate-300 hover:bg-slate-100"
                          >
                            حاضر
                          </button>
                          <button
                            onClick={() => toggleAttendanceStatus(stu.studentId, "absent")}
                            className="px-2 py-0.5 rounded text-xs border border-slate-300 hover:bg-slate-100 text-rose-600"
                          >
                            غائب
                          </button>
                          <button
                            onClick={() => toggleAttendanceStatus(stu.studentId, "late")}
                            className="px-2 py-0.5 rounded text-xs border border-slate-300 hover:bg-slate-100 text-amber-600"
                          >
                            متأخر
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {attendanceList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        لا يوجد طلاب في هذا الصف بعد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* الدرجات */}
        {activeTab === "grades" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900">سجل التقييمات والدرجات</h2>
            <div className="bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">المادة</th>
                    <th className="p-3">الدرجة</th>
                    <th className="p-3">تعديل وحفظ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceList.map((stu) => (
                    <tr key={stu.studentId}>
                      <td className="p-3 font-semibold text-slate-900">{stu.studentName}</td>
                      <td className="p-3 text-slate-600">المادة المقررة</td>
                      <td className="p-3 font-bold text-slate-900">18 / 20</td>
                      <td className="p-3">
                        <input
                          type="number"
                          defaultValue={18}
                          className="w-16 px-2 py-0.5 border rounded border-slate-300 text-center"
                          onChange={async (e) => {
                            const val = Number(e.target.value);
                            const supabase = createClient();
                            await supabase.from("grades").upsert({
                              student_id: stu.studentId,
                              type: "daily",
                              score: val,
                            });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {attendanceList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        اختر صفاً لتسجيل ورصد الدرجات.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* الواجبات */}
        {activeTab === "homeworks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">الواجبات المدرسية المضافة</h2>
                <p className="text-xs text-slate-500">حفظ ونشر الواجبات في قاعدة البيانات</p>
              </div>
              <Button
                onClick={() => setNewHwModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
              >
                <Plus className="w-3.5 h-3.5 ml-1.5" />
                إضافة واجب
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {homeworks.map((hw) => (
                <div key={hw.id} className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span className="font-semibold text-slate-800">{hw.subject} • {hw.className}</span>
                    <span>تسليم حتى: {hw.dueDate}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mb-1">{hw.title}</div>
                  <p className="text-xs text-slate-600 mb-3">{hw.description}</p>
                </div>
              ))}
              {homeworks.length === 0 && (
                <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs">
                  لا توجد واجبات منشورة بعد. اضغط على زر &quot;إضافة واجب&quot; لنشر واجب لطلابك.
                </div>
              )}
            </div>
          </div>
        )}

        {/* الملاحظات السلوكية */}
        {activeTab === "behavior" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">الملاحظات السلوكية للطلاب</h2>
                <p className="text-xs text-slate-500">توثيق السلوك في قاعدة البيانات</p>
              </div>
              <Button
                onClick={() => setNewBehaviorModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
              >
                <Plus className="w-3.5 h-3.5 ml-1.5" />
                تسجيل ملاحظة
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {behaviorNotes.map((b) => (
                <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
                  <div className="flex justify-between font-semibold text-slate-900 mb-1">
                    <span>{b.studentName}</span>
                    <span className={b.type === "positive" ? "text-emerald-700" : "text-rose-700"}>
                      {b.points > 0 ? `+${b.points} نقاط` : `${b.points} نقاط`}
                    </span>
                  </div>
                  <p className="text-slate-600">{b.note}</p>
                </div>
              ))}
              {behaviorNotes.length === 0 && (
                <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs">
                  لا توجد ملاحظات سلوكية مسجلة حالياً.
                </div>
              )}
            </div>
          </div>
        )}

        {/* الخطة اليومية */}
        {activeTab === "lesson_plan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">الخطة اليومية للدروس</h2>
                <p className="text-xs text-slate-500">تحضير أهداف الدرس وتوثيقها</p>
              </div>
              <Button
                onClick={() => setNewPlanModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
              >
                <Plus className="w-3.5 h-3.5 ml-1.5" />
                خطة درس جديدة
              </Button>
            </div>

            <div className="space-y-3">
              {lessonPlans.map((lp) => (
                <div key={lp.id} className="bg-white border border-slate-200 rounded-lg p-4 text-xs">
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span className="font-semibold text-slate-800">{lp.className} • الحصة {lp.period}</span>
                    <span>{lp.date}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mb-1">{lp.title}</div>
                  <p className="text-slate-600"><span className="font-semibold text-slate-700">الأهداف:</span> {lp.objectives}</p>
                </div>
              ))}
              {lessonPlans.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs">
                  لا توجد خطط دروس مضافة بعد.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      </div>

      {/* ماسح QR */}
      {scannerOpen && (
        <QRScannerModal
          onScan={handleQRScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* نافذة إضافة واجب */}
      {newHwModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-900 mb-3">إضافة واجب منزلي</h3>
            <form onSubmit={handleAddHomework} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1">عنوان الواجب:</label>
                <input
                  type="text"
                  required
                  value={newHwData.title}
                  onChange={(e) => setNewHwData({ ...newHwData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">نص الواجب والتعليمات:</label>
                <textarea
                  required
                  rows={3}
                  value={newHwData.description}
                  onChange={(e) => setNewHwData({ ...newHwData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">موعد التسليم:</label>
                <input
                  type="date"
                  required
                  value={newHwData.dueDate}
                  onChange={(e) => setNewHwData({ ...newHwData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="ghost" onClick={() => setNewHwModal(false)} className="text-xs h-8">إلغاء</Button>
                <Button type="submit" className="bg-slate-900 text-white text-xs h-8">نشر الواجب</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة خطة الدرس */}
      {newPlanModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-900 mb-3">إعداد خطة درس يومي</h3>
            <form onSubmit={handleAddLessonPlan} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1">موضوع الدرس:</label>
                <input
                  type="text"
                  required
                  value={newPlanData.title}
                  onChange={(e) => setNewPlanData({ ...newPlanData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">الأهداف التعليمية:</label>
                <textarea
                  required
                  rows={3}
                  value={newPlanData.objectives}
                  onChange={(e) => setNewPlanData({ ...newPlanData, objectives: e.target.value })}
                  className="w-full px-3 py-2 border rounded border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="ghost" onClick={() => setNewPlanModal(false)} className="text-xs h-8">إلغاء</Button>
                <Button type="submit" className="bg-slate-900 text-white text-xs h-8">حفظ الخطة</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة ملاحظة سلوكية */}
      {newBehaviorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-900 mb-3">تسجيل ملاحظة سلوكية</h3>
            <form onSubmit={handleAddBehavior} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1">التقييم:</label>
                <select
                  value={newBehaviorData.type}
                  onChange={(e) => setNewBehaviorData({ ...newBehaviorData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded border-slate-300"
                >
                  <option value="positive">إيجابي (+5 نقاط)</option>
                  <option value="negative">سلبي (-3 نقاط)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 mb-1">الملاحظة:</label>
                <textarea
                  required
                  rows={3}
                  value={newBehaviorData.note}
                  onChange={(e) => setNewBehaviorData({ ...newBehaviorData, note: e.target.value })}
                  className="w-full px-3 py-2 border rounded border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="ghost" onClick={() => setNewBehaviorModal(false)} className="text-xs h-8">إلغاء</Button>
                <Button type="submit" className="bg-slate-900 text-white text-xs h-8">تسجيل</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
