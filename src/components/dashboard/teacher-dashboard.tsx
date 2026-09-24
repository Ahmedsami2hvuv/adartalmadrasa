"use client";

import React, { useState } from "react";
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
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";
import { QRScannerModal } from "@/components/qr-scanner";

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
  type: "daily" | "monthly" | "final";
  score: number;
}

interface Homework {
  id: string;
  title: string;
  className: string;
  subject: string;
  description: string;
  dueDate: string;
  submissionsCount: number;
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

interface LessonPlan {
  id: string;
  date: string;
  period: number;
  className: string;
  subject: string;
  title: string;
  objectives: string;
}

export function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<
    "schedule" | "attendance" | "grades" | "homeworks" | "behavior" | "lesson_plan"
  >("schedule");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [selectedClass, setSelectedClass] = useState("الأول متوسط (أ)");

  // بيانات الحضور للحصة الحالية
  const [attendanceList, setAttendanceList] = useState<StudentAttendance[]>([
    { studentId: "s1", studentName: "زيد طارق محمود", qrCode: "STU-2025-01", status: "present" },
    { studentId: "s2", studentName: "يوسف أحمد كريم", qrCode: "STU-2025-02", status: "absent" },
    { studentId: "s3", studentName: "مريم حيدر جواد", qrCode: "STU-2025-03", status: "present" },
    { studentId: "s4", studentName: "حسين علي قاسم", qrCode: "STU-2025-04", status: "present" },
    { studentId: "s5", studentName: "فاطمة محمد ناصر", qrCode: "STU-2025-05", status: "late" },
  ]);

  // الدرجات
  const [grades, setGrades] = useState<GradeEntry[]>([
    { id: "g1", studentId: "s1", studentName: "زيد طارق محمود", subject: "الرياضيات", type: "daily", score: 18 },
    { id: "g2", studentId: "s2", studentName: "يوسف أحمد كريم", subject: "الرياضيات", type: "daily", score: 14 },
    { id: "g3", studentId: "s3", studentName: "مريم حيدر جواد", subject: "الرياضيات", type: "daily", score: 20 },
  ]);

  // الواجبات المنزلية
  const [homeworks, setHomeworks] = useState<Homework[]>([
    {
      id: "hw1",
      title: "حل تمارين المعادلات الخطية صفحة 45",
      className: "الأول متوسط (أ)",
      subject: "الرياضيات",
      description: "حل التمارين من رقم 1 إلى رقم 10 في الدفتر المدرسي وكتابة النتيجة النهائية في المنصة.",
      dueDate: "2026-09-28",
      submissionsCount: 14,
    },
  ]);

  // تسليمات الواجبات لتصحيحها
  const [submissions, setSubmissions] = useState<Submission[]>([
    {
      id: "sub1",
      homeworkId: "hw1",
      studentName: "زيد طارق محمود",
      solutionText: "تم حل المعادلات كالآتي: س = 5 في التمرين الأول، ص = 12 في التمرين الثاني، ومجموعة الحل {3, 7}.",
      submittedAt: "2026-09-25",
      score: 10,
      feedback: "إجابة نموذجية ومنظمة جداً، أحسنت!",
    },
    {
      id: "sub2",
      homeworkId: "hw1",
      studentName: "يوسف أحمد كريم",
      solutionText: "حل المسألة 1: الناتج 4، المسألة 2: غير متأكد من الإشارة السالبة.",
      submittedAt: "2026-09-25",
    },
  ]);

  // الخطط اليومية
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([
    {
      id: "lp1",
      date: "2026-09-24",
      period: 1,
      className: "الأول متوسط (أ)",
      subject: "الرياضيات",
      title: "المعادلات الخطية ذات المتغير الواحد",
      objectives: "أن يميز الطالب بين المعادلة والمتطابقة، وأن يحل معادلة بسيطة من خطوتين.",
    },
  ]);

  // ملاحظات سلوكية
  const [behaviorNotes, setBehaviorNotes] = useState([
    { id: "b1", studentName: "زيد طارق", type: "positive", note: "تفاعل متميز ومساعدة زميله في فهم الدرس", points: 5 },
    { id: "b2", studentName: "يوسف أحمد", type: "negative", note: "التأخر عن الحصة وعدم إحضار الدفتر", points: -3 },
  ]);

  // نماذج الإدخال
  const [newHwModal, setNewHwModal] = useState(false);
  const [newHwData, setNewHwData] = useState({ title: "", description: "", dueDate: "" });
  const [newPlanModal, setNewPlanModal] = useState(false);
  const [newPlanData, setNewPlanData] = useState({ title: "", objectives: "", period: 1 });
  const [newBehaviorModal, setNewBehaviorModal] = useState(false);
  const [newBehaviorData, setNewBehaviorData] = useState({ studentName: "زيد طارق محمود", note: "", type: "positive" });

  // معالجة مسح QR
  const handleQRScanned = (code: string) => {
    const student = attendanceList.find((s) => s.qrCode === code);
    if (student) {
      setAttendanceList((prev) =>
        prev.map((s) => (s.qrCode === code ? { ...s, status: "present" } : s))
      );
      alert(`تم تسجيل حضور الطالب: ${student.studentName} بنجاح!`);
    } else {
      alert(`لم يتم العثور على طالب بالرمز: ${code}`);
    }
  };

  // تغيير حالة الحضور يدوياً
  const toggleAttendanceStatus = (studentId: string, status: "present" | "absent" | "late") => {
    setAttendanceList((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  // إضافة واجب جديد
  const handleAddHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHwData.title) return;
    const newH: Homework = {
      id: "hw" + (homeworks.length + 1),
      title: newHwData.title,
      className: selectedClass,
      subject: "الرياضيات",
      description: newHwData.description,
      dueDate: newHwData.dueDate || "2026-09-30",
      submissionsCount: 0,
    };
    setHomeworks([...homeworks, newH]);
    setNewHwData({ title: "", description: "", dueDate: "" });
    setNewHwModal(false);
  };

  // إضافة خطة يومية
  const handleAddLessonPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanData.title) return;
    const newP: LessonPlan = {
      id: "lp" + (lessonPlans.length + 1),
      date: new Date().toISOString().split("T")[0],
      period: newPlanData.period,
      className: selectedClass,
      subject: "الرياضيات",
      title: newPlanData.title,
      objectives: newPlanData.objectives,
    };
    setLessonPlans([...lessonPlans, newP]);
    setNewPlanData({ title: "", objectives: "", period: 1 });
    setNewPlanModal(false);
  };

  // إضافة ملاحظة سلوكية
  const handleAddBehavior = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBehaviorData.note) return;
    setBehaviorNotes([
      ...behaviorNotes,
      {
        id: "b" + (behaviorNotes.length + 1),
        studentName: newBehaviorData.studentName,
        type: newBehaviorData.type,
        note: newBehaviorData.note,
        points: newBehaviorData.type === "positive" ? 5 : -3,
      },
    ]);
    setNewBehaviorData({ studentName: "زيد طارق محمود", note: "", type: "positive" });
    setNewBehaviorModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-600 selection:text-white pb-12" dir="rtl">
      {/* الرأس */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">لوحة المدرس الأكاديمية</h1>
              <p className="text-xs text-slate-500">أ. سارة الخالد • مادة الرياضيات</p>
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
            onClick={() => setActiveTab("schedule")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "schedule" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>جدولي الأسبوعي</span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "attendance" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>تسجيل الغياب ومسح QR</span>
          </button>

          <button
            onClick={() => setActiveTab("grades")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "grades" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>إدارة الدرجات</span>
          </button>

          <button
            onClick={() => setActiveTab("homeworks")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "homeworks" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>الواجبات والتصحيح</span>
          </button>

          <button
            onClick={() => setActiveTab("behavior")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "behavior" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ملاحظات سلوكية</span>
          </button>

          <button
            onClick={() => setActiveTab("lesson_plan")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "lesson_plan" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>الخطة اليومية</span>
          </button>
        </div>
      </header>

      {/* المحتوى */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* تبويب الجدول الأسبوعي */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">جدول الحصص الأسبوعي الخاص بك</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"].map((dayName, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="font-bold text-slate-800 text-sm mb-3 pb-2 border-b border-slate-100">
                    {dayName}
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
                      <div className="font-bold text-emerald-800">الحصة 1 (8:00 - 8:45)</div>
                      <div className="text-slate-700">الأول متوسط (أ)</div>
                      <div className="text-[10px] text-slate-500">رياضيات - جبر</div>
                    </div>
                    {idx % 2 === 0 && (
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-xs">
                        <div className="font-bold text-blue-800">الحصة 3 (9:45 - 10:30)</div>
                        <div className="text-slate-700">الثاني متوسط (ب)</div>
                        <div className="text-[10px] text-slate-500">رياضيات - هندسة</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* تبويب تسجيل الغياب ومسح QR */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">الصف:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-slate-50 border rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="الأول متوسط (أ)">الأول متوسط (أ)</option>
                  <option value="الثاني متوسط (ب)">الثاني متوسط (ب)</option>
                </select>

                <span className="text-xs font-bold text-slate-700 mr-2">الحصة:</span>
                <select
                  value={currentPeriod}
                  onChange={(e) => setCurrentPeriod(Number(e.target.value))}
                  className="bg-slate-50 border rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value={1}>الحصة 1</option>
                  <option value={2}>الحصة 2</option>
                  <option value={3}>الحصة 3</option>
                </select>
              </div>

              {/* زر مسح QR الكاميرا الذكي */}
              <Button
                onClick={() => setScannerOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
              >
                <QrCode className="w-4 h-4 ml-1.5" />
                <span>مسح كود QR بالكاميرا</span>
              </Button>
            </div>

            {/* قائمة الطلاب لتسجيل الحضور */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="p-3.5">اسم الطالب</th>
                      <th className="p-3.5">رمز QR</th>
                      <th className="p-3.5">الحالة الحالية</th>
                      <th className="p-3.5 text-center">تغيير الحالة بنقرة واحدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceList.map((stu) => (
                      <tr key={stu.studentId} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-800">{stu.studentName}</td>
                        <td className="p-3.5 font-mono text-slate-500">{stu.qrCode}</td>
                        <td className="p-3.5">
                          {stu.status === "present" && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> حاضر
                            </span>
                          )}
                          {stu.status === "absent" && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> غائب
                            </span>
                          )}
                          {stu.status === "late" && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> متأخر
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => toggleAttendanceStatus(stu.studentId, "present")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold"
                            >
                              حاضر
                            </button>
                            <button
                              onClick={() => toggleAttendanceStatus(stu.studentId, "absent")}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold"
                            >
                              غائب
                            </button>
                            <button
                              onClick={() => toggleAttendanceStatus(stu.studentId, "late")}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold"
                            >
                              متأخر
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* تبويب إدارة الدرجات */}
        {activeTab === "grades" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">سجل الدرجات والتقييمات</h2>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b text-slate-600">
                  <tr>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">المادة</th>
                    <th className="p-3">نوع التقييم</th>
                    <th className="p-3">الدرجة</th>
                    <th className="p-3">تعديل سريع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((g) => (
                    <tr key={g.id}>
                      <td className="p-3 font-bold text-slate-800">{g.studentName}</td>
                      <td className="p-3 text-slate-600">{g.subject}</td>
                      <td className="p-3 text-slate-500">تقييم يومي (من 20)</td>
                      <td className="p-3 font-bold text-blue-600">{g.score}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          defaultValue={g.score}
                          className="w-16 px-2 py-1 border rounded-lg text-center"
                          onChange={(e) => {
                            setGrades(grades.map((gr) => gr.id === g.id ? { ...gr, score: Number(e.target.value) } : gr));
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* تبويب الواجبات والتصحيح */}
        {activeTab === "homeworks" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">الواجبات المنزلية (نص فقط)</h2>
                <p className="text-xs text-slate-500">إضافة الواجبات ومراجعة حلول الطلاب وتصحيحها</p>
              </div>
              <Button onClick={() => setNewHwModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 ml-1.5" />
                إضافة واجب جديد
              </Button>
            </div>

            {/* قائمة الواجبات الحالية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {homeworks.map((hw) => (
                <div key={hw.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs">{hw.subject}</span>
                    <span className="text-xs text-slate-500">تسليم حتى: {hw.dueDate}</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-800 mb-2">{hw.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{hw.description}</p>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>عدد الإجابات المسلمة:</span>
                    <span className="font-bold text-slate-800">{submissions.length} إجابة</span>
                  </div>
                </div>
              ))}
            </div>

            {/* تصحيح إجابات الطلاب */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-sm text-slate-800 mb-4">تصحيح حلول الطلاب الأخيرة</h3>
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-800">{sub.studentName}</span>
                      <span className="text-[11px] text-slate-500">تاريخ التسليم: {sub.submittedAt}</span>
                    </div>
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 mb-3 whitespace-pre-wrap">
                      {sub.solutionText}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-600">الدرجة (من 10):</span>
                      <input
                        type="number"
                        defaultValue={sub.score || 10}
                        className="w-16 px-2 py-1 text-xs border rounded-lg text-center font-bold"
                      />
                      <input
                        type="text"
                        defaultValue={sub.feedback || "أحسنت"}
                        placeholder="ملاحظات وتغذية راجعة..."
                        className="flex-1 px-3 py-1 text-xs border rounded-lg"
                      />
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                        حفظ التصحيح
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* تبويب الملاحظات السلوكية */}
        {activeTab === "behavior" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">الملاحظات السلوكية للطلاب</h2>
                <p className="text-xs text-slate-500">تسجيل السلوكيات الإيجابية أو التنبيهات وتأثيرها على نقاط الطالب</p>
              </div>
              <Button onClick={() => setNewBehaviorModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 ml-1.5" />
                تسجيل سلوك جديد
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {behaviorNotes.map((b) => (
                <div key={b.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    b.type === "positive" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-800">{b.studentName}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.type === "positive" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {b.points > 0 ? `+${b.points} نقاط` : `${b.points} نقاط`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{b.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* تبويب الخطة اليومية */}
        {activeTab === "lesson_plan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">الخطة اليومية للدروس</h2>
                <p className="text-xs text-slate-500">تحضير أهداف الدرس والأنشطة اليومية</p>
              </div>
              <Button onClick={() => setNewPlanModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 ml-1.5" />
                إعداد خطة درس جديد
              </Button>
            </div>

            <div className="space-y-3">
              {lessonPlans.map((lp) => (
                <div key={lp.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      {lp.className} • الحصة {lp.period}
                    </span>
                    <span className="text-xs text-slate-500">{lp.date}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">{lp.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed"><strong className="text-slate-700">الأهداف التعليمية:</strong> {lp.objectives}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* نافذة ماسح QR */}
      {scannerOpen && (
        <QRScannerModal
          onScan={handleQRScanned}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* نافذة إضافة واجب */}
      {newHwModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-4">إضافة واجب منزلي جديد (نص فقط)</h3>
            <form onSubmit={handleAddHomework} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">عنوان الواجب:</label>
                <input
                  type="text"
                  required
                  value={newHwData.title}
                  onChange={(e) => setNewHwData({ ...newHwData, title: e.target.value })}
                  placeholder="مثال: حل تمارين المتتاليات ص 32"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">تفاصيل ومحتوى الواجب (نصي):</label>
                <textarea
                  required
                  rows={4}
                  value={newHwData.description}
                  onChange={(e) => setNewHwData({ ...newHwData, description: e.target.value })}
                  placeholder="اكتب التمارين والتعليمات المطلوبة من الطالب..."
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">موعد التسليم النهائي:</label>
                <input
                  type="date"
                  required
                  value={newHwData.dueDate}
                  onChange={(e) => setNewHwData({ ...newHwData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setNewHwModal(false)}>إلغاء</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">نشر الواجب</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة خطة الدرس */}
      {newPlanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-4">إعداد خطة درس يومي</h3>
            <form onSubmit={handleAddLessonPlan} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">موضوع الدرس:</label>
                <input
                  type="text"
                  required
                  value={newPlanData.title}
                  onChange={(e) => setNewPlanData({ ...newPlanData, title: e.target.value })}
                  placeholder="مثال: خصائص المثلث المتساوي الساقين"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">الأهداف التعليمية والسلوكية:</label>
                <textarea
                  required
                  rows={4}
                  value={newPlanData.objectives}
                  onChange={(e) => setNewPlanData({ ...newPlanData, objectives: e.target.value })}
                  placeholder="ما الذي سيتعلمه الطالب خلال هذه الحصة..."
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setNewPlanModal(false)}>إلغاء</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">حفظ الخطة</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة ملاحظة سلوكية */}
      {newBehaviorModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-4">تسجيل ملاحظة سلوكية</h3>
            <form onSubmit={handleAddBehavior} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">نوع السلوك:</label>
                <select
                  value={newBehaviorData.type}
                  onChange={(e) => setNewBehaviorData({ ...newBehaviorData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="positive">إيجابي (+5 نقاط تميز)</option>
                  <option value="negative">سلبي (-3 نقاط تنبيه)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">نص الملاحظة:</label>
                <textarea
                  required
                  rows={3}
                  value={newBehaviorData.note}
                  onChange={(e) => setNewBehaviorData({ ...newBehaviorData, note: e.target.value })}
                  placeholder="اكتب ما قام به الطالب بدقة..."
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setNewBehaviorModal(false)}>إلغاء</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">تسجيل</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
