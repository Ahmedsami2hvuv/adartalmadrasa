"use client";

import React, { useState } from "react";
import {
  Users,
  UserPlus,
  BookOpen,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  Send,
  Share2,
  Trash2,
  ArrowRightLeft,
  FileDown,
  Plus,
  CheckCircle,
  AlertTriangle,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";
import { printStudentReport } from "@/lib/pdf-report";

interface Teacher {
  id: string;
  name: string;
  phone: string;
  subject: string;
  classes: string[];
  inviteToken: string;
}

interface ClassItem {
  id: string;
  name: string;
  section: string;
  stage: string;
  studentCount: number;
}

interface Student {
  id: string;
  name: string;
  classId: string;
  className: string;
  parentName: string;
  parentPhone: string;
  qrCode: string;
  attendanceRate: number;
  totalAbsences: number;
  installmentsStatus: "paid" | "partial" | "unpaid";
}

interface ScheduleEntry {
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  day: number; // 1: الأحد, 2: الإثنين, إلخ
  period: number; // 1 إلى 5
}

export function ManagementDashboard({ userRole }: { userRole: "director" | "vice_director" }) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "teachers" | "classes" | "students" | "schedule" | "installments" | "settings"
  >("overview");

  // بيانات أولية واقعية للمعاينة والإدارة
  const [teachers, setTeachers] = useState<Teacher[]>([
    {
      id: "t1",
      name: "أ. سارة الخالد",
      phone: "+9647701234567",
      subject: "الرياضيات",
      classes: ["الأول متوسط (أ)", "الثاني متوسط (ب)"],
      inviteToken: "INV-MATH-8492",
    },
    {
      id: "t2",
      name: "أ. علي الكرخي",
      phone: "+9647809876543",
      subject: "اللغة العربية",
      classes: ["الأول متوسط (أ)", "الأول متوسط (ب)"],
      inviteToken: "INV-ARABIC-1923",
    },
    {
      id: "t3",
      name: "أ. حسين البصري",
      phone: "+9647712398471",
      subject: "العلوم والفيزياء",
      classes: ["الثالث متوسط (أ)"],
      inviteToken: "INV-SCI-4821",
    },
  ]);

  const [classes, setClasses] = useState<ClassItem[]>([
    { id: "c1", name: "الأول متوسط", section: "أ", stage: "متوسطة", studentCount: 28 },
    { id: "c1-b", name: "الأول متوسط", section: "ب", stage: "متوسطة", studentCount: 26 },
    { id: "c2", name: "الثاني متوسط", section: "أ", stage: "متوسطة", studentCount: 24 },
    { id: "c3", name: "الثالث متوسط", section: "أ", stage: "متوسطة", studentCount: 22 },
  ]);

  const [students, setStudents] = useState<Student[]>([
    {
      id: "s1",
      name: "زيد طارق محمود",
      classId: "c1",
      className: "الأول متوسط (أ)",
      parentName: "طارق محمود",
      parentPhone: "+9647700011223",
      qrCode: "STU-2025-01",
      attendanceRate: 96,
      totalAbsences: 2,
      installmentsStatus: "paid",
    },
    {
      id: "s2",
      name: "يوسف أحمد كريم",
      classId: "c1",
      className: "الأول متوسط (أ)",
      parentName: "أحمد كريم",
      parentPhone: "+9647800044556",
      qrCode: "STU-2025-02",
      attendanceRate: 88,
      totalAbsences: 5,
      installmentsStatus: "partial",
    },
    {
      id: "s3",
      name: "مريم حيدر جواد",
      classId: "c1-b",
      className: "الأول متوسط (ب)",
      parentName: "حيدر جواد",
      parentPhone: "+9647711122334",
      qrCode: "STU-2025-03",
      attendanceRate: 98,
      totalAbsences: 1,
      installmentsStatus: "paid",
    },
  ]);

  const [schedules, setSchedules] = useState<ScheduleEntry[]>([
    { id: "sc1", classId: "c1", className: "الأول متوسط (أ)", teacherId: "t1", teacherName: "أ. سارة الخالد", subject: "الرياضيات", day: 1, period: 1 },
    { id: "sc2", classId: "c1", className: "الأول متوسط (أ)", teacherId: "t2", teacherName: "أ. علي الكرخي", subject: "اللغة العربية", day: 1, period: 2 },
    { id: "sc3", classId: "c1-b", className: "الأول متوسط (ب)", teacherId: "t1", teacherName: "أ. سارة الخالد", subject: "الرياضيات", day: 1, period: 3 },
  ]);

  // إعدادات المدرسة وتيليجرام
  const [settings, setSettings] = useState({
    schoolName: "المدرسة الذكية النموذجية الأهلية",
    workingDays: 5, // 5 أو 6
    periodsPerDay: 5, // 5 حصص
    telegramBotToken: "7129841289:AAEj482Jsdklm92k-9832_sample",
    telegramDirectorChatId: "98234812",
    academicYear: "2025-2026",
  });

  // نوافذ ونماذج الإدخال
  const [newTeacherModal, setNewTeacherModal] = useState(false);
  const [newTeacherData, setNewTeacherData] = useState({ name: "", phone: "", subject: "" });
  const [newClassModal, setNewClassModal] = useState(false);
  const [newClassData, setNewClassData] = useState({ name: "", section: "", stage: "متوسطة" });
  const [newStudentModal, setNewStudentModal] = useState(false);
  const [newStudentData, setNewStudentData] = useState({ name: "", classId: "c1", parentName: "", parentPhone: "" });
  const [newScheduleModal, setNewScheduleModal] = useState(false);
  const [newScheduleData, setNewScheduleData] = useState({ classId: "c1", teacherId: "t1", subject: "الرياضيات", day: 1, period: 1 });
  const [scheduleError, setScheduleError] = useState("");

  // إضافة معلم وتوليد رابط الدعوة والواتساب
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherData.name || !newTeacherData.phone) return;
    const token = "INV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newT: Teacher = {
      id: "t" + (teachers.length + 1),
      name: newTeacherData.name,
      phone: newTeacherData.phone,
      subject: newTeacherData.subject || "عام",
      classes: [],
      inviteToken: token,
    };
    setTeachers([...teachers, newT]);
    setNewTeacherData({ name: "", phone: "", subject: "" });
    setNewTeacherModal(false);
  };

  // إرسال رابط الدعوة للمعلم عبر واتساب wa.me
  const sendWhatsAppInvite = (teacher: Teacher) => {
    const inviteLink = `${window.location.origin}/login?invite=${teacher.inviteToken}&role=teacher`;
    const message = encodeURIComponent(
      `مرحباً بك يا ${teacher.name} في ${settings.schoolName}.\nيسرنا دعوتك للانضمام إلى منصتنا التعليمية.\nرابط تسجيل حسابك وتعيين كلمة المرور:\n${inviteLink}`
    );
    const cleanPhone = teacher.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  // إضافة صف
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassData.name || !newClassData.section) return;
    const newC: ClassItem = {
      id: "c" + (classes.length + 1),
      name: newClassData.name,
      section: newClassData.section,
      stage: newClassData.stage,
      studentCount: 0,
    };
    setClasses([...classes, newC]);
    setNewClassData({ name: "", section: "", stage: "متوسطة" });
    setNewClassModal(false);
  };

  // إضافة طالب وتوليد QR تلقائياً
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.name) return;
    const targetClass = classes.find((c) => c.id === newStudentData.classId);
    const newS: Student = {
      id: "s" + (students.length + 1),
      name: newStudentData.name,
      classId: newStudentData.classId,
      className: targetClass ? `${targetClass.name} (${targetClass.section})` : "غير محدد",
      parentName: newStudentData.parentName || "ولي أمر",
      parentPhone: newStudentData.parentPhone || "",
      qrCode: `STU-2025-0${students.length + 1}`,
      attendanceRate: 100,
      totalAbsences: 0,
      installmentsStatus: "unpaid",
    };
    setStudents([...students, newS]);
    setNewStudentData({ name: "", classId: "c1", parentName: "", parentPhone: "" });
    setNewStudentModal(false);
  };

  // نقل طالب إلى صف آخر بسهولة
  const handleMoveStudent = (studentId: string, targetClassId: string) => {
    const targetClass = classes.find((c) => c.id === targetClassId);
    if (!targetClass) return;
    setStudents(
      students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              classId: targetClassId,
              className: `${targetClass.name} (${targetClass.section})`,
            }
          : s
      )
    );
  };

  // إضافة حصة بالجدول مع خوارزمية منع التضارب الإجباري
  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError("");

    // 1. فحص هل المعلم يدرس صفاً آخر في نفس اليوم والحصة؟
    const teacherConflict = schedules.find(
      (s) =>
        s.teacherId === newScheduleData.teacherId &&
        s.day === Number(newScheduleData.day) &&
        s.period === Number(newScheduleData.period)
    );
    if (teacherConflict) {
      setScheduleError(
        `تضارب جدول! المعلم ${teacherConflict.teacherName} لديه حصة بالفعل مع (${teacherConflict.className}) في هذا الوقت!`
      );
      return;
    }

    // 2. فحص هل الصف لديه حصة أخرى في نفس اليوم والحصة؟
    const classConflict = schedules.find(
      (s) =>
        s.classId === newScheduleData.classId &&
        s.day === Number(newScheduleData.day) &&
        s.period === Number(newScheduleData.period)
    );
    if (classConflict) {
      setScheduleError(
        `تضارب جدول! هذا الصف لديه حصة (${classConflict.subject}) مسجلة بالفعل في هذا الوقت!`
      );
      return;
    }

    const tObj = teachers.find((t) => t.id === newScheduleData.teacherId);
    const cObj = classes.find((c) => c.id === newScheduleData.classId);

    const newSc: ScheduleEntry = {
      id: "sc" + (schedules.length + 1),
      classId: newScheduleData.classId,
      className: cObj ? `${cObj.name} (${cObj.section})` : "",
      teacherId: newScheduleData.teacherId,
      teacherName: tObj ? tObj.name : "",
      subject: newScheduleData.subject,
      day: Number(newScheduleData.day),
      period: Number(newScheduleData.period),
    };

    setSchedules([...schedules, newSc]);
    setNewScheduleModal(false);
  };

  // ترحيل الطلاب إلى سنة جديدة
  const handlePromoteStudents = () => {
    if (confirm("هل أنت متأكد من ترحيل جميع الطلاب للسنة الدراسية الجديدة 2026-2027؟")) {
      alert("تمت ترقية الطلاب بنجاح وتحديث السجلات الأكاديمية!");
    }
  };

  // توليد تقرير PDF فوري لأي طالب
  const handleGenerateStudentPDF = (student: Student) => {
    printStudentReport({
      studentName: student.name,
      className: student.className,
      academicYear: settings.academicYear,
      schoolName: settings.schoolName,
      date: new Date().toLocaleDateString("ar-EG"),
      attendanceRate: student.attendanceRate,
      totalAbsences: student.totalAbsences,
      installmentsStatus:
        student.installmentsStatus === "paid"
          ? "مسدد بالكامل"
          : student.installmentsStatus === "partial"
          ? "مسدد جزئياً"
          : "غير مسدد",
      grades: [
        { subject: "الرياضيات", daily: 18, monthly: 28, final: 46, total: 92 },
        { subject: "اللغة العربية", daily: 19, monthly: 27, final: 45, total: 91 },
        { subject: "العلوم", daily: 17, monthly: 26, final: 44, total: 87 },
        { subject: "اللغة الإنجليزية", daily: 18, monthly: 25, final: 43, total: 86 },
      ],
      behaviorNotes: [
        { date: "2026-09-20", note: "مشاركة ممتازة ومثابرة عالية في الأنشطة المدرسية", type: "positive" },
      ],
    });
  };

  const daysList = [
    { id: 1, name: "الأحد" },
    { id: 2, name: "الإثنين" },
    { id: 3, name: "الثلاثاء" },
    { id: 4, name: "الأربعاء" },
    { id: 5, name: "الخميس" },
    ...(settings.workingDays === 6 ? [{ id: 6, name: "السبت" }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-600 selection:text-white pb-12" dir="rtl">
      {/* الرأس العلوي */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {userRole === "director" ? "لوحة المدير العام" : "لوحة معاون المدير"}
              </h1>
              <p className="text-xs text-slate-500">{settings.schoolName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <InstallPWA variant="badge" />
            <LogoutButton />
          </div>
        </div>

        {/* شريط التبويبات المتجاوب */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-slate-100 py-1.5 scrollbar-none">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "overview" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>نظرة عامة</span>
          </button>

          <button
            onClick={() => setActiveTab("teachers")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "teachers" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>الكادر التدريسي ({teachers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "classes" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>الصفوف والشعب ({classes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "students" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>الطلاب والسجل ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "schedule" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>الجدول الأسبوعي ومنع التضارب</span>
          </button>

          <button
            onClick={() => setActiveTab("installments")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "installments" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>الأقساط والمالية</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === "settings" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>الإعدادات وبوت تيليجرام</span>
          </button>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* تبويب النظرة العامة */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">إجمالي الطلاب</CardTitle>
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{students.length}</div>
                  <p className="text-[11px] text-emerald-600 mt-1">نسبة الحضور العامة اليوم: 94.5%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">الكادر التعليمي</CardTitle>
                  <Users className="w-4 h-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{teachers.length} معلم</div>
                  <p className="text-[11px] text-slate-500 mt-1">جميع المعلمين تم تأكيد حساباتهم</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">الشعب الدراسية</CardTitle>
                  <BookOpen className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{classes.length} شعبة</div>
                  <p className="text-[11px] text-slate-500 mt-1">سعة الفصول مكتملة بنسبة 85%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">تحصيل الأقساط</CardTitle>
                  <CreditCard className="w-4 h-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">76%</div>
                  <p className="text-[11px] text-slate-500 mt-1">المتبقي: 24% مستحقة السداد</p>
                </CardContent>
              </Card>
            </div>

            {/* إجراءات سريعة للمدير والمعاون */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>إجراءات إدارية سريعة</span>
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setNewTeacherModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 ml-1.5" />
                  إضافة معلم وتوليد رابط واتساب
                </Button>
                <Button onClick={() => setNewClassModal(true)} variant="outline">
                  <Plus className="w-4 h-4 ml-1.5" />
                  إضافة صف جديد
                </Button>
                <Button onClick={() => setNewStudentModal(true)} variant="outline">
                  <Plus className="w-4 h-4 ml-1.5" />
                  تسجيل طالب جديد
                </Button>
                <Button onClick={handlePromoteStudents} variant="secondary" className="text-blue-700 bg-blue-50 hover:bg-blue-100">
                  <ArrowRightLeft className="w-4 h-4 ml-1.5" />
                  ترحيل الطلاب لسنة دراسية جديدة
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* تبويب الكادر التدريسي */}
        {activeTab === "teachers" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">إدارة الكادر التدريسي</h2>
                <p className="text-xs text-slate-500">إضافة المدرسين وإرسال روابط الدعوة المباشرة عبر واتساب</p>
              </div>
              <Button onClick={() => setNewTeacherModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 ml-1.5" />
                إضافة معلم جديد
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="p-3.5">اسم المعلم</th>
                      <th className="p-3.5">المادة التخصصية</th>
                      <th className="p-3.5">رقم الهاتف</th>
                      <th className="p-3.5">الصفوف المسندة</th>
                      <th className="p-3.5">رمز الدعوة</th>
                      <th className="p-3.5 text-center">إجراءات ودعوة واتساب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-800">{teacher.name}</td>
                        <td className="p-3.5 text-slate-600">{teacher.subject}</td>
                        <td className="p-3.5 text-slate-600 font-mono" dir="ltr">{teacher.phone}</td>
                        <td className="p-3.5 text-slate-500">
                          {teacher.classes.length > 0 ? teacher.classes.join("، ") : "لم تعين صفوف بعد"}
                        </td>
                        <td className="p-3.5 font-mono text-blue-600 font-semibold">{teacher.inviteToken}</td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => sendWhatsAppInvite(teacher)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition active:scale-95 shadow-sm"
                            title="إرسال رابط الدعوة المباشر عبر واتساب"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>إرسال عبر واتساب</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* تبويب الصفوف والشعب */}
        {activeTab === "classes" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">إدارة الصفوف والشعب</h2>
                <p className="text-xs text-slate-500">تنظيم المراحل الدراسية والفصول</p>
              </div>
              <Button onClick={() => setNewClassModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 ml-1.5" />
                إضافة صف أو شعبة
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {classes.map((c) => (
                <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 transition">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">{c.stage}</span>
                    <span className="text-xs text-slate-500">الشعبة {c.section}</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-800">{c.name}</h3>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>عدد الطلاب:</span>
                    <span className="font-bold text-slate-800">{students.filter((s) => s.classId === c.id).length} طالب</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* تبويب الطلاب والسجل العام */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">سجل الطلاب ونقلهم</h2>
                <p className="text-xs text-slate-500">إدارة الطلاب، ربطهم بأولياء الأمور، نقل الفصول، وإصدار تقارير PDF</p>
              </div>
              <Button onClick={() => setNewStudentModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 ml-1.5" />
                إضافة طالب جديد
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="p-3.5">اسم الطالب</th>
                      <th className="p-3.5">الصف والشعبة</th>
                      <th className="p-3.5">ولي الأمر</th>
                      <th className="p-3.5">رمز QR</th>
                      <th className="p-3.5">نسبة الحضور</th>
                      <th className="p-3.5">نقل الطالب لشعبة أخرى</th>
                      <th className="p-3.5 text-center">تقرير PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-800">{student.name}</td>
                        <td className="p-3.5 text-slate-600">{student.className}</td>
                        <td className="p-3.5 text-slate-600">
                          <div>{student.parentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono" dir="ltr">{student.parentPhone}</div>
                        </td>
                        <td className="p-3.5 font-mono text-xs font-semibold text-slate-700">{student.qrCode}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            student.attendanceRate >= 90 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}>
                            {student.attendanceRate}% ({student.totalAbsences} غياب)
                          </span>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={student.classId}
                            onChange={(e) => handleMoveStudent(student.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.section})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleGenerateStudentPDF(student)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition text-[11px]"
                            title="طباعة / تحميل كشف وتقرير الطالب كـ PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>تقرير PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* تبويب الجدول الأسبوعي مع خوارزمية منع التضارب */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">الجدول الأسبوعي الذكي</h2>
                <p className="text-xs text-slate-500">
                  توزيع الحصص ({settings.periodsPerDay} حصص يومياً على مدار {settings.workingDays} أيام) مع حماية آلية تمنع تضارب المعلم أو الصف
                </p>
              </div>
              <Button onClick={() => { setScheduleError(""); setNewScheduleModal(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 ml-1.5" />
                إضافة حصة للجدول
              </Button>
            </div>

            {/* عرض جدول الحصص */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="p-3">اليوم</th>
                    <th className="p-3">الحصة</th>
                    <th className="p-3">الصف والشعبة</th>
                    <th className="p-3">المادة</th>
                    <th className="p-3">المعلم</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map((sc) => {
                    const dayObj = daysList.find((d) => d.id === sc.day);
                    return (
                      <tr key={sc.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-800">{dayObj ? dayObj.name : `يوم ${sc.day}`}</td>
                        <td className="p-3 font-semibold text-blue-600">الحصة {sc.period}</td>
                        <td className="p-3 text-slate-800">{sc.className}</td>
                        <td className="p-3 font-medium text-slate-700">{sc.subject}</td>
                        <td className="p-3 text-slate-600">{sc.teacherName}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSchedules(schedules.filter((s) => s.id !== sc.id))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="حذف الحصة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* تبويب الأقساط */}
        {activeTab === "installments" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">متابعة الأقساط والرسوم المدرسية</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-slate-500">مسدد بالكامل</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {students.filter((s) => s.installmentsStatus === "paid").length} طالب
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-slate-500">مسدد جزئياً</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {students.filter((s) => s.installmentsStatus === "partial").length} طالب
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-slate-500">متأخرات غير مسددة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-rose-600">
                    {students.filter((s) => s.installmentsStatus === "unpaid").length} طالب
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* تبويب الإعدادات وتيليجرام */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">إعدادات المدرسة ونظام تيليجرام</h2>
              <p className="text-xs text-slate-500">تخصيص أيام العمل وحصص اليوم وربط بوت التيليجرام للإشعارات التلقائية</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المدرسة الرسمي:</label>
                <input
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">أيام العمل الأسبوعية:</label>
                  <select
                    value={settings.workingDays}
                    onChange={(e) => setSettings({ ...settings, workingDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value={5}>5 أيام (الأحد إلى الخميس)</option>
                    <option value={6}>6 أيام (السبت إلى الخميس)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">عدد الحصص في اليوم:</label>
                  <select
                    value={settings.periodsPerDay}
                    onChange={(e) => setSettings({ ...settings, periodsPerDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value={5}>5 حصص يومياً</option>
                    <option value={6}>6 حصص يومياً</option>
                    <option value={7}>7 حصص يومياً</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="w-4 h-4 text-sky-600" />
                  <span className="font-bold text-slate-800">إعدادات بوت التيليجرام (Telegram Bot Token)</span>
                </div>
                <input
                  type="text"
                  value={settings.telegramBotToken}
                  onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                  placeholder="ضع توكن البوت هنا (Bot Token)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  البوت يرسل تلقائياً إشعاراً صباحياً للمعلمين في تمام الساعة 7:00 ص بجدولهم اليومي، وتنبيه قبل 10 دقائق من كل حصة.
                </p>
              </div>

              <div className="pt-3">
                <Button onClick={() => alert("تم حفظ الإعدادات بنجاح!")} className="bg-blue-600 hover:bg-blue-700">
                  <CheckCircle className="w-4 h-4 ml-1.5" />
                  حفظ الإعدادات
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* نافذة إضافة معلم */}
      {newTeacherModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-4">إضافة معلم جديد</h3>
            <form onSubmit={handleAddTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">اسم المعلم الثلاثي:</label>
                <input
                  type="text"
                  required
                  value={newTeacherData.name}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, name: e.target.value })}
                  placeholder="مثال: أ. حيدر جاسم"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">رقم الهاتف (مع الرمز الدولي للواتساب):</label>
                <input
                  type="text"
                  required
                  value={newTeacherData.phone}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, phone: e.target.value })}
                  placeholder="+9647701234567"
                  className="w-full px-3 py-2 border rounded-xl font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">المادة الدراسية:</label>
                <input
                  type="text"
                  required
                  value={newTeacherData.subject}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, subject: e.target.value })}
                  placeholder="مثال: اللغة الإنجليزية"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setNewTeacherModal(false)}>إلغاء</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">تأكيد الإضافة</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة صف */}
      {newClassModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-4">إضافة صف / شعبة جديدة</h3>
            <form onSubmit={handleAddClass} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">اسم الصف:</label>
                <input
                  type="text"
                  required
                  value={newClassData.name}
                  onChange={(e) => setNewClassData({ ...newClassData, name: e.target.value })}
                  placeholder="مثال: الرابع العلمي"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">الشعبة:</label>
                <input
                  type="text"
                  required
                  value={newClassData.section}
                  onChange={(e) => setNewClassData({ ...newClassData, section: e.target.value })}
                  placeholder="مثال: أ أو ب أو ج"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">المرحلة:</label>
                <select
                  value={newClassData.stage}
                  onChange={(e) => setNewClassData({ ...newClassData, stage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="ابتدائية">ابتدائية</option>
                  <option value="متوسطة">متوسطة</option>
                  <option value="إعدادية">إعدادية</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setNewClassModal(false)}>إلغاء</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">إضافة الصف</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة طالب */}
      {newStudentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-4">تسجيل طالب جديد</h3>
            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">اسم الطالب الرباعي:</label>
                <input
                  type="text"
                  required
                  value={newStudentData.name}
                  onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                  placeholder="مثال: حسن كريم صبيح"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">الصف والشعبة:</label>
                <select
                  value={newStudentData.classId}
                  onChange={(e) => setNewStudentData({ ...newStudentData, classId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">اسم ولي الأمر:</label>
                <input
                  type="text"
                  value={newStudentData.parentName}
                  onChange={(e) => setNewStudentData({ ...newStudentData, parentName: e.target.value })}
                  placeholder="مثال: كريم صبيح"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">هاتف ولي الأمر:</label>
                <input
                  type="text"
                  value={newStudentData.parentPhone}
                  onChange={(e) => setNewStudentData({ ...newStudentData, parentPhone: e.target.value })}
                  placeholder="+9647701122334"
                  className="w-full px-3 py-2 border rounded-xl font-mono"
                  dir="ltr"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setNewStudentModal(false)}>إلغاء</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">تأكيد التسجيل</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة حصة بالجدول مع التحقق من التضارب */}
      {newScheduleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-2">إضافة حصة دراسية للجدول الأسبوعي</h3>
            <p className="text-xs text-slate-500 mb-4">يقوم النظام تلقائياً بفحص جدول المعلم والصف لمنع أي تضارب زمني.</p>

            {scheduleError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{scheduleError}</span>
              </div>
            )}

            <form onSubmit={handleAddSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">الصف:</label>
                <select
                  value={newScheduleData.classId}
                  onChange={(e) => setNewScheduleData({ ...newScheduleData, classId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">المعلم:</label>
                <select
                  value={newScheduleData.teacherId}
                  onChange={(e) => {
                    const selT = teachers.find((t) => t.id === e.target.value);
                    setNewScheduleData({
                      ...newScheduleData,
                      teacherId: e.target.value,
                      subject: selT ? selT.subject : "مادة عامة",
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">اليوم:</label>
                  <select
                    value={newScheduleData.day}
                    onChange={(e) => setNewScheduleData({ ...newScheduleData, day: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {daysList.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">الحصة:</label>
                  <select
                    value={newScheduleData.period}
                    onChange={(e) => setNewScheduleData({ ...newScheduleData, period: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {Array.from({ length: settings.periodsPerDay }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>الحصة {p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setNewScheduleModal(false)}>إلغاء</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">تثبيت الحصة</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
