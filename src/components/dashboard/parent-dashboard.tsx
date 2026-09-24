"use client";

import React, { useState } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  CreditCard,
  Calendar,
  FileDown,
  Clock,
  Plus,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";
import { printStudentReport } from "@/lib/pdf-report";

interface Child {
  id: string;
  name: string;
  className: string;
  qrCode: string;
  attendanceRate: number;
  totalAbsences: number;
  recentAbsenceDate: string | null;
  installments: {
    total: number;
    paid: number;
    remaining: number;
    status: "paid" | "partial" | "unpaid";
    nextDueDate: string;
  };
  grades: {
    subject: string;
    daily: number;
    monthly: number;
    final: number;
    total: number;
  }[];
}

interface Appointment {
  id: string;
  teacherName: string;
  date: string;
  time: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

export function ParentDashboard() {
  const [activeTab, setActiveTab] = useState<"children" | "installments" | "appointments">("children");

  // بيانات أبناء ولي الأمر
  const [children] = useState<Child[]>([
    {
      id: "c1",
      name: "زيد طارق محمود",
      className: "الأول متوسط (شعبة أ)",
      qrCode: "STU-2025-01",
      attendanceRate: 96,
      totalAbsences: 2,
      recentAbsenceDate: "2026-09-14 (حصة واحدة)",
      installments: {
        total: 1500000,
        paid: 1000000,
        remaining: 500000,
        status: "partial",
        nextDueDate: "2026-10-15",
      },
      grades: [
        { subject: "الرياضيات", daily: 18, monthly: 28, final: 46, total: 92 },
        { subject: "اللغة العربية", daily: 19, monthly: 27, final: 45, total: 91 },
        { subject: "العلوم", daily: 17, monthly: 26, final: 44, total: 87 },
        { subject: "اللغة الإنجليزية", daily: 18, monthly: 25, final: 43, total: 86 },
      ],
    },
    {
      id: "c2",
      name: "سارة طارق محمود",
      className: "الرابع الابتدائي (شعبة ب)",
      qrCode: "STU-2025-44",
      attendanceRate: 100,
      totalAbsences: 0,
      recentAbsenceDate: null,
      installments: {
        total: 1200000,
        paid: 1200000,
        remaining: 0,
        status: "paid",
        nextDueDate: "-",
      },
      grades: [
        { subject: "الرياضيات", daily: 20, monthly: 30, final: 48, total: 98 },
        { subject: "اللغة العربية", daily: 20, monthly: 29, final: 49, total: 98 },
        { subject: "العلوم", daily: 19, monthly: 30, final: 50, total: 99 },
      ],
    },
  ]);

  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const activeChild = children[selectedChildIndex];

  // مواعيد ولي الأمر
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: "a1",
      teacherName: "إدارة المدرسة / المرشد التربوي",
      date: "2026-09-29",
      time: "10:30 صباحاً",
      reason: "مناقشة المستوى الدراسي والأنشطة الإثرائية",
      status: "approved",
    },
  ]);

  const [appointmentModal, setAppointmentModal] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState({
    teacherName: "معلم مادة الرياضيات (أ. سارة الخالد)",
    date: "",
    time: "11:00 صباحاً",
    reason: "",
  });

  // توليد تقرير PDF فوري للابن
  const handlePrintReport = (child: Child) => {
    printStudentReport({
      studentName: child.name,
      className: child.className,
      academicYear: "2025-2026",
      schoolName: "المدرسة الذكية النموذجية الأهلية",
      date: new Date().toLocaleDateString("ar-EG"),
      attendanceRate: child.attendanceRate,
      totalAbsences: child.totalAbsences,
      installmentsStatus:
        child.installments.status === "paid"
          ? "مسدد بالكامل"
          : child.installments.status === "partial"
          ? `مسدد جزئياً (المتبقي: ${child.installments.remaining.toLocaleString()} د.ع)`
          : "غير مسدد",
      grades: child.grades,
      behaviorNotes: [
        { date: "2026-09-20", note: "طالب منضبط ومواظب، أخلاق متميزة وتفاعل إيجابي مستمر", type: "positive" },
      ],
    });
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppointmentData.reason || !newAppointmentData.date) return;
    setAppointments([
      ...appointments,
      {
        id: "a" + (appointments.length + 1),
        teacherName: newAppointmentData.teacherName,
        date: newAppointmentData.date,
        time: newAppointmentData.time,
        reason: newAppointmentData.reason,
        status: "pending",
      },
    ]);
    setNewAppointmentData({
      teacherName: "معلم مادة الرياضيات (أ. سارة الخالد)",
      date: "",
      time: "11:00 صباحاً",
      reason: "",
    });
    setAppointmentModal(false);
    alert("تم إرسال طلب الموعد بنجاح، ستتلقى إشعاراً عند تأكيد إدارة المدرسة.");
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-600 selection:text-white pb-12" dir="rtl">
      {/* الرأس */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">بوابة ولي الأمر الذكية</h1>
              <p className="text-xs text-slate-500">أبو زيد طارق • متابعة الأبناء الأكاديمية والمالية</p>
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
            onClick={() => setActiveTab("children")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "children" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>متابعة الأبناء ({children.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("installments")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "installments" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>الأقساط المدرسية</span>
          </button>

          <button
            onClick={() => setActiveTab("appointments")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "appointments" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>حجز موعد مع المدرسة</span>
          </button>
        </div>
      </header>

      {/* المحتوى */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* اختيار الابن */}
        <div className="flex gap-2 mb-6">
          {children.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChildIndex(idx)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                selectedChildIndex === idx
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{ch.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                selectedChildIndex === idx ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {ch.className}
              </span>
            </button>
          ))}
        </div>

        {/* تبويب متابعة الأبناء والتقرير الأسبوعي */}
        {activeTab === "children" && (
          <div className="space-y-6">
            {/* بطاقة متابعة الحضور الفوري والغياب */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-slate-500">حالة الحضور اللحظية اليوم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span>حاضر ومسجل في المدرسة</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">تم المسح الذكي لرمز الحضور في الحصة الأولى</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-slate-500">نسبة الانضباط والغياب</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{activeChild.attendanceRate}%</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    إجمالي الغيابات: {activeChild.totalAbsences} غياب
                  </p>
                </CardContent>
              </Card>

              <Card className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-slate-500">تقرير أسبوعي تلقائي</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handlePrintReport(activeChild)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-xs font-bold shadow-sm"
                  >
                    <FileDown className="w-4 h-4 ml-1.5" />
                    تنزيل كشف الدرجات PDF
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* درجات الابن */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-sm text-slate-800 mb-4">التقييمات والدرجات المحدثة لحظياً</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b text-slate-600">
                    <tr>
                      <th className="p-3">المادة</th>
                      <th className="p-3">التقييم اليومي (20)</th>
                      <th className="p-3">الامتحان الشهري (30)</th>
                      <th className="p-3">الامتحان النهائي (50)</th>
                      <th className="p-3 font-bold">المجموع (100)</th>
                      <th className="p-3">التقدير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeChild.grades.map((g, i) => (
                      <tr key={i}>
                        <td className="p-3 font-bold text-slate-800">{g.subject}</td>
                        <td className="p-3 text-slate-600">{g.daily}</td>
                        <td className="p-3 text-slate-600">{g.monthly}</td>
                        <td className="p-3 text-slate-600">{g.final}</td>
                        <td className="p-3 font-bold text-purple-700">{g.total}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            ممتاز
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* تبويب الأقساط */}
        {activeTab === "installments" && (
          <div className="space-y-4 max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">سجل الرسوم والأقساط الدراسية</h2>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">القسط السنوي الإجمالي:</span>
                <span className="font-bold text-slate-800">{activeChild.installments.total.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">المبلغ المسدد:</span>
                <span className="font-bold text-emerald-600">{activeChild.installments.paid.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-slate-800">المبلغ المتبقي:</span>
                <span className="text-purple-700">{activeChild.installments.remaining.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>تاريخ استحقاق الدفعة القادمة:</span>
                <span>{activeChild.installments.nextDueDate}</span>
              </div>
            </div>
          </div>
        )}

        {/* تبويب حجز المواعيد */}
        {activeTab === "appointments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">حجز موعد مع إدارة المدرسة أو المعلمين</h2>
                <p className="text-xs text-slate-500">تحديد موعد مسبق للمناقشة والاستفسار دون انتظار</p>
              </div>
              <Button onClick={() => setAppointmentModal(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 ml-1.5" />
                حجز موعد جديد
              </Button>
            </div>

            <div className="space-y-3">
              {appointments.map((app) => (
                <div key={app.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{app.teacherName}</h4>
                    <p className="text-xs text-slate-600 mt-1">{app.reason}</p>
                    <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{app.date} • الساعة {app.time}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    app.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {app.status === "approved" ? "موعد مؤكد" : "قيد المعالجة"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* نافذة حجز موعد */}
      {appointmentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-4">حجز موعد مقابلة</h3>
            <form onSubmit={handleBookAppointment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">الجهة المطلوب مقابلتها:</label>
                <select
                  value={newAppointmentData.teacherName}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, teacherName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="معلم مادة الرياضيات (أ. سارة الخالد)">معلم مادة الرياضيات (أ. سارة الخالد)</option>
                  <option value="معلم مادة اللغة العربية (أ. علي الكرخي)">معلم مادة اللغة العربية (أ. علي الكرخي)</option>
                  <option value="إدارة المدرسة / المرشد التربوي">إدارة المدرسة / المرشد التربوي</option>
                  <option value="المدير العام">المدير العام</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">التاريخ المفضل:</label>
                <input
                  type="date"
                  required
                  value={newAppointmentData.date}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">الوقت المفضل:</label>
                <select
                  value={newAppointmentData.time}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="9:30 صباحاً">9:30 صباحاً</option>
                  <option value="10:30 صباحاً">10:30 صباحاً</option>
                  <option value="11:30 صباحاً">11:30 صباحاً</option>
                  <option value="12:30 ظهراً">12:30 ظهراً</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">سبب طلب الموعد أو الاستفسار:</label>
                <textarea
                  required
                  rows={3}
                  value={newAppointmentData.reason}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, reason: e.target.value })}
                  placeholder="اكتب بإيجاز موضوع المقابلة..."
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setAppointmentModal(false)}>إلغاء</Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">تأكيد الحجز</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
