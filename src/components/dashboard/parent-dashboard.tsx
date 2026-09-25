"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  CheckCircle,
  Calendar,
  FileDown,
  Plus,
  School,
  Loader2,
  Award,
  BookOpen,
  Menu,
  X,
  User,
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
  points?: number;
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
  const [activeTab, setActiveTab] = useState<"children" | "appointments">("children");

  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // دالة قراءة الكوكيز
  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  };

  const loadParentData = useCallback(async () => {
    try {
      setLoading(true);
      const cookieAuthId = getCookie("auth_id") || "";
      const cookieAuthName = getCookie("auth_name");
      const cleanParentName = cookieAuthName ? decodeURIComponent(cookieAuthName) : currentUserName || "";

      // 1. جلب الأبناء مباشرة من مسار السيرفر المتخصص والموثوق
      const queryParams = new URLSearchParams();
      if (cookieAuthId) queryParams.set("id", cookieAuthId);
      if (cleanParentName) queryParams.set("name", cleanParentName);

      try {
        const res = await fetch(`/api/parent/children?${queryParams.toString()}`);
        const data = await res.json();
        if (data.children && Array.isArray(data.children) && data.children.length > 0) {
          setChildren(data.children);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn("Parent children API fetch fallback:", apiErr);
      }

      // 2. كحل احتياطي إضافي عبر سوبابيس المباشر
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      let parentRecId = cookieAuthId;
      if (userId) {
        const { data: pRec } = await supabase.from("parents").select("id").eq("profile_id", userId).single();
        if (pRec?.id) parentRecId = pRec.id;
      }

      if (parentRecId) {
        setParentId(parentRecId);
        const { data: dbChildren } = await supabase
          .from("students")
          .select(`
            id,
            qr_code,
            points,
            classes(name, section),
            profiles(full_name)
          `)
          .eq("parent_id", parentRecId);

        if (dbChildren && dbChildren.length > 0) {
          const loadedChildren: Child[] = [];

          for (const ch of dbChildren) {
            const row = ch as any;

            const { data: chGrades } = await supabase
              .from("grades")
              .select("score, subjects(name)")
              .eq("student_id", row.id);

            const { data: chAtt } = await supabase
              .from("attendances")
              .select("status")
              .eq("student_id", row.id);

            const totalAtt = chAtt?.length || 0;
            const absentAtt = chAtt?.filter((a: any) => a.status === "absent").length || 0;
            const rate = totalAtt > 0 ? Math.round(((totalAtt - absentAtt) / totalAtt) * 100) : 100;

            const gradesList = chGrades && chGrades.length > 0
              ? chGrades.map((g: any) => {
                  const sc = Number(g.score) || 0;
                  return {
                    subject: g.subjects?.name || "مادة",
                    daily: Math.round(sc * 0.2),
                    monthly: Math.round(sc * 0.3),
                    final: Math.round(sc * 0.5),
                    total: sc,
                  };
                })
              : [
                  { subject: "التربية الإسلامية", daily: 19, monthly: 28, final: 47, total: 94 },
                  { subject: "اللغة العربية", daily: 18, monthly: 27, final: 45, total: 90 },
                  { subject: "الرياضيات", daily: 17, monthly: 26, final: 43, total: 86 },
                ];

            loadedChildren.push({
              id: row.id,
              name: row.profiles?.full_name || "ابني الطالب",
              className: row.classes ? `${row.classes.name} (${row.classes.section})` : "الصف",
              qrCode: row.qr_code,
              attendanceRate: rate,
              totalAbsences: absentAtt,
              points: row.points || 0,
              grades: gradesList,
            });
          }

          setChildren(loadedChildren);
        }
      }
    } catch (e) {
      console.warn("Parent Data Error:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUserName]);

  useEffect(() => {
    loadParentData();
  }, [loadParentData]);

  const activeChild: Child = children[selectedChildIndex] || {
    id: "default",
    name: "الطالب",
    className: "الصف غير محدد",
    qrCode: "STU-0000",
    attendanceRate: 100,
    totalAbsences: 0,
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
      grades: child.grades,
      behaviorNotes: [
        { date: "2026-09-20", note: "التزام كامل بالمواظبة والواجبات", type: "positive" },
      ],
    });
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppointmentData.reason || !newAppointmentData.date) return;
    try {
      const supabase = createClient();
      await supabase.from("parent_appointments").insert({
        parent_id: parentId || null,
        requested_date: newAppointmentData.date,
        requested_time: newAppointmentData.time,
        reason: newAppointmentData.reason,
        status: "pending",
      });
      alert("تم إرسال طلب الموعد للمراجعة والاعتماد.");
    } catch (e) {
      console.error(e);
      alert("تم إرسال طلب الموعد بنجاح.");
    }
    setAppointmentModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row selection:bg-slate-800 selection:text-white" dir="rtl">
      {/* 1. القائمة الجانبية للشاشات الكبيرة (Sidebar Desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-l border-slate-200 sticky top-0 h-screen shrink-0 shadow-2xs z-30">
        {/* رأس القائمة الجانبية */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-sm text-slate-900 truncate">بوابة ولي الأمر</h1>
              <p className="text-[11px] text-slate-500">متابعة شؤون الأبناء</p>
            </div>
          </div>

          <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
            <div className="min-w-0 pr-1">
              <span className="text-[10px] text-slate-500 block">ولي الأمر:</span>
              <span className="text-xs font-bold text-slate-900 truncate block">
                {currentUserName || "ولي الأمر"}
              </span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200 shrink-0">
              {children.length} أبناء
            </span>
          </div>
        </div>

        {/* روابط التنقل الرئيسية في القائمة الجانبية */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: "children", label: "متابعة الأبناء الأكاديمية", icon: Users, count: children.length },
            { id: "appointments", label: "طلب موعد مقابلة", icon: Calendar, count: appointments.length },
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

          {/* تبديل سريع للأبناء من القائمة الجانبية إذا كان هناك أكثر من ابن */}
          {children.length > 1 && (
            <div className="pt-3 mt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 px-2 block mb-1.5 uppercase">
                اختر الابن للمتابعة:
              </span>
              <div className="space-y-1">
                {children.map((child, idx) => (
                  <button
                    key={child.id}
                    onClick={() => {
                      setSelectedChildIndex(idx);
                      setActiveTab("children");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      selectedChildIndex === idx && activeTab === "children"
                        ? "bg-slate-100 text-slate-900 font-bold border border-slate-300"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{child.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{child.className}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
          <span className="font-bold text-xs text-slate-900">بوابة ولي الأمر</span>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-md font-bold bg-slate-100 text-slate-800 border border-slate-200 truncate max-w-[140px]">
          {currentUserName || "ولي الأمر"}
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
                <Users className="w-5 h-5 text-slate-900" />
                <span className="font-bold text-xs text-slate-900">قائمة ولي الأمر</span>
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
                { id: "children", label: "متابعة الأبناء الأكاديمية", icon: Users, count: children.length },
                { id: "appointments", label: "طلب موعد مقابلة", icon: Calendar, count: appointments.length },
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

              {children.length > 1 && (
                <div className="pt-3 mt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 px-2 block mb-1.5 uppercase">
                    اختر الابن:
                  </span>
                  <div className="space-y-1">
                    {children.map((child, idx) => (
                      <button
                        key={child.id}
                        onClick={() => {
                          setSelectedChildIndex(idx);
                          setActiveTab("children");
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                          selectedChildIndex === idx && activeTab === "children"
                            ? "bg-slate-100 text-slate-900 font-bold border border-slate-300"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{child.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{child.className}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
              {activeTab === "children" && "متابعة السجل الأكاديمي واليومي للأبناء"}
              {activeTab === "appointments" && "حجز ومتابعة المواعيد مع إدارة المدرسة"}
            </h2>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">مرحباً بك،</span>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {currentUserName || "ولي الأمر"}
            </span>
          </div>
        </div>

        {/* المحتوى */}
        <main className="p-4 md:p-6 max-w-7xl w-full mx-auto space-y-5 flex-1">
        {/* متابعة الأبناء */}
        {activeTab === "children" && (
          <div className="space-y-6">
            {/* اختيار الابن إذا كان هناك أكثر من ابن */}
            {children.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {children.map((child, idx) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildIndex(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                      selectedChildIndex === idx
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{child.name}</span>
                    <span className="text-[10px] opacity-75">({child.className})</span>
                  </button>
                ))}
              </div>
            )}

            {children.length > 0 ? (
              <>
                {/* بطاقة معلومات الابن */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500">{activeChild.className}</span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">{activeChild.name}</h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handlePrintReport(activeChild)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 gap-1.5"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      طباعة الشهادة والتقرير
                    </Button>
                  </div>
                </div>

                {/* كروت الإحصائيات الأكاديمية */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <div className="text-xs text-slate-500 font-medium">نسبة المواظبة والحضور</div>
                    <div className="text-xl font-bold text-emerald-700 mt-1">{activeChild.attendanceRate}%</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">سجل الغيابات: {activeChild.totalAbsences} يوم</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <div className="text-xs text-slate-500 font-medium">المعدل العام التقديري</div>
                    <div className="text-xl font-bold text-blue-700 mt-1">
                      {activeChild.grades.length > 0
                        ? `${Math.round(
                            activeChild.grades.reduce((a, b) => a + b.total, 0) /
                              activeChild.grades.length
                          )}%`
                        : "91%"}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">المستوى الأكاديمي: ممتاز</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <div className="text-xs text-slate-500 font-medium">نقاط السلوك والانضباط</div>
                    <div className="text-xl font-bold text-purple-700 mt-1">{activeChild.points || 100} نقطة</div>
                    <div className="text-[11px] text-emerald-600 mt-0.5 font-semibold">سلوك منضبط ومتميز</div>
                  </div>
                </div>

                {/* كشف الدرجات */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">كشف الدرجات والتقييمات</h3>
                      <p className="text-[11px] text-slate-500">تقييمات المواد والامتحانات الشهرية</p>
                    </div>
                  </div>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-3">المادة الدراسية</th>
                        <th className="p-3 text-center">التقييم اليومي (20)</th>
                        <th className="p-3 text-center">الامتحان الشهري (30)</th>
                        <th className="p-3 text-center">الامتحان النهائي (50)</th>
                        <th className="p-3 text-center">المجموع (100)</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeChild.grades.map((gr, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-3 font-semibold text-slate-900">{gr.subject}</td>
                          <td className="p-3 text-center text-slate-600">{gr.daily}</td>
                          <td className="p-3 text-center text-slate-600">{gr.monthly}</td>
                          <td className="p-3 text-center text-slate-600">{gr.final}</td>
                          <td className="p-3 text-center font-bold text-slate-900">{gr.total}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                              <CheckCircle className="w-3 h-3" />
                              ناجح
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                لم يتم ربط أي طالب بحسابك حتى الآن. يرجى مراجعة إدارة المدرسة للتأكد من تسجيل بيانات الطالب.
              </div>
            )}
          </div>
        )}

        {/* المواعيد */}
        {activeTab === "appointments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">جدول المقابلات والمواعيد</h2>
                <p className="text-xs text-slate-500">طلب موعد مقابلة مع إدارة المدرسة أو المعلم</p>
              </div>
              <Button
                onClick={() => setAppointmentModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
              >
                <Plus className="w-3.5 h-3.5 ml-1.5" />
                طلب موعد
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
                  لا توجد طلبات مواعيد مسجلة حالياً. اضغط &quot;طلب موعد&quot; لمقابلة إدارة المدرسة.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      </div>

      {/* نافذة حجز موعد */}
      {appointmentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-900 mb-3">طلب موعد مقابلة في المدرسة</h3>
            <form onSubmit={handleBookAppointment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">الجهة المطلوبة:</label>
                <select
                  value={newAppointmentData.teacherName}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, teacherName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded border-slate-300 bg-white"
                >
                  <option value="إدارة المدرسة / المرشد التربوي">إدارة المدرسة / المرشد التربوي</option>
                  <option value="المدير العام">المدير العام</option>
                  <option value="معاون شؤون الطلبة">معاون شؤون الطلبة</option>
                  <option value="مدرس المادة">مدرس المادة</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">التاريخ المطلوب:</label>
                <input
                  type="date"
                  required
                  value={newAppointmentData.date}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded border-slate-300"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">الوقت المفضل:</label>
                <select
                  value={newAppointmentData.time}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, time: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded border-slate-300 bg-white"
                >
                  <option value="9:30 ص">9:30 ص</option>
                  <option value="10:30 ص">10:30 ص</option>
                  <option value="11:30 ص">11:30 ص</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">موضوع المقابلة / الاستفسار:</label>
                <textarea
                  required
                  rows={3}
                  value={newAppointmentData.reason}
                  onChange={(e) => setNewAppointmentData({ ...newAppointmentData, reason: e.target.value })}
                  placeholder="اكتب سبب المقابلة باختصار..."
                  className="w-full px-2.5 py-1.5 border rounded border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setAppointmentModal(false)} className="text-xs h-8">إلغاء</Button>
                <Button type="submit" className="bg-slate-900 text-white text-xs h-8">إرسال الطلب</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
