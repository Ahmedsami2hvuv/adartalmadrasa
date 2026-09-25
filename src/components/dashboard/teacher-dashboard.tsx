"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  CheckSquare,
  Award,
  BookOpen,
  FileCheck,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  ClipboardList,
  Loader2,
  Menu,
  X,
  MessageCircle,
  Search,
  ThumbsUp,
  ThumbsDown,
  GraduationCap,
  Users,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/client";

interface StudentAttendance {
  studentId: string;
  studentName: string;
  qrCode: string;
  status: "present" | "absent" | "late";
}

interface TeacherScheduleClass {
  id: string;
  day: number;
  period: number;
  classId: string;
  gradeName: string;
  section: string;
  className: string;
  subject: string;
}

interface TeacherStudentInfo {
  id: string;
  name: string;
  classId: string;
  className: string;
  section: string;
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

  // جدول الحصص وتفاصيل الحضور
  const getInitialDay = () => {
    const day = new Date().getDay(); // 0 = Sunday
    if (day >= 0 && day <= 4) return day + 1; // 1 = الأحد .. 5 = الخميس
    return 1;
  };
  const [attendanceDay, setAttendanceDay] = useState<number>(getInitialDay());
  const [selectedGradeName, setSelectedGradeName] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedAttendanceClassId, setSelectedAttendanceClassId] = useState<string>("");
  const [teacherDetailedSchedules, setTeacherDetailedSchedules] = useState<TeacherScheduleClass[]>([]);

  // طلاب المعلم لهذا العام والملاحظات السلوكية
  const [teacherAllStudents, setTeacherAllStudents] = useState<TeacherStudentInfo[]>([]);
  const [behaviorSearch, setBehaviorSearch] = useState<string>("");
  const [targetStudentForBehavior, setTargetStudentForBehavior] = useState<TeacherStudentInfo | null>(null);
  const [behaviorNoteText, setBehaviorNoteText] = useState<string>("");
  const [behaviorType, setBehaviorType] = useState<"positive" | "negative">("positive");
  const [behaviorSaving, setBehaviorSaving] = useState(false);
  const [behaviorSuccessAlert, setBehaviorSuccessAlert] = useState("");

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
            .select("id, day_of_week, period, class_id, classes(id, name, section), subjects(name)")
            .eq("teacher_id", teacherId);

          if (dbSchedules) {
            const detailed: TeacherScheduleClass[] = dbSchedules.map((sc: unknown) => {
              const s = sc as {
                id: string;
                day_of_week: number;
                period: number;
                class_id: string;
                classes?: { id: string; name: string; section: string };
                subjects?: { name: string };
              };
              return {
                id: s.id,
                day: s.day_of_week,
                period: s.period,
                classId: s.class_id,
                gradeName: s.classes?.name || "صف",
                section: s.classes?.section || "أ",
                className: s.classes ? `${s.classes.name} (${s.classes.section})` : "صف",
                subject: s.subjects?.name || "مادة",
              };
            });

            setTeacherDetailedSchedules(detailed);
            setScheduleList(
              detailed.map((s) => ({
                day: s.day,
                period: s.period,
                className: s.className,
                subject: s.subject,
              }))
            );

            // جلب طلاب جميع الصفوف الموكلة للمعلم هذا العام
            const classIds = Array.from(new Set(detailed.map((s) => s.classId).filter(Boolean)));
            let stuQuery = supabase
              .from("students")
              .select("id, class_id, classes(name, section), profiles(full_name)");

            if (classIds.length > 0) {
              stuQuery = stuQuery.in("class_id", classIds);
            }

            const { data: stData } = await stuQuery;
            if (stData) {
              setTeacherAllStudents(
                stData.map((s: unknown) => {
                  const row = s as {
                    id: string;
                    class_id: string;
                    classes?: { name: string; section: string };
                    profiles?: { full_name: string };
                  };
                  return {
                    id: row.id,
                    name: row.profiles?.full_name || "طالب",
                    classId: row.class_id,
                    className: row.classes?.name || "الصف",
                    section: row.classes?.section || "أ",
                  };
                })
              );
            }
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

      const { data: dbBehavior } = await supabase.from("behavior_notes").select("id, note_type, note, points_impact, students(profiles(full_name))").order("id", { ascending: false });
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

  // جلب طلاب الشعبة المختارة لتسجيل الحضور
  useEffect(() => {
    async function loadClassStudents() {
      if (!selectedAttendanceClassId) {
        setAttendanceList([]);
        return;
      }
      try {
        const supabase = createClient();
        const today = new Date().toISOString().split("T")[0];

        const { data: studentsData } = await supabase
          .from("students")
          .select("id, profiles(full_name)")
          .eq("class_id", selectedAttendanceClassId);

        const { data: attendancesToday } = await supabase
          .from("attendances")
          .select("student_id, status")
          .eq("date", today)
          .eq("period", currentPeriod);

        if (studentsData) {
          setAttendanceList(
            studentsData.map((s: unknown) => {
              const row = s as { id: string; profiles?: { full_name: string } };
              const att = attendancesToday?.find((a) => a.student_id === row.id);
              return {
                studentId: row.id,
                studentName: row.profiles?.full_name || "طالب",
                qrCode: "",
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
  }, [selectedAttendanceClassId, currentPeriod]);

  const updateAttendanceInDB = async (studentId: string, status: "present" | "absent" | "late") => {
    if (!selectedAttendanceClassId) return;
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("attendances").upsert({
        student_id: studentId,
        class_id: selectedAttendanceClassId,
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

  const markAllPresent = async () => {
    if (!selectedAttendanceClassId || attendanceList.length === 0) return;
    setAttendanceList((prev) => prev.map((s) => ({ ...s, status: "present" })));
    for (const stu of attendanceList) {
      await updateAttendanceInDB(stu.studentId, "present");
    }
  };

  // تسجيل الملاحظة السلوكية وحفظها (إجباري الملاحظة)
  const handleSaveBehaviorNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!behaviorNoteText.trim()) {
      alert("يرجى كتابة نص الملاحظة السلوكية، هذا الحقل إجباري!");
      return;
    }
    if (!targetStudentForBehavior) return;

    setBehaviorSaving(true);
    try {
      const supabase = createClient();
      const points = behaviorType === "positive" ? 5 : -3;
      const { error } = await supabase.from("behavior_notes").insert({
        student_id: targetStudentForBehavior.id,
        note_type: behaviorType,
        note: behaviorNoteText.trim(),
        points_impact: points,
      });

      if (error) throw error;

      // تحديث نقاط الطالب في جدول students
      try {
        const { data: currentStu } = await supabase
          .from("students")
          .select("points")
          .eq("id", targetStudentForBehavior.id)
          .single();
        const newPoints = (currentStu?.points || 0) + points;
        await supabase.from("students").update({ points: newPoints }).eq("id", targetStudentForBehavior.id);
      } catch (e) {
        console.warn("Could not update student points:", e);
      }

      setBehaviorSuccessAlert(`تم تسجيل الملاحظة السلوكية للطالب ${targetStudentForBehavior.name} بنجاح`);
      setBehaviorNoteText("");
      loadTeacherData();
      setTimeout(() => {
        setTargetStudentForBehavior(null);
        setBehaviorSuccessAlert("");
      }, 1500);
    } catch (err) {
      console.error("Error saving behavior note:", err);
      alert("حدث خطأ أثناء حفظ الملاحظة السلوكية، يرجى المحاولة مرة أخرى.");
    } finally {
      setBehaviorSaving(false);
    }
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
            { id: "attendance", label: "تسجيل الحضور والغياب", icon: CheckSquare, count: null },
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
                { id: "attendance", label: "تسجيل الحضور والغياب", icon: CheckSquare, count: null },
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

            {/* قسم بوت التيليجرام داخل قائمة الموبايل */}
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
              {activeTab === "attendance" && "تسجيل ومتابعة حضور وغياب الطلاب"}
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

        {/* الحضور والغياب المباشر */}
        {activeTab === "attendance" && (() => {
          const weekDays = [
            { id: 1, name: "الأحد" },
            { id: 2, name: "الإثنين" },
            { id: 3, name: "الثلاثاء" },
            { id: 4, name: "الأربعاء" },
            { id: 5, name: "الخميس" },
          ];

          // حصص المعلم في اليوم المحدد
          const todaySchedules = teacherDetailedSchedules.filter((s) => s.day === attendanceDay);
          const todayGrades = Array.from(new Set(todaySchedules.map((s) => s.gradeName)));
          const currentGradeSections = todaySchedules.filter((s) => s.gradeName === selectedGradeName);

          const presentCount = attendanceList.filter((s) => s.status === "present").length;
          const absentCount = attendanceList.filter((s) => s.status === "absent").length;
          const lateCount = attendanceList.filter((s) => s.status === "late").length;

          return (
            <div className="space-y-4">
              {/* شريط اختيار اليوم والحصة */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">اختر يوم تسجيل الحضور:</h3>
                    <p className="text-[11px] text-slate-500">يظهر لك فقط الصفوف والشعب التي لديك درس معهم في هذا اليوم</p>
                  </div>
                  {/* أزرار الأيام */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {weekDays.map((d) => {
                      const isSelected = attendanceDay === d.id;
                      const hasLessons = teacherDetailedSchedules.some((s) => s.day === d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setAttendanceDay(d.id);
                            setSelectedGradeName("");
                            setSelectedSection("");
                            setSelectedAttendanceClassId("");
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-slate-900 text-white shadow-2xs"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          <span>{d.name}</span>
                          {hasLessons && (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-emerald-400" : "bg-emerald-500"}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* الحصة الدراسية */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="font-bold text-slate-700">رقم الحصة:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCurrentPeriod(p)}
                        className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center transition ${
                          currentPeriod === p
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* تنبيه إذا لم تكن هناك حصص للمعلم في هذا اليوم */}
              {todayGrades.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center text-xs text-amber-900">
                  <p className="font-bold mb-1">لا توجد حصص دراسية مجدولة لك في هذا اليوم حسب الجدول الأسبوعي.</p>
                  <p className="text-amber-700 text-[11px]">يمكنك النقر على أحد الأيام الأخرى بالأعلى للاطلاع على حصصك وتسجيل الحضور.</p>
                </div>
              )}

              {/* الخطوة 1: اختيار الصف الدراسي لليوم */}
              {todayGrades.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>انقر على الصف الدراسي المراد تسجيل حضوره لليوم:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {todayGrades.map((grade) => {
                      const isSelected = selectedGradeName === grade;
                      const lessonsCount = todaySchedules.filter((s) => s.gradeName === grade).length;
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => {
                            setSelectedGradeName(grade);
                            setSelectedSection("");
                            setSelectedAttendanceClassId("");
                          }}
                          className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                              : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-900"
                          }`}
                        >
                          <span className="font-bold text-xs">{grade}</span>
                          <span className={`text-[10px] mt-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                            {lessonsCount} {lessonsCount > 1 ? "حصص اليوم" : "حصة اليوم"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* الخطوة 2: اختيار الشعبة التابعة للصف المختار */}
              {selectedGradeName && currentGradeSections.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>انقر على الشعبة لعرض كشف الطلاب فوراً:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {currentGradeSections.map((sec, idx) => {
                      const isSelected = selectedAttendanceClassId === sec.classId && selectedSection === sec.section;
                      return (
                        <button
                          key={`${sec.classId}-${sec.period}-${idx}`}
                          type="button"
                          onClick={() => {
                            setSelectedSection(sec.section);
                            setSelectedAttendanceClassId(sec.classId);
                            setCurrentPeriod(sec.period);
                          }}
                          className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                            isSelected
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                              : "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 text-emerald-950"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">شعبة ({sec.section})</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                              الحصة {sec.period}
                            </span>
                          </div>
                          <span className={`text-[10px] mt-1 truncate ${isSelected ? "text-emerald-100" : "text-slate-600"}`}>
                            مادة: {sec.subject}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* الخطوة 3: كشف حضور الطلاب بعد اختيار الصف والشعبة */}
              {!selectedAttendanceClassId ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-500">
                  <GraduationCap className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                  <p className="font-semibold text-slate-700">يرجى النقر على الصف ثم الشعبة لعرض كشف حضور الطلاب</p>
                  <p className="text-[11px] text-slate-400 mt-1">يظهر لك فقط الطلاب المقيدون في هذه الشعبة والمخصصون لدرس اليوم</p>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {/* شريط الإحصائية والإجراءات */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">
                        كشف حضور طلاب: {selectedGradeName} - شعبة ({selectedSection})
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        الحصة: {currentPeriod} • الإجمالي: {attendanceList.length} طالب • (حاضر: {presentCount} • غائب: {absentCount} • متأخر: {lateCount})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={markAllPresent}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        تسجيل الكل حاضر
                      </Button>
                    </div>
                  </div>

                  {/* جدول الطلاب والحضور */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                        <tr>
                          <th className="p-3">اسم الطالب</th>
                          <th className="p-3">الحالة الحالية</th>
                          <th className="p-3 text-center">تثبيت فوري للحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendanceList.map((stu) => (
                          <tr key={stu.studentId} className="hover:bg-slate-50/70 transition">
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                                {stu.studentName.charAt(0)}
                              </span>
                              <span>{stu.studentName}</span>
                            </td>
                            <td className="p-3">
                              {stu.status === "present" && (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200">
                                  <CheckCircle className="w-3 h-3" /> حاضر
                                </span>
                              )}
                              {stu.status === "absent" && (
                                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs font-bold border border-rose-200">
                                  <XCircle className="w-3 h-3" /> غائب
                                </span>
                              )}
                              {stu.status === "late" && (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold border border-amber-200">
                                  <Clock className="w-3 h-3" /> متأخر
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleAttendanceStatus(stu.studentId, "present")}
                                  className={`px-2.5 py-1 rounded text-xs font-bold transition border ${
                                    stu.status === "present"
                                      ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
                                  }`}
                                >
                                  حاضر
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleAttendanceStatus(stu.studentId, "absent")}
                                  className={`px-2.5 py-1 rounded text-xs font-bold transition border ${
                                    stu.status === "absent"
                                      ? "bg-rose-700 text-white border-rose-700 shadow-2xs"
                                      : "bg-white hover:bg-rose-50 text-rose-700 border-slate-300"
                                  }`}
                                >
                                  غائب
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleAttendanceStatus(stu.studentId, "late")}
                                  className={`px-2.5 py-1 rounded text-xs font-bold transition border ${
                                    stu.status === "late"
                                      ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                                      : "bg-white hover:bg-amber-50 text-amber-700 border-slate-300"
                                  }`}
                                >
                                  متأخر
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {attendanceList.length === 0 && (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-slate-400">
                              لا يوجد طلاب مسجلون في هذه الشعبة بعد.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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
        {activeTab === "behavior" && (() => {
          const filteredStudents = teacherAllStudents.filter((stu) => {
            const q = behaviorSearch.trim().toLowerCase();
            if (!q) return true;
            return (
              stu.name.toLowerCase().includes(q) ||
              stu.className.toLowerCase().includes(q) ||
              stu.section.toLowerCase().includes(q)
            );
          });

          return (
            <div className="space-y-6">
              {/* الرأس والإحصائية والبحث */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">الملاحظات السلوكية للطلاب</h2>
                    <p className="text-xs text-slate-500">
                      قائمة جميع الطلاب المخصصين لك في هذه السنة الدراسية • الإجمالي: {teacherAllStudents.length} طالب
                    </p>
                  </div>
                </div>

                {/* خانة البحث الذكي */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={behaviorSearch}
                    onChange={(e) => setBehaviorSearch(e.target.value)}
                    placeholder="ابحث عن أي طالب باسمه أو صفه أو شعبته..."
                    className="w-full pl-3 pr-9 py-2 border rounded-lg border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/60"
                  />
                </div>
              </div>

              {/* شبكة بطاقات طلاب المعلم لهذا العام */}
              <div>
                <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center justify-between">
                  <span>اختر الطالب لتسجيل ملاحظة سلوكية (إيجابية أو سلبية):</span>
                  <span className="text-slate-500 font-normal">المعروض: {filteredStudents.length} طالب</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredStudents.map((stu) => (
                    <div
                      key={stu.id}
                      onClick={() => {
                        setTargetStudentForBehavior(stu);
                        setBehaviorNoteText("");
                        setBehaviorType("positive");
                        setBehaviorSuccessAlert("");
                      }}
                      className="bg-white border border-slate-200 hover:border-slate-400 hover:shadow-xs rounded-xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-800 flex items-center justify-center font-bold text-xs shrink-0 transition">
                          {stu.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate group-hover:text-slate-950 transition">
                            {stu.name}
                          </h4>
                          <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                            {stu.className} • شعبة ({stu.section})
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        className="bg-slate-50 group-hover:bg-slate-900 text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-slate-900 text-[11px] h-7 px-2.5 transition shrink-0 pointer-events-none"
                      >
                        <Plus className="w-3 h-3 ml-1" />
                        تسجيل ملاحظة
                      </Button>
                    </div>
                  ))}

                  {filteredStudents.length === 0 && (
                    <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                      {behaviorSearch ? "لم يتم العثور على طالب يطابق بحثك." : "لا يوجد طلاب مسجلون في صفوفك حتى الآن."}
                    </div>
                  )}
                </div>
              </div>

              {/* سجل الملاحظات المسجلة سابقاً */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900">سجل الملاحظات السلوكية المسجلة مؤخراً:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {behaviorNotes.map((b) => (
                    <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-2xs">
                      <div className="flex justify-between items-center font-semibold text-slate-900 mb-1">
                        <span className="font-bold">{b.studentName}</span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                            b.type === "positive"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {b.type === "positive" ? "سلوك إيجابي (+5)" : "سلوك سلبي (-3)"}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{b.note}</p>
                    </div>
                  ))}
                  {behaviorNotes.length === 0 && (
                    <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-5 text-center text-slate-400 text-xs">
                      لا توجد ملاحظات سلوكية مسجلة مؤخراً.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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

      {/* نافذة تسجيل ملاحظة سلوكية للطالب المحدد */}
      {targetStudentForBehavior && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* ترويسة النافذة */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  {targetStudentForBehavior.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{targetStudentForBehavior.name}</h3>
                  <span className="text-[11px] text-slate-500">
                    {targetStudentForBehavior.className} • شعبة ({targetStudentForBehavior.section})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetStudentForBehavior(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* تنبيه النجاح */}
            {behaviorSuccessAlert && (
              <div className="p-3 mb-4 rounded-lg text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{behaviorSuccessAlert}</span>
              </div>
            )}

            <form onSubmit={handleSaveBehaviorNote} className="space-y-4 text-xs">
              {/* اختيار نوع التقييم: إيجابي / سلبي */}
              <div>
                <label className="block text-slate-700 font-bold mb-2">نوع السلوك والتقييم التربوي:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBehaviorType("positive")}
                    className={`p-3 rounded-xl border text-right transition flex items-center justify-between ${
                      behaviorType === "positive"
                        ? "bg-emerald-50 border-emerald-600 text-emerald-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ThumbsUp className={`w-4 h-4 ${behaviorType === "positive" ? "text-emerald-600" : "text-slate-400"}`} />
                      <span className="font-bold">سلوك إيجابي</span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      +5 نقاط
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBehaviorType("negative")}
                    className={`p-3 rounded-xl border text-right transition flex items-center justify-between ${
                      behaviorType === "negative"
                        ? "bg-rose-50 border-rose-600 text-rose-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ThumbsDown className={`w-4 h-4 ${behaviorType === "negative" ? "text-rose-600" : "text-slate-400"}`} />
                      <span className="font-bold">سلوك سلبي</span>
                    </div>
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                      -3 نقاط
                    </span>
                  </button>
                </div>
              </div>

              {/* نص الملاحظة السلوكية - إجباري */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">
                    نص الملاحظة السلوكية:
                  </label>
                  <span className="text-[10px] font-semibold text-rose-600">* إجباري</span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={behaviorNoteText}
                  onChange={(e) => setBehaviorNoteText(e.target.value)}
                  placeholder="اكتب تفاصيل الملاحظة السلوكية للطالب هنا بدقة (هذا الحقل إجباري)..."
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={behaviorSaving}
                  onClick={() => setTargetStudentForBehavior(null)}
                  className="text-xs h-9 px-4"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={behaviorSaving || !behaviorNoteText.trim()}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-5 gap-1.5"
                >
                  {behaviorSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ الملاحظة</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
