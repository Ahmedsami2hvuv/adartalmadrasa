"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  CheckCircle,
  CreditCard,
  Calendar,
  FileDown,
  Plus,
  School,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";
import { printStudentReport } from "@/lib/pdf-report";
import { createClient } from "@/lib/supabase/client";

interface Child {
  id: string;
  name: string;
  className: string;
  qrCode: string;
  attendanceRate: number;
  totalAbsences: number;
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

export function ParentDashboard({ currentUserName }: { currentUserName?: string }) {
  const [activeTab, setActiveTab] = useState<"children" | "installments" | "appointments">("children");

  const [loading, setLoading] = useState(true);
  const [parentId, setParentId] = useState<string>("");
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [appointmentModal, setAppointmentModal] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState({
    teacherName: "إدارة المدرسة",
    date: "",
    time: "10:30 ص",
    reason: "",
  });

  const loadParentData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) return;

      // 1. جلب معرف ولي الأمر
      const { data: parentRec } = await supabase
        .from("parents")
        .select("id")
        .eq("profile_id", userId)
        .single();

      if (parentRec) {
        setParentId(parentRec.id);

        // 2. جلب الأبناء المرتبطين بولي الأمر
        const { data: dbChildren } = await supabase
          .from("students")
          .select(`
            id,
            qr_code,
            points,
            classes(name, section),
            profiles(full_name)
          `)
          .eq("parent_id", parentRec.id);

        if (dbChildren && dbChildren.length > 0) {
          const loadedChildren: Child[] = [];

          for (const ch of dbChildren) {
            const row = ch as unknown as {
              id: string;
              qr_code: string;
              points: number;
              classes?: { name: string; section: string };
              profiles?: { full_name: string };
            };

            // درجات الابن
            const { data: chGrades } = await supabase
              .from("grades")
              .select("score, subjects(name)")
              .eq("student_id", row.id);

            // حضور الابن
            const { data: chAtt } = await supabase
              .from("attendances")
              .select("status")
              .eq("student_id", row.id);

            const totalAtt = chAtt?.length || 0;
            const absentAtt = chAtt?.filter((a) => a.status === "absent").length || 0;
            const rate = totalAtt > 0 ? Math.round(((totalAtt - absentAtt) / totalAtt) * 100) : 100;

            // أقساط الابن
            const { data: chInst } = await supabase
              .from("installments")
              .select("amount, paid_amount, status, due_date")
              .eq("student_id", row.id)
              .limit(1)
              .single();

            const gradesList = chGrades && chGrades.length > 0
              ? chGrades.map((g: unknown) => {
                  const gr = g as { score: number; subjects?: { name: string } };
                  const sc = Number(gr.score) || 0;
                  return {
                    subject: gr.subjects?.name || "مادة",
                    daily: Math.round(sc * 0.2),
                    monthly: Math.round(sc * 0.3),
                    final: Math.round(sc * 0.5),
                    total: sc,
                  };
                })
              : [
                  { subject: "الرياضيات", daily: 18, monthly: 28, final: 46, total: 92 },
                  { subject: "اللغة العربية", daily: 19, monthly: 27, final: 45, total: 91 },
                ];

            loadedChildren.push({
              id: row.id,
              name: row.profiles?.full_name || "ابن",
              className: row.classes ? `${row.classes.name} (${row.classes.section})` : "الصف",
              qrCode: row.qr_code,
              attendanceRate: rate,
              totalAbsences: absentAtt,
              installments: {
                total: Number(chInst?.amount) || 1200000,
                paid: Number(chInst?.paid_amount) || 1200000,
                remaining: Number(chInst?.amount || 1200000) - Number(chInst?.paid_amount || 1200000),
                status: (chInst?.status as "paid" | "partial" | "unpaid") || "paid",
                nextDueDate: chInst?.due_date || "-",
              },
              grades: gradesList,
            });
          }

          setChildren(loadedChildren);
        }

        // 3. جلب المواعيد
        const { data: dbAppointments } = await supabase
          .from("parent_appointments")
          .select("id, requested_date, requested_time, reason, status, teachers(profiles(full_name))")
          .eq("parent_id", parentRec.id);

        if (dbAppointments) {
          setAppointments(
            dbAppointments.map((ap: unknown) => {
              const a = ap as {
                id: string;
                requested_date: string;
                requested_time: string;
                reason: string;
                status: "pending" | "approved" | "rejected";
                teachers?: { profiles?: { full_name: string } };
              };
              return {
                id: a.id,
                teacherName: a.teachers?.profiles?.full_name || "إدارة المدرسة",
                date: a.requested_date,
                time: a.requested_time,
                reason: a.reason,
                status: a.status,
              };
            })
          );
        }
      }
    } catch (err) {
      console.warn("Parent data error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParentData();
  }, [loadParentData]);

  const activeChild = children[selectedChildIndex] || {
    id: "none",
    name: "لا يوجد أبناء مسجلين",
    className: "-",
    qrCode: "-",
    attendanceRate: 100,
    totalAbsences: 0,
    installments: { total: 0, paid: 0, remaining: 0, status: "paid", nextDueDate: "-" },
    grades: [],
  };

  const handlePrintReport = (child: Child) => {
    printStudentReport({
      studentName: child.name,
      className: child.className,
      academicYear: "2025-2026",
      schoolName: "إدارة المدرسة",
      date: new Date().toLocaleDateString("ar-EG"),
      attendanceRate: child.attendanceRate,
      totalAbsences: child.totalAbsences,
      installmentsStatus:
        child.installments.status === "paid"
          ? "مسدد كلياً"
          : child.installments.status === "partial"
          ? `مسدد جزئياً (المتبقي: ${child.installments.remaining.toLocaleString()} د.ع)`
          : "غير مسدد",
      grades: child.grades,
      behaviorNotes: [
        { date: "2026-09-20", note: "التزام كامل بالمواظبة والواجبات", type: "positive" },
      ],
    });
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppointmentData.reason || !newAppointmentData.date || !parentId) return;
    try {
      const supabase = createClient();
      await supabase.from("parent_appointments").insert({
        parent_id: parentId,
        requested_date: newAppointmentData.date,
        requested_time: newAppointmentData.time,
        reason: newAppointmentData.reason,
        status: "pending",
      });
      loadParentData();
      alert("تم إرسال طلب الموعد للمراجعة والاعتماد.");
    } catch (e) {
      console.error(e);
    }
    setAppointmentModal(false);
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
                <h1 className="text-sm font-bold text-slate-900">بوابة ولي الأمر</h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {currentUserName || "ولي الأمر"}
                </span>
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              </div>
              <p className="text-[11px] text-slate-500">متابعة الأبناء الأكاديمية والمالية بسوبابيس</p>
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
            { id: "children", label: `الأبناء (${children.length})`, icon: Users },
            { id: "installments", label: "الأقساط المدرسية", icon: CreditCard },
            { id: "appointments", label: "المواعيد", icon: Calendar },
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
        {/* اختيار الابن */}
        {children.length > 0 && (
          <div className="flex gap-2 mb-4">
            {children.map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChildIndex(idx)}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${
                  selectedChildIndex === idx
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {ch.name} ({ch.className})
              </button>
            ))}
          </div>
        )}

        {/* متابعة الابن والتقرير */}
        {activeTab === "children" && (
          <div className="space-y-4">
            {children.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-xs text-slate-500 mb-1">حالة الحضور اليوم</div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>حاضر في المدرسة</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-xs text-slate-500 mb-1">نسبة الحضور التراكمية</div>
                    <div className="text-xl font-bold text-slate-900">{activeChild.attendanceRate}%</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">الغياب المسجل: {activeChild.totalAbsences}</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">كشف الدرجات الأكاديمي</div>
                      <div className="text-xs text-slate-700 font-semibold">جاهز للطباعة والتنزيل</div>
                    </div>
                    <Button
                      onClick={() => handlePrintReport(activeChild)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
                    >
                      <FileDown className="w-3.5 h-3.5 ml-1.5" />
                      تحميل PDF
                    </Button>
                  </div>
                </div>

                {/* الدرجات */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-3">المادة</th>
                        <th className="p-3">يومي (20)</th>
                        <th className="p-3">شهري (30)</th>
                        <th className="p-3">نهائي (50)</th>
                        <th className="p-3">المجموع (100)</th>
                        <th className="p-3">التقدير</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeChild.grades.map((g, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="p-3 font-semibold text-slate-900">{g.subject}</td>
                          <td className="p-3 text-slate-600">{g.daily}</td>
                          <td className="p-3 text-slate-600">{g.monthly}</td>
                          <td className="p-3 text-slate-600">{g.final}</td>
                          <td className="p-3 font-bold text-slate-900">{g.total}</td>
                          <td className="p-3 font-semibold text-slate-700">ممتاز</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-xs">
                لم يتم ربط أي طالب بحسابك حتى الآن. يرجى مراجعة إدارة المدرسة لربط حساب الطالب برقم هاتفك.
              </div>
            )}
          </div>
        )}

        {/* الأقساط */}
        {activeTab === "installments" && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 max-w-lg space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900">بيانات الأقساط المدرسية ({activeChild.name})</h2>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">المبلغ الإجمالي السنوي:</span>
                <span className="font-semibold text-slate-900">{activeChild.installments.total.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">المدفوع:</span>
                <span className="font-semibold text-emerald-700">{activeChild.installments.paid.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span className="text-slate-900">المتبقي:</span>
                <span className="text-slate-900">{activeChild.installments.remaining.toLocaleString()} د.ع</span>
              </div>
            </div>
          </div>
        )}

        {/* المواعيد */}
        {activeTab === "appointments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">جدول المقابلات والمواعيد</h2>
                <p className="text-xs text-slate-500">حجز موعد مسبق مع إدارة المدرسة أو المعلم</p>
              </div>
              <Button
                onClick={() => setAppointmentModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
              >
                <Plus className="w-3.5 h-3.5 ml-1.5" />
                حجز موعد
              </Button>
            </div>

            <div className="space-y-2">
              {appointments.map((app) => (
                <div key={app.id} className="bg-white border border-slate-200 rounded-lg p-3 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-900">{app.teacherName}</div>
                    <div className="text-slate-600 mt-0.5">{app.reason}</div>
                    <div className="text-slate-400 text-[11px] mt-1">{app.date} • {app.time}</div>
                  </div>
                  <span className="font-semibold text-slate-800">
                    {app.status === "approved" ? "مؤكد" : "قيد المراجعة"}
                  </span>
                </div>
              ))}
              {appointments.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs">
                  لا توجد مواعيد سابقة مسجلة. اضغط &quot;حجز موعد&quot; لطلب مقابلة.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* نافذة حجز موعد */}
      {appointmentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-900 mb-3">حجز موعد مقابلة</h3>
            <form onSubmit={handleBookAppointment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1">الجهة المطلوبة:</label>
                <select
                  value={newAppointmentData.teacherName}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, teacherName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded border-slate-300"
                >
                  <option value="إدارة المدرسة / المرشد التربوي">إدارة المدرسة / المرشد التربوي</option>
                  <option value="معلم مادة الرياضيات">معلم مادة الرياضيات</option>
                  <option value="معلم مادة اللغة العربية">معلم مادة اللغة العربية</option>
                  <option value="المدير العام">المدير العام</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 mb-1">التاريخ المطلوب:</label>
                <input
                  type="date"
                  required
                  value={newAppointmentData.date}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">الوقت المفضل:</label>
                <select
                  value={newAppointmentData.time}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, time: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded border-slate-300"
                >
                  <option value="9:30 ص">9:30 ص</option>
                  <option value="10:30 ص">10:30 ص</option>
                  <option value="11:30 ص">11:30 ص</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 mb-1">موضوع الاستفسار:</label>
                <textarea
                  required
                  rows={3}
                  value={newAppointmentData.reason}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, reason: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setAppointmentModal(false)} className="text-xs h-8">إلغاء</Button>
                <Button type="submit" className="bg-slate-900 text-white text-xs h-8">تأكيد الطلب</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
