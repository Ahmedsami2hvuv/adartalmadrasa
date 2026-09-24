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
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-slate-800 selection:text-white pb-10" dir="rtl">
      {/* الرأس */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">لوحة المعلم</h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {currentUserName || "معلم المادة"}
                </span>
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              </div>
              <p className="text-[11px] text-slate-500">تسجيل الحضور والدرجات متصل مباشرة بسوبابيس</p>
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
            { id: "schedule", label: "جدولي الأسبوعي", icon: Calendar },
            { id: "attendance", label: "تسجيل الحضور (QR)", icon: CheckSquare },
            { id: "grades", label: "الدرجات", icon: Award },
            { id: "homeworks", label: "الواجبات", icon: FileCheck },
            { id: "behavior", label: "الملاحظات السلوكية", icon: BookOpen },
            { id: "lesson_plan", label: "الخطة اليومية", icon: ClipboardList },
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
