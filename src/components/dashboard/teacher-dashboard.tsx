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
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const [scannerOpen, setScannerOpen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [selectedClass, setSelectedClass] = useState("الأول متوسط (أ)");

  const [attendanceList, setAttendanceList] = useState<StudentAttendance[]>([
    { studentId: "s1", studentName: "زيد طارق محمود", qrCode: "STU-2025-01", status: "present" },
    { studentId: "s2", studentName: "يوسف أحمد كريم", qrCode: "STU-2025-02", status: "absent" },
    { studentId: "s3", studentName: "مريم حيدر جواد", qrCode: "STU-2025-03", status: "present" },
    { studentId: "s4", studentName: "حسين علي قاسم", qrCode: "STU-2025-04", status: "present" },
    { studentId: "s5", studentName: "فاطمة محمد ناصر", qrCode: "STU-2025-05", status: "late" },
  ]);

  const [grades, setGrades] = useState<GradeEntry[]>([
    { id: "g1", studentId: "s1", studentName: "زيد طارق محمود", subject: "الرياضيات", score: 18 },
    { id: "g2", studentId: "s2", studentName: "يوسف أحمد كريم", subject: "الرياضيات", score: 14 },
    { id: "g3", studentId: "s3", studentName: "مريم حيدر جواد", subject: "الرياضيات", score: 20 },
  ]);

  const [homeworks, setHomeworks] = useState<Homework[]>([
    {
      id: "hw1",
      title: "حل تمارين المعادلات الخطية صفحة 45",
      className: "الأول متوسط (أ)",
      subject: "الرياضيات",
      description: "حل التمارين من رقم 1 إلى رقم 10 في الدفتر المدرسي وتدوين الناتج النهائي في المنصة.",
      dueDate: "2026-09-28",
    },
  ]);

  const [submissions, setSubmissions] = useState<Submission[]>([
    {
      id: "sub1",
      homeworkId: "hw1",
      studentName: "زيد طارق محمود",
      solutionText: "تم حل المعادلات: س = 5 في التمرين الأول، ص = 12 في التمرين الثاني ومجموعة الحل {3, 7}.",
      submittedAt: "2026-09-25",
      score: 10,
      feedback: "إجابة دقيقة ومنظمة، أحسنت.",
    },
  ]);

  const [lessonPlans, setLessonPlans] = useState([
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

  const [behaviorNotes, setBehaviorNotes] = useState([
    { id: "b1", studentName: "زيد طارق", type: "positive", note: "تفاعل متميز ومساعدة زميله في فهم الدرس", points: 5 },
    { id: "b2", studentName: "يوسف أحمد", type: "negative", note: "التأخر عن موعد بدء الحصة", points: -3 },
  ]);

  const [newHwModal, setNewHwModal] = useState(false);
  const [newHwData, setNewHwData] = useState({ title: "", description: "", dueDate: "" });
  const [newPlanModal, setNewPlanModal] = useState(false);
  const [newPlanData, setNewPlanData] = useState({ title: "", objectives: "", period: 1 });
  const [newBehaviorModal, setNewBehaviorModal] = useState(false);
  const [newBehaviorData, setNewBehaviorData] = useState({ studentName: "زيد طارق محمود", note: "", type: "positive" });

  const handleQRScanned = (code: string) => {
    const student = attendanceList.find((s) => s.qrCode === code);
    if (student) {
      setAttendanceList((prev) =>
        prev.map((s) => (s.qrCode === code ? { ...s, status: "present" } : s))
      );
      alert(`تم تسجيل حضور: ${student.studentName}`);
    } else {
      alert(`الرمز غير مسجل: ${code}`);
    }
  };

  const toggleAttendanceStatus = (studentId: string, status: "present" | "absent" | "late") => {
    setAttendanceList((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const handleAddHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHwData.title) return;
    setHomeworks([
      ...homeworks,
      {
        id: "hw" + (homeworks.length + 1),
        title: newHwData.title,
        className: selectedClass,
        subject: "الرياضيات",
        description: newHwData.description,
        dueDate: newHwData.dueDate || "2026-09-30",
      },
    ]);
    setNewHwData({ title: "", description: "", dueDate: "" });
    setNewHwModal(false);
  };

  const handleAddLessonPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanData.title) return;
    setLessonPlans([
      ...lessonPlans,
      {
        id: "lp" + (lessonPlans.length + 1),
        date: new Date().toISOString().split("T")[0],
        period: newPlanData.period,
        className: selectedClass,
        subject: "الرياضيات",
        title: newPlanData.title,
        objectives: newPlanData.objectives,
      },
    ]);
    setNewPlanData({ title: "", objectives: "", period: 1 });
    setNewPlanModal(false);
  };

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
                <h1 className="text-sm font-bold text-slate-900">لوحة المعلم الأكاديمية</h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {currentUserName || "معلم المادة"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">متابعة الحضور والدرجات والواجبات</p>
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
            { id: "attendance", label: "تسجيل الحضور والغياب", icon: CheckSquare },
            { id: "grades", label: "سجل الدرجات", icon: Award },
            { id: "homeworks", label: "الواجبات والتصحيح", icon: FileCheck },
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
            <h2 className="text-sm font-bold text-slate-900">جدول الحصص الأسبوعي</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"].map((dayName, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="font-bold text-slate-900 text-xs mb-2 pb-1.5 border-b border-slate-100">
                    {dayName}
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                      <div className="font-semibold text-slate-900">الحصة 1 (8:00 ص)</div>
                      <div className="text-slate-600">الأول متوسط (أ)</div>
                    </div>
                    {idx % 2 === 0 && (
                      <div className="p-2 rounded bg-slate-50 border border-slate-200 text-xs">
                        <div className="font-semibold text-slate-900">الحصة 3 (9:50 ص)</div>
                        <div className="text-slate-600">الثاني متوسط (ب)</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* الحضور والغياب و QR */}
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
                  <option value="الأول متوسط (أ)">الأول متوسط (أ)</option>
                  <option value="الثاني متوسط (ب)">الثاني متوسط (ب)</option>
                </select>

                <span className="font-semibold text-slate-700 mr-2">الحصة:</span>
                <select
                  value={currentPeriod}
                  onChange={(e) => setCurrentPeriod(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800"
                >
                  <option value={1}>الحصة 1</option>
                  <option value={2}>الحصة 2</option>
                  <option value={3}>الحصة 3</option>
                </select>
              </div>

              <Button
                onClick={() => setScannerOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
              >
                <QrCode className="w-3.5 h-3.5 ml-1.5" />
                مسح باركود الطالب (كاميرا)
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">رمز الحضور</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">تحديث سريع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceList.map((stu) => (
                    <tr key={stu.studentId} className="hover:bg-slate-50/60">
                      <td className="p-3 font-semibold text-slate-900">{stu.studentName}</td>
                      <td className="p-3 font-mono text-slate-500">{stu.qrCode}</td>
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
                            className="px-2 py-0.5 rounded text-xs border border-slate-300 hover:bg-slate-100"
                          >
                            غائب
                          </button>
                          <button
                            onClick={() => toggleAttendanceStatus(stu.studentId, "late")}
                            className="px-2 py-0.5 rounded text-xs border border-slate-300 hover:bg-slate-100"
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
        )}

        {/* الدرجات */}
        {activeTab === "grades" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900">سجل درجات الطلاب</h2>
            <div className="bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">المادة</th>
                    <th className="p-3">الدرجة اليومية (20)</th>
                    <th className="p-3">تعديل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((g) => (
                    <tr key={g.id}>
                      <td className="p-3 font-semibold text-slate-900">{g.studentName}</td>
                      <td className="p-3 text-slate-600">{g.subject}</td>
                      <td className="p-3 font-bold text-slate-900">{g.score}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          defaultValue={g.score}
                          className="w-16 px-2 py-0.5 border rounded border-slate-300 text-center"
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

        {/* الواجبات */}
        {activeTab === "homeworks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">الواجبات المنزلية (نصية)</h2>
                <p className="text-xs text-slate-500">إضافة الواجبات ومراجعة إجابات الطلاب</p>
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
                    <span className="font-semibold text-slate-800">{hw.subject}</span>
                    <span>تسليم حتى: {hw.dueDate}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mb-1">{hw.title}</div>
                  <p className="text-xs text-slate-600 mb-3">{hw.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-bold text-slate-900 mb-3">حلول الطلاب المستلمة</h3>
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
                    <div className="flex justify-between font-semibold text-slate-900 mb-1">
                      <span>{sub.studentName}</span>
                      <span className="text-[11px] text-slate-500">{sub.submittedAt}</span>
                    </div>
                    <p className="p-2 bg-white rounded border border-slate-200 mb-2">{sub.solutionText}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">الدرجة:</span>
                      <input
                        type="number"
                        defaultValue={sub.score || 10}
                        className="w-14 px-2 py-0.5 border rounded border-slate-300 text-center"
                      />
                      <Button size="sm" className="bg-slate-900 text-white text-xs h-7">
                        حفظ التقييم
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* الملاحظات السلوكية */}
        {activeTab === "behavior" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">سجل الملاحظات السلوكية</h2>
                <p className="text-xs text-slate-500">تسجيل التقييم السلوكي للطلاب</p>
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
                      {b.type === "positive" ? "+5 نقاط" : "-3 نقاط"}
                    </span>
                  </div>
                  <p className="text-slate-600">{b.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* الخطة اليومية */}
        {activeTab === "lesson_plan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">الخطة اليومية للدروس</h2>
                <p className="text-xs text-slate-500">إعداد وتوثيق موضوع وأهداف الحصة</p>
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
                <Button type="submit" className="bg-slate-900 text-white text-xs h-8">حفظ</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة خطة الدرس */}
      {newPlanModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-900 mb-3">خطة درس يومي</h3>
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
                <Button type="submit" className="bg-slate-900 text-white text-xs h-8">حفظ</Button>
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
                <Button type="submit" className="bg-slate-900 text-white text-xs h-8">حفظ</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
