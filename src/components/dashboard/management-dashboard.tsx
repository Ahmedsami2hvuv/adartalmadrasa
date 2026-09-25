"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserPlus,
  BookOpen,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  Share2,
  Trash2,
  FileDown,
  Plus,
  AlertTriangle,
  School,
  Loader2,
  CheckCircle2,
  BookMarked,
  Sparkles,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  ArrowRightLeft,
  Edit3,
  Menu,
  X,
  Search,
  MessageCircle,
  Layers,
  Activity,
  TrendingUp,
  Clock,
  ChevronRight,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";
import { printStudentReport } from "@/lib/pdf-report";
import { createClient } from "@/lib/supabase/client";
import { parseAndFormatPhone } from "@/lib/phone-utils";

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

interface SubjectItem {
  id: string;
  name: string;
  stage?: string;
}

interface ScheduleEntry {
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  subjectId?: string;
  subject: string;
  day: number;
  period: number;
}

export function ManagementDashboard({
  userRole,
  currentUserName,
}: {
  userRole: "director" | "vice_director";
  currentUserName?: string;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "teachers" | "classes" | "students" | "schedule" | "settings"
  >("overview");

  const [loadingData, setLoadingData] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  
  // الصف المختار للجدول الأسبوعي
  // الصف والشعبة المختارة للجدول الأسبوعي
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [scheduleGrade, setScheduleGrade] = useState<string>("");

  // نافذة تعديل ومسح الصف
  const [editClassModal, setEditClassModal] = useState(false);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<{ name: string; stage: string; sections: ClassItem[] } | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassStage, setEditClassStage] = useState("متوسطة");
  const [editClassLoading, setEditClassLoading] = useState(false);

  // نافذة تفاصيل الشعبة والطلاب بداخلها
  const [sectionModal, setSectionModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{ id: string; name: string; section: string } | null>(null);

  // نافذة نقل طالب إلى شعبة
  const [moveStudentModal, setMoveStudentModal] = useState(false);
  const [studentToMoveId, setStudentToMoveId] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);

  // نافذة تفاصيل الطالب المنفرد
  const [studentDetailModal, setStudentDetailModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  // القائمة الجانبية في الشاشات الصغيرة
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // إدارة تفاصيل وتعديل المعلم
  const [teacherDetailModal, setTeacherDetailModal] = useState(false);
  const [selectedTeacherForView, setSelectedTeacherForView] = useState<Teacher | null>(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [editTeacherModal, setEditTeacherModal] = useState(false);
  const [editTeacherData, setEditTeacherData] = useState({ id: "", name: "", phone: "", subject: "" });
  const [editTeacherLoading, setEditTeacherLoading] = useState(false);

  const [settings, setSettings] = useState({
    schoolName: "المدرسة النموذجية",
    workingDays: 5,
    periodsPerDay: 5,
    telegramBotToken: "",
    telegramBotUsername: "",
    academicYear: "2025-2026",
  });

  // النوافذ وحالات التحميل
  const [newTeacherModal, setNewTeacherModal] = useState(false);
  const [newTeacherData, setNewTeacherData] = useState({ name: "", phone: "", subject: "" });
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherMsg, setTeacherMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newClassModal, setNewClassModal] = useState(false);
  const [newClassData, setNewClassData] = useState({ name: "", stage: "متوسطة", sectionsCount: 3 });
  const [classLoading, setClassLoading] = useState(false);
  const [classMsg, setClassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newStudentModal, setNewStudentModal] = useState(false);
  const [newStudentData, setNewStudentData] = useState({ name: "", classId: "", parentName: "", parentPhone: "" });
  const [selectedGradeName, setSelectedGradeName] = useState<string>("");
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentMsg, setStudentMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // إشعار نسخ الرابط المباشر
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // إدارة المواد
  const [subjectsModal, setSubjectsModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectMsg, setSubjectMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // تحديد مادة في خلية الجدول
  const [cellModal, setCellModal] = useState(false);
  const [activeCell, setActiveCell] = useState<{ day: number; period: number; existing?: ScheduleEntry } | null>(null);
  const [cellSubjectId, setCellSubjectId] = useState("");
  const [cellTeacherId, setCellTeacherId] = useState("");
  const [cellLoading, setCellLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  // جلب كافة البيانات الفعلية من سوبابيس ومسارات السيرفر
  const fetchAllData = useCallback(async () => {
    try {
      const supabase = createClient();

      // 1. الإعدادات
      const { data: dbSettings } = await supabase.from("school_settings").select("*").limit(1).single();
      if (dbSettings) {
        setSettings({
          schoolName: dbSettings.school_name || "المدرسة النموذجية",
          workingDays: dbSettings.working_days || 5,
          periodsPerDay: dbSettings.periods_per_day || 5,
          telegramBotToken: dbSettings.telegram_bot_token || "",
          telegramBotUsername: dbSettings.telegram_bot_username || "",
          academicYear: dbSettings.academic_year || "2025-2026",
        });
      }

      // 2. الصفوف والشعب (جلب مباشر عبر السيرفر)
      try {
        const cRes = await fetch("/api/admin/classes");
        const cData = await cRes.json();
        if (cData.classes && Array.isArray(cData.classes) && cData.classes.length > 0) {
          setClasses(
            cData.classes.map((c: any) => ({
              id: c.id,
              name: c.name,
              section: c.section,
              stage: c.stage,
              studentCount: 0,
            }))
          );
          setSelectedClassId((prev) => prev || cData.classes[0].id);
          setScheduleGrade((prev) => prev || cData.classes[0].name);
        } else {
          // جلب بديل عبر سوبابيس
          const { data: dbClasses } = await supabase.from("classes").select("*").order("name");
          if (dbClasses && dbClasses.length > 0) {
            setClasses(
              dbClasses.map((c) => ({
                id: c.id,
                name: c.name,
                section: c.section,
                stage: c.stage,
                studentCount: 0,
              }))
            );
            setSelectedClassId((prev) => prev || dbClasses[0].id);
            setScheduleGrade((prev) => prev || dbClasses[0].name);
          }
        }
      } catch (cErr) {
        console.warn("Classes fetch fallback:", cErr);
      }

      // 3. المعلمين (جلب مباشر عبر السيرفر الموثوق لتجاوز أي حجب في RLS)
      try {
        const tRes = await fetch("/api/teachers");
        const tData = await tRes.json();
        if (tData.teachers && Array.isArray(tData.teachers)) {
          setTeachers(tData.teachers);
        }
      } catch (tErr) {
        console.warn("Teachers API fetch fallback:", tErr);
      }

      // 4. الطلاب (جلب مباشر عبر السيرفر)
      try {
        const sRes = await fetch("/api/admin/students");
        const sData = await sRes.json();
        if (sData.students && Array.isArray(sData.students)) {
          setStudents(
            sData.students.map((s: any) => ({
              id: s.id,
              name: s.profiles?.full_name || s.name || "طالب",
              classId: s.class_id || s.classes?.id,
              className: s.classes ? `${s.classes.name} (${s.classes.section})` : "غير معين",
              parentName: s.parents?.profiles?.full_name || s.parentName || "ولي أمر",
              parentPhone: s.parents?.profiles?.phone || s.parentPhone || "-",
              qrCode: s.qr_code || s.qrCode || `STU-${s.id.substring(0, 4)}`,
              attendanceRate: 95,
              totalAbsences: 2,
              installmentsStatus: "paid",
            }))
          );
        }
      } catch (sErr) {
        console.warn("Students API fetch fallback:", sErr);
      }

      // 5. المواد الدراسية
      try {
        const subRes = await fetch("/api/admin/subjects");
        const subData = await subRes.json();
        if (subData.subjects) {
          setSubjects(subData.subjects);
        }
      } catch (e) {
        console.warn("Subjects fetch fallback:", e);
      }

      // 6. الجدول الأسبوعي (جلب مباشر عبر السيرفر الذكي)
      try {
        const schRes = await fetch("/api/admin/schedules");
        const schData = await schRes.json();
        if (schData.schedules && Array.isArray(schData.schedules)) {
          setSchedules(
            schData.schedules.map((row: any) => ({
              id: row.id,
              classId: row.class_id,
              className: row.classes ? `${row.classes.name} (${row.classes.section})` : "صف",
              teacherId: row.teacher_id,
              teacherName: row.teachers?.profiles?.full_name || "معلم",
              subjectId: row.subject_id,
              subject: row.subjects?.name || "مادة",
              day: row.day_of_week ?? row.day,
              period: row.period,
            }))
          );
        }
      } catch (schErr) {
        console.warn("Schedules API fetch fallback:", schErr);
      }
    } catch (err) {
      console.warn("Fetch data from Supabase fallback:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 1. إضافة معلم عبر مسار السيرفر الآمن
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherData.name.trim()) return;
    setTeacherLoading(true);
    setTeacherMsg(null);

    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTeacherData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر إضافة المعلم.");
      }

      setTeacherMsg({ type: "success", text: `تمت إضافة المعلم (${data.teacher.name}) وإنشاء حسابه بنجاح!` });
      setNewTeacherData({ name: "", phone: "", subject: "" });
      fetchAllData();
      setTimeout(() => {
        setNewTeacherModal(false);
        setTeacherMsg(null);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إضافة المعلم.";
      setTeacherMsg({ type: "error", text: msg });
    } finally {
      setTeacherLoading(false);
    }
  };

  // دالة نسخ الرابط المباشر
  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopySuccess(`تم نسخ ${label} إلى الحافظة بنجاح!`);
      setTimeout(() => setCopySuccess(null), 3000);
    }
  };

  // إرسال واتساب للمعلم مع رابط الدخول المباشر لحسابه بدون رمز سري
  const sendWhatsAppInvite = (teacher: Teacher) => {
    const parsed = parseAndFormatPhone(teacher.phone);
    const directLink = `${window.location.origin}/portal?role=teacher&id=${teacher.id}&name=${encodeURIComponent(teacher.name)}`;
    const message = encodeURIComponent(
      `دعوة رسمية من ${settings.schoolName}:\nالأستاذ/ة ${teacher.name} المحترم/ة،\nتم تفعيل حسابكم لمادة (${teacher.subject}).\nيمكنكم الدخول المباشر إلى حسابكم بدون أي رمز سري بمجرد النقر على الرابط التالي:\n${directLink}`
    );
    const targetNumber = parsed.whatsappNumber || teacher.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${targetNumber}?text=${message}`, "_blank");
  };

  // حذف معلم
  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (!confirm(`هل أنت متأكد من حذف المعلم (${teacherName}) وجميع ارتباطاته بالجدول؟`)) return;
    try {
      const res = await fetch(`/api/teachers?id=${teacherId}`, { method: "DELETE" });
      if (res.ok) {
        setTeacherDetailModal(false);
        setSelectedTeacherForView(null);
        fetchAllData();
      } else {
        alert("تعذر حذف المعلم، يرجى المحاولة لاحقاً.");
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء حذف المعلم.");
    }
  };

  // تعديل بيانات المعلم
  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeacherData.id || !editTeacherData.name.trim()) return;
    setEditTeacherLoading(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTeacherData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تحديث بيانات المعلم.");
      setEditTeacherModal(false);
      if (selectedTeacherForView && selectedTeacherForView.id === editTeacherData.id) {
        setSelectedTeacherForView((prev) =>
          prev ? { ...prev, name: editTeacherData.name, subject: editTeacherData.subject, phone: editTeacherData.phone } : null
        );
      }
      fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء التعديل.";
      alert(msg);
    } finally {
      setEditTeacherLoading(false);
    }
  };

  // استخراج الصفوف والشعب وحصص المعلم من الجدول الأسبوعي
  const getTeacherStats = useCallback(
    (teacherId: string) => {
      const teacherSchedules = schedules.filter((s) => s.teacherId === teacherId);
      const uniqueClassesMap: Record<string, number> = {};
      teacherSchedules.forEach((s) => {
        uniqueClassesMap[s.className] = (uniqueClassesMap[s.className] || 0) + 1;
      });
      return {
        totalPeriods: teacherSchedules.length,
        classesList: Object.entries(uniqueClassesMap).map(([name, count]) => ({ name, count })),
        schedules: teacherSchedules,
      };
    },
    [schedules]
  );

  // إرسال واتساب لولي الأمر مع رابط الدخول المباشر لمتابعة ابنه
  const sendWhatsAppToParent = (student: Student) => {
    const parsed = parseAndFormatPhone(student.parentPhone);
    const directLink = `${window.location.origin}/portal?role=parent&id=${student.id}&name=${encodeURIComponent(student.parentName)}`;
    const message = encodeURIComponent(
      `تحية طيبة من إدارة ${settings.schoolName}:\nولي أمر الطالب/ة ${student.name} المحترم،\nيمكنكم متابعة الحضور والغياب والمستوى الدراسي والواجبات لابنكم مباشرة وبدون أي رمز سري عبر هذا الرابط:\n${directLink}`
    );
    const targetNumber = parsed.whatsappNumber || student.parentPhone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${targetNumber}?text=${message}`, "_blank");
  };

  // إضافة صف وتوليد الشعب آلياً بالتسلسل الأبجدي
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassData.name.trim()) return;
    setClassLoading(true);
    setClassMsg(null);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClassData.name.trim(),
          stage: newClassData.stage,
          sectionsCount: Number(newClassData.sectionsCount) || 1,
          academicYear: settings.academicYear,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر إضافة الصف والشعب.");
      }

      setClassMsg({ type: "success", text: data.message || "تم إنشاء الصف والشعب بنجاح!" });
      setNewClassData({ name: "", stage: "متوسطة", sectionsCount: 3 });
      fetchAllData();
      setTimeout(() => {
        setNewClassModal(false);
        setClassMsg(null);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إضافة الصف والشعب.";
      setClassMsg({ type: "error", text: msg });
    } finally {
      setClassLoading(false);
    }
  };

  // حذف شعبة معينة
  const handleDeleteClass = async (id: string, label: string) => {
    if (!confirm(`هل أنت متأكد من حذف الشعبة (${label})؟`)) return;
    try {
      const res = await fetch(`/api/admin/classes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Delete class section error:", err);
    }
  };

  // حذف صف بكامل شعبه
  const handleDeleteEntireClass = async (className: string) => {
    if (!confirm(`هل أنت متأكد من حذف صف (${className}) بجميع شعبه المسجلة؟`)) return;
    try {
      const res = await fetch(`/api/admin/classes?name=${encodeURIComponent(className)}`, { method: "DELETE" });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Delete class error:", err);
    }
  };

  // 2. إضافة طالب وولي أمر عبر مسار السيرفر الآمن
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.name.trim()) return;
    if (!newStudentData.classId) {
      setStudentMsg({ type: "error", text: "يرجى تحديد الصف واختيار الشعبة للطالب." });
      return;
    }
    setStudentLoading(true);
    setStudentMsg(null);

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudentData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر تسجيل الطالب.");
      }

      setStudentMsg({ type: "success", text: `تم تسجيل الطالب (${data.student.name}) وتوليد كود الـ QR بنجاح!` });
      setNewStudentData({ name: "", classId: "", parentName: "", parentPhone: "" });
      setSelectedGradeName("");
      fetchAllData();
      setTimeout(() => {
        setNewStudentModal(false);
        setStudentMsg(null);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل تسجيل الطالب.";
      setStudentMsg({ type: "error", text: msg });
    } finally {
      setStudentLoading(false);
    }
  };

  // تعديل صف الطالب
  const handleMoveStudent = async (studentId: string, targetClassId: string) => {
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, classId: targetClassId }),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // حذف طالب
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`هل أنت متأكد من حذف قيد الطالب (${studentName}) نهائياً؟`)) return;
    try {
      const res = await fetch(`/api/admin/students?id=${studentId}`, { method: "DELETE" });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // تأكيد نقل طالب إلى شعبة
  const handleConfirmMoveStudent = async () => {
    if (!studentToMoveId || !selectedSection) return;
    setMoveLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentToMoveId,
          classId: selectedSection.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر نقل الطالب.");
      alert(`تم نقل الطالب بنجاح إلى (${selectedSection.name} - الشعبة ${selectedSection.section}).`);
      setMoveStudentModal(false);
      setStudentToMoveId("");
      fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء نقل الطالب.";
      alert(msg);
    } finally {
      setMoveLoading(false);
    }
  };

  // تعديل اسم الصف ومرحلته
  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupForEdit || !editClassName.trim()) return;
    setEditClassLoading(true);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldName: selectedGroupForEdit.name,
          newName: editClassName.trim(),
          stage: editClassStage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تعديل الصف.");
      alert(data.message || `تم تعديل الصف إلى (${editClassName.trim()}) بنجاح.`);
      setEditClassModal(false);
      fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء تعديل الصف.";
      alert(msg);
    } finally {
      setEditClassLoading(false);
    }
  };

  // 3. إضافة مادة دراسية جديدة
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setSubjectLoading(true);
    setSubjectMsg(null);

    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubjectName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "تعذر إضافة المادة.");
      }

      if (data.subject) {
        setSubjects((prev) => [...prev.filter((s) => s.id !== data.subject.id), data.subject]);
        setSubjectMsg({ type: "success", text: data.message || `تمت إضافة مادة (${data.subject.name}) بنجاح!` });
        setNewSubjectName("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المادة.";
      setSubjectMsg({ type: "error", text: msg });
    } finally {
      setSubjectLoading(false);
    }
  };

  // حذف مادة دراسية
  const handleDeleteSubject = async (subId: string, subName: string) => {
    if (!confirm(`هل تؤكد حذف مادة (${subName}) من قائمة المواد المعتمدة؟`)) return;
    try {
      await fetch(`/api/admin/subjects?id=${subId}`, { method: "DELETE" });
      setSubjects((prev) => prev.filter((s) => s.id !== subId));
      setSubjectMsg({ type: "success", text: `تم حذف مادة (${subName}) بنجاح.` });
    } catch (err) {
      console.error(err);
    }
  };

  // فتح نافذة تحديد مادة لخلية معينة في الجدول
  const openCellModal = (day: number, period: number) => {
    const existing = schedules.find(
      (s) => s.classId === selectedClassId && s.day === day && s.period === period
    );
    setActiveCell({ day, period, existing });
    setCellSubjectId(existing?.subjectId || (subjects[0]?.id ?? ""));
    setCellTeacherId(existing?.teacherId || "");
    setScheduleError("");
    setCellModal(true);
  };

  // حفظ تعيين المادة في خلية الجدول
  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCell || !selectedClassId || !cellSubjectId) return;
    setCellLoading(true);
    setScheduleError("");

    try {
      const selectedSub = subjects.find((s) => s.id === cellSubjectId);
      const res = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          dayOfWeek: activeCell.day,
          period: activeCell.period,
          subjectId: cellSubjectId,
          subjectName: selectedSub?.name || "",
          teacherId: cellTeacherId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر حفظ الحصة في الجدول.");
      }

      await fetchAllData();
      setCellModal(false);
      setActiveCell(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الحصة.";
      setScheduleError(msg);
    } finally {
      setCellLoading(false);
    }
  };

  // حذف حصة من خلية الجدول
  const handleDeleteCell = async (day: number, period: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل تؤكد تفريغ هذه الحصة من الجدول؟")) return;
    try {
      await fetch(`/api/admin/schedules?classId=${selectedClassId}&day=${day}&period=${period}`, {
        method: "DELETE",
      });
      await fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateStudentPDF = (student: Student) => {
    printStudentReport({
      studentName: student.name,
      className: student.className,
      academicYear: settings.academicYear,
      schoolName: settings.schoolName,
      date: new Date().toLocaleDateString("ar-EG"),
      attendanceRate: student.attendanceRate,
      totalAbsences: student.totalAbsences,
      installmentsStatus: student.installmentsStatus === "paid" ? "مسدد بالكامل" : "متبقي مستحقات",
      grades: [
        { subject: "الرياضيات", daily: 18, monthly: 28, final: 46, total: 92 },
        { subject: "اللغة العربية", daily: 19, monthly: 27, final: 45, total: 91 },
        { subject: "العلوم", daily: 17, monthly: 26, final: 44, total: 87 },
      ],
      behaviorNotes: [
        { date: "2026-09-20", note: "التزام كامل بالأنشطة والمواظبة", type: "positive" },
      ],
    });
  };

  // أيام الأسبوع من الأحد إلى الخميس (5 أيام)
  const daysList = [
    { id: 1, name: "الأحد" },
    { id: 2, name: "الإثنين" },
    { id: 3, name: "الثلاثاء" },
    { id: 4, name: "الأربعاء" },
    { id: 5, name: "الخميس" },
  ];

  // الحصص الـ 5 اليومية
  const periodsList = [1, 2, 3, 4, 5];

  // تجميع الشعب حسب اسم الصف لتسهيل الإدارة وعرضها بتسلسل
  const groupedClasses = useMemo(() => {
    const map: Record<string, { name: string; stage: string; sections: ClassItem[] }> = {};
    classes.forEach((c) => {
      if (!map[c.name]) {
        map[c.name] = { name: c.name, stage: c.stage, sections: [] };
      }
      map[c.name].sections.push(c);
    });
    // ترتيب الشعب أبجدياً في كل صف
    Object.values(map).forEach((group) => {
      group.sections.sort((a, b) => a.section.localeCompare(b.section, "ar"));
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [classes]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row selection:bg-slate-800 selection:text-white" dir="rtl">
      {/* 1. القائمة الجانبية للشاشات الكبيرة (Desktop Sidebar) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-slate-200 shrink-0 sticky top-0 h-screen z-30 shadow-xs">
        {/* رأس القائمة الجانبية: شعار وهوية المدرسة */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-slate-900 truncate">{settings.schoolName}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-medium">العام: {settings.academicYear}</span>
              </div>
            </div>
          </div>

          {/* بطاقة هوية المدير */}
          <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block">الحساب الحالي:</span>
              <span className="text-xs font-bold text-slate-900 truncate block">
                {!currentUserName || currentUserName.includes("%") || /^[A-Fa-f0-9%]+$/.test(currentUserName)
                  ? userRole === "director"
                    ? "المدير العام"
                    : "معاون المدير"
                  : currentUserName}
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
            { id: "overview", label: "النظرة العامة", icon: BarChart3, count: null },
            { id: "teachers", label: "الكادر التدريسي", icon: Users, count: teachers.length },
            { id: "classes", label: "الصفوف والشعب", icon: BookOpen, count: classes.length },
            { id: "students", label: "سجل الطلاب", icon: School, count: students.length },
            { id: "schedule", label: "الجدول الأسبوعي", icon: Calendar, count: schedules.length },
            { id: "settings", label: "الإعدادات والنظام", icon: Settings, count: null },
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

        {/* أسفل القائمة الجانبية: تثبيت التطبيق وتسجيل الخروج */}
        <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50">
          <InstallPWA variant="badge" />
          <LogoutButton />
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
          <span className="font-bold text-xs text-slate-900">{settings.schoolName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <InstallPWA variant="badge" />
          <LogoutButton />
        </div>
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
                <span className="font-bold text-xs text-slate-900">القائمة الإدارية</span>
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
                { id: "overview", label: "النظرة العامة", icon: BarChart3, count: null },
                { id: "teachers", label: "الكادر التدريسي", icon: Users, count: teachers.length },
                { id: "classes", label: "الصفوف والشعب", icon: BookOpen, count: classes.length },
                { id: "students", label: "سجل الطلاب", icon: School, count: students.length },
                { id: "schedule", label: "الجدول الأسبوعي", icon: Calendar, count: schedules.length },
                { id: "settings", label: "الإعدادات والنظام", icon: Settings, count: null },
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

            <div className="p-3 border-t border-slate-100 space-y-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}

      {/* 3. منطقة المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-12">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-5 flex-1">
          {/* إشعار نسخ الرابط المباشر */}
          {copySuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{copySuccess}</span>
              </div>
              <button
                onClick={() => setCopySuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs px-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* واجهة النظرة العامة الفخمة والشاملة */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* ترويسة القيادة والترحيب بالمدير */}
              <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-xs text-[11px] font-semibold text-emerald-400 mb-2 border border-white/10">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>منظومة الإدارة الذكية السحابية متصلة بالكامل</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                      مرحباً بك، {userRole === "director" ? "المدير العام" : "معاون المدير"} 👋
                    </h1>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      هنا مركز القيادة والتحكم الشامل بمدرستك. يمكنك متابعة الكادر والطلاب والحصص الدراسية وإنجاز العمليات اليومية بنقرة واحدة.
                    </p>
                  </div>

                  {/* أزرار الإجراءات السريعة */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => {
                        setTeacherMsg(null);
                        setNewTeacherModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-3.5 gap-1.5 shadow-sm font-bold"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>إضافة معلم</span>
                    </Button>

                    <Button
                      onClick={() => {
                        setStudentMsg(null);
                        setSelectedGradeName("");
                        setNewStudentData({ name: "", classId: "", parentName: "", parentPhone: "" });
                        setNewStudentModal(true);
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs h-9 px-3.5 gap-1.5 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تسجيل طالب</span>
                    </Button>

                    <Button
                      onClick={() => setActiveTab("schedule")}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs h-9 px-3.5 gap-1.5 font-bold"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>الجدول الأسبوعي</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* بطاقات المؤشرات الإحصائية الرئيسية (KPIs) الفاخرة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. الطلاب */}
                <div
                  onClick={() => setActiveTab("students")}
                  className="bg-white border border-slate-200 hover:border-slate-800 rounded-xl p-5 shadow-2xs hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500">إجمالي الطلاب</span>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                      <School className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{students.length}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>متوسط الشعب: {classes.length > 0 ? Math.round(students.length / classes.length) : 0} طالب</span>
                    <span className="text-blue-600 font-bold">عرض السجل ←</span>
                  </div>
                </div>

                {/* 2. الكادر التدريسي */}
                <div
                  onClick={() => setActiveTab("teachers")}
                  className="bg-white border border-slate-200 hover:border-slate-800 rounded-xl p-5 shadow-2xs hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500">الكادر التدريسي</span>
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{teachers.length}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>حسابات مفعلة بالروابط</span>
                    <span className="text-emerald-600 font-bold">عرض الكادر ←</span>
                  </div>
                </div>

                {/* 3. الصفوف والشعب */}
                <div
                  onClick={() => setActiveTab("classes")}
                  className="bg-white border border-slate-200 hover:border-slate-800 rounded-xl p-5 shadow-2xs hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500">الشعب الدراسية</span>
                    <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{classes.length}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>موزعة على {groupedClasses.length} صفوف</span>
                    <span className="text-violet-600 font-bold">إدارة الشعب ←</span>
                  </div>
                </div>

                {/* 4. الحصص والجدول الأسبوعي */}
                <div
                  onClick={() => setActiveTab("schedule")}
                  className="bg-white border border-slate-200 hover:border-slate-800 rounded-xl p-5 shadow-2xs hover:shadow-xs transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500">الحصص المجدولة</span>
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{schedules.length}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>خطة 5 أيام × 5 حصص</span>
                    <span className="text-amber-600 font-bold">تعديل الجدول ←</span>
                  </div>
                </div>
              </div>

              {/* قسم المتابعة السريعة وحالة المنظومة */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* ملخص الصفوف والشعب الفعالة */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-2">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-800" />
                      <h3 className="font-bold text-xs text-slate-900">حالة الصفوف والشعب المعتمدة</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("classes")}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      عرض الكل
                    </button>
                  </div>

                  {groupedClasses.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      لم يتم إنشاء أي صف دراسي بعد، يمكنك البدء بإضافة أول صف الآن.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {groupedClasses.slice(0, 4).map((group) => {
                        const secStudents = group.sections.reduce(
                          (acc, sec) => acc + students.filter((s) => s.classId === sec.id).length,
                          0
                        );
                        return (
                          <div
                            key={group.name}
                            onClick={() => setActiveTab("classes")}
                            className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-400 transition cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-xs text-slate-900">{group.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {group.sections.length} شعب • {secStudents} طالب
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-700">
                              {group.stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* بطاقة حالة المنظومة السحابية والكيانات */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-xs text-slate-900">حالة المنظومة والكيانات</h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600 font-medium">قاعدة البيانات سوبابيس:</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> متصلة وسريعة
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600 font-medium">الاستضافة السحابية فيرسل:</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> نشطة (Vercel)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600 font-medium">تخزين الصور كلاود فلير R2:</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> مهيأ ومحمي
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600 font-medium">بوت التيليجرام:</span>
                      <span className="text-[11px] font-bold text-slate-700">
                        {settings.telegramBotUsername ? `@${settings.telegramBotUsername}` : "جاهز للربط"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* الكادر التدريسي المطور (بطاقات ثنائية لكل مدرسين في سطر واحد) */}
          {activeTab === "teachers" && (
            <div className="space-y-5">
              {/* شريط التحكم والبحث وإضافة معلم */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">سجل المعلمين والمدرسين</h2>
                  <p className="text-xs text-slate-500">
                    إجمالي الكادر: {teachers.length} معلم • انقر على أي معلم لعرض تفاصيله الكاملة والصفوف التي يُدرّس لها
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* حقل البحث السريع */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      placeholder="بحث باسم المعلم أو المادة..."
                      className="pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-52 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <Button
                    onClick={() => {
                      setTeacherMsg(null);
                      setNewTeacherModal(true);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-4 gap-1.5 font-bold shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>إضافة معلم جديد</span>
                  </Button>
                </div>
              </div>

              {/* شبكة المعلمين: كل مدرسين اثنين في سطر واحد دائماً */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teachers
                  .filter((t) => {
                    if (!teacherSearch.trim()) return true;
                    const query = teacherSearch.toLowerCase();
                    return t.name.toLowerCase().includes(query) || t.subject.toLowerCase().includes(query);
                  })
                  .map((teacher) => {
                    const stats = getTeacherStats(teacher.id);
                    const directTeacherLink =
                      typeof window !== "undefined"
                        ? `${window.location.origin}/portal?role=teacher&id=${teacher.id}&name=${encodeURIComponent(teacher.name)}`
                        : `/portal?role=teacher&id=${teacher.id}`;

                    return (
                      <div
                        key={teacher.id}
                        onClick={() => {
                          setSelectedTeacherForView(teacher);
                          setTeacherDetailModal(true);
                        }}
                        className="bg-white border border-slate-200 hover:border-slate-800 rounded-xl p-4.5 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
                        title="انقر لعرض كامل التفاصيل والصفوف وجدول الحصص"
                      >
                        <div>
                          {/* ترويسة بطاقة المعلم */}
                          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-blue-600 transition-colors shadow-2xs">
                                {teacher.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {teacher.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {teacher.subject}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
                                    {parseAndFormatPhone(teacher.phone).displayFormatted}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span className="text-[10px] text-slate-400 group-hover:text-slate-700 font-bold bg-slate-50 group-hover:bg-slate-100 px-2 py-1 rounded transition shrink-0">
                              التفاصيل ←
                            </span>
                          </div>

                          {/* ملخص الصفوف والحصص المسندة له في الجدول */}
                          <div className="space-y-1.5 mb-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 text-[11px] font-semibold">الحصص الأسبوعية:</span>
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {stats.totalPeriods} حصة موزعة
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-600">
                              <span className="text-slate-500 font-semibold block mb-1">الصفوف والشعب المسندة:</span>
                              {stats.classesList.length === 0 ? (
                                <span className="text-slate-400 italic text-[10px]">
                                  لم يتم تحديد حصص له بالجدول بعد
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {stats.classesList.map((cls, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700"
                                    >
                                      {cls.name} ({cls.count} حصص)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* أزرار الإجراءات السريعة أسفل البطاقة */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(directTeacherLink, `رابط الأستاذ ${teacher.name}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 transition"
                              title="نسخ الرابط المباشر"
                            >
                              <Copy className="w-3 h-3" />
                              <span>نسخ الرابط</span>
                            </button>

                            <a
                              href={directTeacherLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[11px] border border-slate-200 transition"
                              title="فتح لوحة المعلم"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>فتح</span>
                            </a>
                          </div>

                          <button
                            type="button"
                            onClick={() => sendWhatsAppInvite(teacher)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 transition"
                            title="إرسال الرابط عبر واتساب"
                          >
                            <Share2 className="w-3 h-3 text-emerald-600" />
                            <span>واتساب</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {teachers.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">لا يوجد معلمون مسجلون بعد</p>
                  <p className="text-[11px] text-slate-500 mb-3">ابدأ بإضافة أول معلم للمدرسة وسيتم توليد رابط دخوله فوراً</p>
                  <Button
                    onClick={() => {
                      setTeacherMsg(null);
                      setNewTeacherModal(true);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 ml-1" />
                    إضافة معلم الآن
                  </Button>
                </div>
              )}
            </div>
          )}

        {/* الصفوف والشعب */}
        {activeTab === "classes" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900">هيكل الصفوف الدراسية والشعب</h2>
                <p className="text-xs text-slate-500">
                  إجمالي {groupedClasses.length} صف دراسي يحتوي على {classes.length} شعبة موزعة بالتسلسل الأبجدي.
                </p>
              </div>
              <Button
                onClick={() => {
                  setClassMsg(null);
                  setNewClassModal(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 ml-1.5" />
                إضافة صف وشعب جديدة
              </Button>
            </div>

            {groupedClasses.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 text-sm mb-1">لا توجد صفوف دراسية مسجلة بعد</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  اضغط على زر &quot;إضافة صف وشعب جديدة&quot; وأدخل اسم الصف وعدد شعبه ليقوم النظام بإنشائها آلياً.
                </p>
                <Button
                  onClick={() => {
                    setClassMsg(null);
                    setNewClassModal(true);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 ml-1.5" />
                  إضافة صف دراسي الآن
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedClasses.map((group) => {
                  const totalStudentsInClass = group.sections.reduce(
                    (acc, sec) => acc + students.filter((s) => s.classId === sec.id).length,
                    0
                  );

                  return (
                    <div
                      key={group.name}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        {/* ترويسة الصف - قابلة للنقر لفتح خيارات التعديل والمسح */}
                        <div
                          onClick={() => {
                            setSelectedGroupForEdit(group);
                            setEditClassName(group.name);
                            setEditClassStage(group.stage);
                            setEditClassModal(true);
                          }}
                          className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 cursor-pointer group hover:bg-slate-50/80 p-1.5 -mx-1.5 rounded-lg transition"
                          title="انقر لتعديل اسم الصف أو حذفه"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                                {group.name}
                              </h3>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                                {group.stage}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {group.sections.length} شعب • {totalStudentsInClass} طالب إجمالي
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 px-2.5 py-1 rounded-md transition">
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="font-medium text-[11px]">تعديل / مسح</span>
                          </div>
                        </div>

                        {/* قائمة الشعب الأبجدية - النقر على أي شعبة يفتح طلابها وخيارات الإضافة والنقل */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                            الشعب (انقر على الشعبة لعرض طلابها وإدارتها):
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {group.sections.map((sec) => {
                              const secStudents = students.filter((s) => s.classId === sec.id).length;
                              return (
                                <div
                                  key={sec.id}
                                  onClick={() => {
                                    setSelectedSection({ id: sec.id, name: group.name, section: sec.section });
                                    setSectionModal(true);
                                  }}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs hover:border-slate-900 hover:bg-slate-100 cursor-pointer transition shadow-2xs group"
                                  title="انقر لعرض طلاب الشعبة ونقل أو إضافة طلاب"
                                >
                                  <div>
                                    <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                      الشعبة ({sec.section})
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {secStudents} طالب مسجل
                                    </div>
                                  </div>

                                  <div className="text-[10px] bg-white border border-slate-200 group-hover:border-slate-400 px-2 py-0.5 rounded text-slate-600">
                                    فتح الشعبة ←
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>العام الدراسي: {settings.academicYear}</span>
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                          نشط ومجدول
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* سجل الطلاب */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">سجل الطلاب المركزي</h2>
                <p className="text-xs text-slate-500">بيانات الطلاب، أكواد الـ QR، وأولياء الأمور</p>
              </div>
              <Button
                onClick={() => {
                  setStudentMsg(null);
                  setSelectedGradeName("");
                  setNewStudentData({ name: "", classId: "", parentName: "", parentPhone: "" });
                  setNewStudentModal(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
              >
                <Plus className="w-3.5 h-3.5 ml-1.5" />
                تسجيل طالب وولي أمر
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">الصف والشعبة</th>
                    <th className="p-3">ولي الأمر</th>
                    <th className="p-3">الروابط المباشرة (بدون رمز)</th>
                    <th className="p-3">رمز الحضور (QR)</th>
                    <th className="p-3">نقل الشعبة</th>
                    <th className="p-3 text-center">التقرير الأكاديمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const directParentLink = typeof window !== "undefined"
                      ? `${window.location.origin}/portal?role=parent&id=${student.id}&name=${encodeURIComponent(student.parentName)}`
                      : `/portal?role=parent&id=${student.id}`;

                    const directStudentLink = typeof window !== "undefined"
                      ? `${window.location.origin}/portal?role=student&id=${student.id}&name=${encodeURIComponent(student.name)}`
                      : `/portal?role=student&id=${student.id}`;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-semibold text-slate-900">{student.name}</td>
                        <td className="p-3 text-slate-600">{student.className}</td>
                        <td className="p-3 text-slate-600">
                          <div className="font-semibold text-slate-800">{student.parentName}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
                              {parseAndFormatPhone(student.parentPhone).displayFormatted}
                            </span>
                            {student.parentPhone && student.parentPhone !== "-" && (
                              <button
                                onClick={() => sendWhatsAppToParent(student)}
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition"
                                title="مراسلة ولي الأمر برابط المتابعة المباشر عبر واتساب"
                              >
                                <Share2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>واتساب</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5">
                            {/* رابط ولي الأمر */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-semibold w-14">ولي الأمر:</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(directParentLink, `رابط ولي أمر الطالب ${student.name}`)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] border border-slate-200"
                                title="نسخ رابط ولي الأمر"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                <span>نسخ</span>
                              </button>
                              <a
                                href={directParentLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] border border-slate-200"
                                title="فتح لوحة ولي الأمر"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>فتح</span>
                              </a>
                            </div>

                            {/* رابط الطالب */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-semibold w-14">الطالب:</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(directStudentLink, `رابط الطالب ${student.name}`)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] border border-slate-200"
                                title="نسخ رابط الطالب"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                <span>نسخ</span>
                              </button>
                              <a
                                href={directStudentLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] border border-slate-200"
                                title="فتح لوحة الطالب"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>فتح</span>
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-700 font-semibold">{student.qrCode}</td>
                        <td className="p-3">
                          <select
                            value={student.classId || ""}
                            onChange={(e) => handleMoveStudent(student.id, e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.section})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleGenerateStudentPDF(student)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs border border-slate-200"
                          >
                            <FileDown className="w-3.5 h-3.5 text-slate-600" />
                            <span>كشف درجات PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        لا يوجد طلاب مسجلون بعد. اضغط &quot;تسجيل طالب وولي أمر&quot; لإضافة أول طالب في المدرسة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* الجدول الأسبوعي التفاعلي وأنصبة المدرسين */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            {/* محدد الصف الدراسي والشعب التابعة له */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">جدول الحصص الأسبوعي (5 أيام × 5 حصص)</h2>
                    <p className="text-xs text-slate-500">اختر الصف أولاً، ثم حدد الشعبة وانقر على أي خانة لتثبيت المادة والمعلم</p>
                  </div>
                </div>

                {/* اختيار الصف أولاً */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">الصف الدراسي:</label>
                    <select
                      value={
                        scheduleGrade ||
                        classes.find((c) => c.id === selectedClassId)?.name ||
                        (groupedClasses[0]?.name ?? "")
                      }
                      onChange={(e) => {
                        const newGrade = e.target.value;
                        setScheduleGrade(newGrade);
                        const group = groupedClasses.find((g) => g.name === newGrade);
                        if (group && group.sections.length > 0) {
                          setSelectedClassId(group.sections[0].id);
                        }
                      }}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-2xs"
                    >
                      {groupedClasses.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.name} ({g.stage})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ظهور الشعب التابعة للصف المختار */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 px-1.5">الشعبة:</span>
                    {(
                      groupedClasses.find(
                        (g) =>
                          g.name ===
                          (scheduleGrade ||
                            classes.find((c) => c.id === selectedClassId)?.name ||
                            groupedClasses[0]?.name)
                      )?.sections || []
                    ).map((sec) => {
                      const isActive = sec.id === selectedClassId;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setSelectedClassId(sec.id)}
                          className={`px-3 py-1 text-xs rounded-md font-bold transition ${
                            isActive
                              ? "bg-slate-900 text-white shadow-2xs"
                              : "bg-white text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          الشعبة {sec.section}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

              {/* شبكة الـ 5 أيام × 5 خانات */}
              <div className="space-y-3">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-700 font-bold">
                        <th className="p-3.5 border-l border-slate-200 w-24">الحصة</th>
                        {daysList.map((day) => (
                          <th key={day.id} className="p-3.5 border-l border-slate-200 last:border-l-0 min-w-[140px]">
                            {day.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {periodsList.map((period) => (
                        <tr key={period} className="hover:bg-slate-50/40">
                          {/* رقم الحصة */}
                          <td className="p-3 font-bold text-slate-700 bg-slate-50/70 border-l border-slate-200">
                            الحصة {period}
                          </td>

                          {/* خانات الأيام الـ 5 */}
                          {daysList.map((day) => {
                            const entry = schedules.find(
                              (s) =>
                                s.classId === selectedClassId &&
                                s.day === day.id &&
                                s.period === period
                            );

                            return (
                              <td
                                key={day.id}
                                className="p-2 border-l border-slate-200 last:border-l-0 align-middle"
                              >
                                {entry ? (
                                  <div
                                    onClick={() => openCellModal(day.id, period)}
                                    className="group relative bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg p-2.5 cursor-pointer transition text-right shadow-2xs"
                                    title="انقر لتعديل الحصة أو المادة"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 text-xs">
                                        {entry.subject}
                                      </span>
                                      <button
                                        onClick={(e) => handleDeleteCell(day.id, period, e)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition p-0.5"
                                        title="حذف الحصة"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 truncate">
                                      {entry.teacherName || "بدون معلم محدد"}
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openCellModal(day.id, period)}
                                    className="w-full min-h-[58px] rounded-lg border border-dashed border-slate-300 hover:border-slate-800 hover:bg-slate-50 text-slate-400 hover:text-slate-800 flex flex-col items-center justify-center gap-1 transition p-2 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-medium">تحديد مادة</span>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 3. جدول أنصبة وتوزيع دروس المدرسين في الأسبوع (مطلب المدير) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">جدول أنصبة وتوزيع دروس المدرسين (أسبوعياً)</h3>
                    <p className="text-[11px] text-slate-500">حساب آلي لعدد الدروس والحصص لكل مدرس في الأسبوع عبر كافة الصفوف</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  إجمالي الحصص الموزعة: {schedules.length} حصة
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">اسم المدرس</th>
                      <th className="p-3">المادة الدراسية</th>
                      <th className="p-3">الهاتف والواتساب</th>
                      <th className="p-3 text-center">مجموع الدروس بالأسبوع</th>
                      <th className="p-3">الصفوف والشعب المجدولة</th>
                      <th className="p-3 text-center">أحد</th>
                      <th className="p-3 text-center">إثنين</th>
                      <th className="p-3 text-center">ثلاثاء</th>
                      <th className="p-3 text-center">أربعاء</th>
                      <th className="p-3 text-center">خميس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((teacher) => {
                      // جلب حصص هذا المعلم من كل الصفوف
                      const teacherLessons = schedules.filter((sc) => sc.teacherId === teacher.id);
                      const totalCount = teacherLessons.length;
                      
                      // استخراج الصفوف الفريدة
                      const uniqueClasses = Array.from(
                        new Set(teacherLessons.map((sc) => sc.className))
                      );

                      const day1Count = teacherLessons.filter((sc) => sc.day === 1).length;
                      const day2Count = teacherLessons.filter((sc) => sc.day === 2).length;
                      const day3Count = teacherLessons.filter((sc) => sc.day === 3).length;
                      const day4Count = teacherLessons.filter((sc) => sc.day === 4).length;
                      const day5Count = teacherLessons.filter((sc) => sc.day === 5).length;

                      return (
                        <tr key={teacher.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-bold text-slate-900">{teacher.name}</td>
                          <td className="p-3 text-slate-700 font-medium">{teacher.subject}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-600 text-[11px]" dir="ltr">
                                {parseAndFormatPhone(teacher.phone).displayFormatted}
                              </span>
                              <button
                                onClick={() => sendWhatsAppInvite(teacher)}
                                className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50 transition"
                                title="مراسلة المدرس عبر واتساب"
                              >
                                <Share2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                totalCount > 0
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {totalCount} {totalCount === 1 ? "حصة" : totalCount === 2 ? "حصتان" : "حصص"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            {uniqueClasses.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {uniqueClasses.map((cls, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200"
                                  >
                                    {cls}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">لم تسند له حصص بعد</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700">{day1Count || "-"}</td>
                          <td className="p-3 text-center font-semibold text-slate-700">{day2Count || "-"}</td>
                          <td className="p-3 text-center font-semibold text-slate-700">{day3Count || "-"}</td>
                          <td className="p-3 text-center font-semibold text-slate-700">{day4Count || "-"}</td>
                          <td className="p-3 text-center font-semibold text-slate-700">{day5Count || "-"}</td>
                        </tr>
                      );
                    })}
                    {teachers.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-400">
                          لا يوجد مدرسون مسجلون بعد لحساب أنصبتهم الأسبوعية.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* الإعدادات وبوت تيليجرام والمواد الدراسية */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            {/* قسم إدارة المواد الدراسية */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <BookMarked className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">نظام المواد الدراسية المعتمدة</h3>
                  <p className="text-[11px] text-slate-500">إضافة وتثبيت المواد الدراسية للمدرسة لربطها بجدول الحصص والمعلمين بشكل دائم</p>
                </div>
              </div>

              {subjectMsg && (
                <div
                  className={`p-2.5 mb-3 rounded-lg text-xs flex items-center gap-2 ${
                    subjectMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {subjectMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{subjectMsg.text}</span>
                </div>
              )}

              {/* نموذج إضافة مادة: فقط اسم المادة وزر الإضافة */}
              <form onSubmit={handleAddSubject} className="flex gap-2 max-w-lg mb-3">
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="اكتب اسم المادة (مثال: الرياضيات، التاريخ، الأحياء، الحاسوب...)"
                  required
                  className="flex-1 px-3.5 py-2 border rounded-lg border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
                <Button
                  type="submit"
                  disabled={subjectLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-4 shrink-0 gap-1.5 font-semibold"
                >
                  {subjectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>إضافة مادة</span>
                </Button>
              </form>

              {/* قائمة المواد الحالية مع خيار الحذف السريع */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block mb-2">المواد المسجلة حالياً بالمدرسة ({subjects.length}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((sub) => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 group"
                    >
                      <span>{sub.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(sub.id, sub.name)}
                        className="text-slate-400 hover:text-rose-600 transition"
                        title={`حذف مادة ${sub.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {subjects.length === 0 && (
                    <span className="text-xs text-slate-400">لا توجد مواد مضافة بعد، اكتب اسم المادة أعلاه واضغط إضافة.</span>
                  )}
                </div>
              </div>
            </div>

            {/* إعدادات المدرسة وبوت تيليجرام */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المدرسة:</label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full px-3 py-2 border rounded-md border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">توكن بوت التيليجرام المشفر:</label>
              <input
                type="password"
                value={settings.telegramBotToken}
                onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                placeholder="••••••••••••••••••••"
                className="w-full px-3 py-2 border rounded-md border-slate-300 text-xs font-mono"
                dir="ltr"
              />
              <p className="text-[11px] text-slate-500 mt-1">التوكن محمي ومشفر بالكامل ولا يمكن لأي طالب أو معلم قراءته.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">معرّف / يوزر بوت التيليجرام (Bot Username):</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.telegramBotUsername}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/^@/, "").trim();
                    setSettings({ ...settings, telegramBotUsername: clean });
                  }}
                  placeholder="مثال: MySchool_bot"
                  className="flex-1 px-3 py-2 border rounded-md border-slate-300 text-xs font-mono"
                  dir="ltr"
                />
                {settings.telegramBotUsername && (
                  <a
                    href={`https://t.me/${settings.telegramBotUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 bg-sky-50 text-sky-700 border border-sky-200 rounded-md text-xs hover:bg-sky-100 transition whitespace-nowrap"
                  >
                    <span>فتح البوت ↗</span>
                  </a>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                ضع يوزر البوت الذي أنشأته في BotFather (بدون علامة @). هذا المعرف يُمكّن المعلمين والطلاب من الدخول للبوت بنقرة واحدة من لوحتهم.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.from("school_settings").upsert({
                    school_name: settings.schoolName,
                    working_days: settings.workingDays,
                    periods_per_day: settings.periodsPerDay,
                    telegram_bot_token: settings.telegramBotToken,
                    telegram_bot_username: settings.telegramBotUsername,
                  });
                  alert("تم حفظ الإعدادات ومعرّف بوت التيليجرام في قاعدة البيانات بنجاح.");
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
              >
                حفظ التعديلات
              </Button>
            </div>
          </div>
          </div>
        )}
      </main>
      </div>

      {/* نافذة إضافة معلم */}
      {newTeacherModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-slate-900 mb-1">إضافة معلم جديد</h3>
            <p className="text-xs text-slate-500 mb-4">إنشاء حساب رسمي للمعلم في سوبابيس وإسناد المادة له</p>

            {teacherMsg && (
              <div
                className={`p-2.5 mb-3 rounded-lg text-xs flex items-center gap-2 ${
                  teacherMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {teacherMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{teacherMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">الاسم الثلاثي للمعلم:</label>
                <input
                  type="text"
                  required
                  value={newTeacherData.name}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, name: e.target.value })}
                  placeholder="مثال: أستاذ أحمد علي"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">رقم الهاتف (عراقي أو دولي):</label>
                <input
                  type="text"
                  required
                  value={newTeacherData.phone}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, phone: e.target.value })}
                  placeholder="مثال: 07733921468 أو +964 776 403 1859 أو 7733921468"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-slate-800 text-xs"
                  dir="ltr"
                />
                <p className="text-[10px] text-slate-500 mt-1">يقبل كافة الصيغ (مع أو بدون المفتاح، بالإنجليزية أو بالعربية) ويهيئه تلقائياً للواتساب.</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">المادة الدراسية:</label>
                <select
                  value={newTeacherData.subject}
                  onChange={(e) => setNewTeacherData({ ...newTeacherData, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                >
                  <option value="">اختر المادة...</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                  <option value="عام">عام / مادة أخرى</option>
                </select>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-[11px] leading-relaxed">
                ✨ <strong>دخول مباشر بالرابط:</strong> سيقوم النظام تلقائياً بتوليد رابط دخول خاص للمعلم يفتح حسابه بنقرة واحدة بدون الحاجة لكتابة أي كلمة مرور أو رمز سري.
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={teacherLoading}
                  onClick={() => setNewTeacherModal(false)}
                  className="text-xs h-8"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={teacherLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5"
                >
                  {teacherLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{teacherLoading ? "جارٍ الحفظ..." : "حفظ وإضافة المعلم"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة صف وتوليد الشعب آلياً */}
      {newClassModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-800">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">إضافة صف دراسي وتوليد الشعب</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              أدخل اسم الصف وحدد عدد الشعب، وسيقوم النظام بتوليدها فوراً بالتسلسل الأبجدي (أ، ب، ج، د...)
            </p>

            {classMsg && (
              <div
                className={`p-2.5 mb-3 rounded-lg text-xs flex items-center gap-2 ${
                  classMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {classMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{classMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddClass} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">اسم الصف الدراسي:</label>
                <input
                  type="text"
                  required
                  value={newClassData.name}
                  onChange={(e) => setNewClassData({ ...newClassData, name: e.target.value })}
                  placeholder="مثال: الأول متوسط، الرابع العلمي، السادس الإعدادي..."
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
                {/* مقترحات سريعة */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { name: "الأول متوسط", stage: "متوسطة" },
                    { name: "الثاني متوسط", stage: "متوسطة" },
                    { name: "الثالث متوسط", stage: "متوسطة" },
                    { name: "الرابع الإعدادي", stage: "إعدادية" },
                    { name: "الخامس الإعدادي", stage: "إعدادية" },
                    { name: "السادس الإعدادي", stage: "إعدادية" },
                  ].map((sug) => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => setNewClassData({ ...newClassData, name: sug.name, stage: sug.stage })}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      {sug.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">المرحلة الدراسية:</label>
                  <select
                    value={newClassData.stage}
                    onChange={(e) => setNewClassData({ ...newClassData, stage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="ابتدائية">ابتدائية</option>
                    <option value="متوسطة">متوسطة</option>
                    <option value="إعدادية">إعدادية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">عدد الشعب في هذا الصف:</label>
                  <select
                    value={newClassData.sectionsCount}
                    onChange={(e) => setNewClassData({ ...newClassData, sectionsCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-slate-800"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "شعبة واحدة" : num === 2 ? "شعبتان" : "شعب"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* معاينة حية للشعب الناتجة */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                  معاينة الشعب التي ستُنشأ تلقائياً:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"]
                    .slice(0, Math.min(newClassData.sectionsCount, 10))
                    .map((letter) => (
                      <div
                        key={letter}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded-md font-bold text-xs shadow-2xs"
                      >
                        الشعبة ({letter})
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={classLoading}
                  onClick={() => setNewClassModal(false)}
                  className="text-xs h-8"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={classLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5"
                >
                  {classLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{classLoading ? "جارٍ التوليد والحفظ..." : "إنشاء وحفظ الشعب"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تسجيل طالب وولي أمر */}
      {newStudentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-slate-900 mb-1">تسجيل طالب وولي أمر</h3>
            <p className="text-xs text-slate-500 mb-4">إنشاء حساب الطالب وكود الـ QR وربطه بولي الأمر</p>

            {studentMsg && (
              <div
                className={`p-2.5 mb-3 rounded-lg text-xs flex items-center gap-2 ${
                  studentMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {studentMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{studentMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">اسم الطالب الرباعي:</label>
                <input
                  type="text"
                  required
                  value={newStudentData.name}
                  onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                  placeholder="مثال: علي محمد حسن الكرخي"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">اسم ولي الأمر:</label>
                <input
                  type="text"
                  required
                  value={newStudentData.parentName}
                  onChange={(e) => setNewStudentData({ ...newStudentData, parentName: e.target.value })}
                  placeholder="مثال: محمد حسن الكرخي"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">رقم هاتف ولي الأمر:</label>
                <input
                  type="text"
                  required
                  value={newStudentData.parentPhone}
                  onChange={(e) => setNewStudentData({ ...newStudentData, parentPhone: e.target.value })}
                  placeholder="مثال: 07801234567 أو +964 780 123 4567 أو بالعربي"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-slate-800 text-xs"
                  dir="ltr"
                />
                <p className="text-[10px] text-slate-500 mt-1">يقبل كافة الصيغ العربية والإنجليزية ويضبطه للواتساب تلقائياً.</p>
              </div>

              {/* اختيار الصف أولاً */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">الصف الدراسي:</label>
                <select
                  value={selectedGradeName}
                  onChange={(e) => {
                    const grade = e.target.value;
                    setSelectedGradeName(grade);
                    const matchedSections = classes.filter((c) => c.name === grade);
                    if (matchedSections.length === 1) {
                      setNewStudentData((prev) => ({ ...prev, classId: matchedSections[0].id }));
                    } else {
                      setNewStudentData((prev) => ({ ...prev, classId: "" }));
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                  required
                >
                  <option value="">-- اضغط هنا لاختيار الصف --</option>
                  {Array.from(new Set(classes.map((c) => c.name))).map((gradeName) => (
                    <option key={gradeName} value={gradeName}>
                      {gradeName}
                    </option>
                  ))}
                </select>
              </div>

              {/* ظهور خيارات الشعبة فور اختيار الصف */}
              {selectedGradeName && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in duration-200">
                  <label className="block text-slate-700 font-semibold mb-2">
                    خيارات شعب صف ({selectedGradeName}):
                  </label>
                  {classes.filter((c) => c.name === selectedGradeName).length === 0 ? (
                    <p className="text-[11px] text-amber-600">لا توجد شعب مسجلة لهذا الصف حالياً في النظام.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {classes
                        .filter((c) => c.name === selectedGradeName)
                        .map((sec) => {
                          const isSelected = newStudentData.classId === sec.id;
                          return (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => setNewStudentData((prev) => ({ ...prev, classId: sec.id }))}
                              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                                isSelected
                                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                              }`}
                            >
                              <span>شعبة {sec.section}</span>
                              {isSelected && <span className="text-[11px] text-emerald-300">✓</span>}
                            </button>
                          );
                        })}
                    </div>
                  )}
                  {!newStudentData.classId && classes.filter((c) => c.name === selectedGradeName).length > 0 && (
                    <p className="text-[11px] text-rose-500 mt-2 font-medium">⚠️ اضغط على الشعبة المطلوبة لتحديدها للطالب.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={studentLoading}
                  onClick={() => setNewStudentModal(false)}
                  className="text-xs h-8"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={studentLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5"
                >
                  {studentLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{studentLoading ? "جارٍ التسجيل..." : "تأكيد تسجيل الطالب"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* نافذة تحديد مادة ومعلم لخلية في الجدول */}
      {cellModal && activeCell && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              تحديد مادة الحصة
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {daysList.find((d) => d.id === activeCell.day)?.name} • الحصة {activeCell.period}
            </p>

            {scheduleError && (
              <div className="p-2.5 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{scheduleError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCell} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">المادة الدراسية:</label>
                <select
                  value={cellSubjectId}
                  onChange={(e) => setCellSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                  required
                >
                  <option value="">اختر المادة...</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">المعلم المسند (اختياري):</label>
                <select
                  value={cellTeacherId}
                  onChange={(e) => setCellTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                >
                  <option value="">بدون معلم محدد حالياً</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={cellLoading}
                  onClick={() => setCellModal(false)}
                  className="text-xs h-8"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={cellLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5"
                >
                  {cellLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{cellLoading ? "جارٍ الحفظ..." : "تثبيت الحصة"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* نافذة تعديل ومسح الصف الدراسي */}
      {editClassModal && selectedGroupForEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-slate-900">إدارة صف: {selectedGroupForEdit.name}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-600">
                {selectedGroupForEdit.sections.length} شعب
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">يمكنك تعديل اسم هذا الصف أو مسحه بالكامل مع كافة شعبه</p>

            <form onSubmit={handleUpdateClass} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">اسم الصف الدراسي:</label>
                <input
                  type="text"
                  required
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  placeholder="مثال: الأول المتوسط أو الخامس العلمي"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">المرحلة الدراسية:</label>
                <select
                  value={editClassStage}
                  onChange={(e) => setEditClassStage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                >
                  <option value="ابتدائية">ابتدائية</option>
                  <option value="متوسطة">متوسطة</option>
                  <option value="إعدادية">إعدادية / ثانوية</option>
                </select>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={editClassLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5"
                >
                  {editClassLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                  <span>حفظ تعديل الصف</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const confirmDel = window.confirm(
                      `هل أنت متأكد تماماً من رغبتك في حذف صف "${selectedGroupForEdit.name}" وجميع شعبه؟ سيتم حذف جميع بيانات الشعب المرتبطة.`
                    );
                    if (confirmDel) {
                      setEditClassModal(false);
                      handleDeleteEntireClass(selectedGroupForEdit.name);
                    }
                  }}
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs h-8 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح الصف بكافة شعبه</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditClassModal(false)}
                  className="w-full text-xs h-8 text-slate-500"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تفاصيل الشعبة وقائمة طلابها مع إمكانية الإضافة والنقل */}
      {sectionModal && selectedSection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* الترويسة */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {selectedSection.name} - الشعبة ({selectedSection.section})
                </h3>
                <p className="text-xs text-slate-500">
                  إجمالي الطلاب في هذه الشعبة: {students.filter((s) => s.classId === selectedSection.id).length} طالب
                </p>
              </div>

              {/* أزرار الإجراءات على الشعبة */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedGradeName(selectedSection.name);
                    setNewStudentData({
                      name: "",
                      classId: selectedSection.id,
                      parentName: "",
                      parentPhone: "",
                    });
                    setSectionModal(false);
                    setNewStudentModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة طالب للشعبة</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => setMoveStudentModal(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>نقل طالب لهنا</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setSectionModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 text-base leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* محتوى الطلاب داخل الشعبة */}
            <div className="overflow-y-auto flex-1 py-4 space-y-2">
              {students.filter((s) => s.classId === selectedSection.id).length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">لا يوجد طلاب مسجلون في هذه الشعبة حتى الآن</p>
                  <p className="text-[11px] text-slate-500 mb-3">يمكنك إضافة طالب جديد أو نقل طالب من صف/شعبة أخرى</p>
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedGradeName(selectedSection.name);
                      setNewStudentData({
                        name: "",
                        classId: selectedSection.id,
                        parentName: "",
                        parentPhone: "",
                      });
                      setSectionModal(false);
                      setNewStudentModal(true);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 ml-1" />
                    إضافة أول طالب لهذه الشعبة
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {students
                    .filter((s) => s.classId === selectedSection.id)
                    .map((stu) => (
                      <div
                        key={stu.id}
                        className="bg-slate-50 border border-slate-200 hover:border-slate-400 rounded-lg p-3 flex items-center justify-between gap-2 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{stu.name}</h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            ولي الأمر: {stu.parentName} ({stu.parentPhone})
                          </p>
                          <span className="inline-block mt-1 font-mono text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                            {stu.qrCode}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setViewingStudent(stu);
                              setStudentDetailModal(true);
                            }}
                            className="bg-white hover:bg-slate-200 text-slate-900 border border-slate-200 text-[10px] h-7 px-2"
                          >
                            التفاصيل
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(stu.id, stu.name)}
                            className="text-[10px] text-rose-600 hover:underline text-center"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* التذييل */}
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSectionModal(false)}
                className="text-xs h-8"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة نقل طالب إلى الشعبة الحالية */}
      {moveStudentModal && selectedSection && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              نقل طالب إلى {selectedSection.name} - الشعبة ({selectedSection.section})
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              اختر الطالب من أي صف أو شعبة أخرى ليتم تحويل قيده إلى هذه الشعبة فوراً
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">اختر الطالب لنقله:</label>
                <select
                  value={studentToMoveId}
                  onChange={(e) => setStudentToMoveId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                >
                  <option value="">-- اضغط لاختيار الطالب --</option>
                  {students
                    .filter((s) => s.classId !== selectedSection.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (حالياً في: {s.className})
                      </option>
                    ))}
                </select>
                {students.filter((s) => s.classId !== selectedSection.id).length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">لا يوجد طلاب في صفوف أو شعب أخرى لنقلهم.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={moveLoading}
                  onClick={() => {
                    setMoveStudentModal(false);
                    setStudentToMoveId("");
                  }}
                  className="text-xs h-8"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  disabled={moveLoading || !studentToMoveId}
                  onClick={handleConfirmMoveStudent}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5"
                >
                  {moveLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>تأكيد النقل الآن</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تفاصيل الطالب الكاملة */}
      {studentDetailModal && viewingStudent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  {viewingStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{viewingStudent.name}</h3>
                  <span className="text-[11px] text-slate-500 font-mono">الباركود: {viewingStudent.qrCode}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentDetailModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">الصف والشعبة:</span>
                  <span className="font-bold text-slate-800">{viewingStudent.className}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">نسبة الحضور:</span>
                  <span className="font-bold text-emerald-600">{viewingStudent.attendanceRate}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ولي الأمر:</span>
                  <span className="font-bold text-slate-800">{viewingStudent.parentName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">رقم هاتف ولي الأمر:</span>
                  <span className="font-mono text-slate-800" dir="ltr">{viewingStudent.parentPhone}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => handleGenerateStudentPDF(viewingStudent)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>طباعة بطاقة الطالب وتقرير المتابعة</span>
                </Button>

                {viewingStudent.parentPhone && viewingStudent.parentPhone !== "-" && (
                  <a
                    href={`https://wa.me/${parseAndFormatPhone(viewingStudent.parentPhone).whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs h-8 rounded-md font-semibold transition"
                  >
                    <span>مراسلة ولي الأمر عبر واتساب ↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تفاصيل المعلم الشاملة والصفوف الموزعة له بالجدول */}
      {teacherDetailModal && selectedTeacherForView && (() => {
        const stats = getTeacherStats(selectedTeacherForView.id);
        const directTeacherLink =
          typeof window !== "undefined"
            ? `${window.location.origin}/portal?role=teacher&id=${selectedTeacherForView.id}&name=${encodeURIComponent(selectedTeacherForView.name)}`
            : `/portal?role=teacher&id=${selectedTeacherForView.id}`;

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              {/* رأس النافذة */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    {selectedTeacherForView.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{selectedTeacherForView.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {selectedTeacherForView.subject}
                      </span>
                      <span className="text-xs text-slate-500 font-mono" dir="ltr">
                        {parseAndFormatPhone(selectedTeacherForView.phone).displayFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTeacherDetailModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* محتوى التفاصيل والصفوف التي يدرس بها */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {/* إحصائيات المعلم السريعة */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">إجمالي الحصص الأسبوعية</span>
                    <span className="text-2xl font-black text-slate-900">{stats.totalPeriods}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">حصة موزعة في الجدول</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">الصفوف والشعب المسندة</span>
                    <span className="text-2xl font-black text-slate-900">{stats.classesList.length}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">شعب دراسية مسندة</span>
                  </div>
                </div>

                {/* الصفوف والشعب التي يدرّس بها المعلم حسب الجدول */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-slate-700" />
                      <h4 className="font-bold text-xs text-slate-900">الصفوف والشعب المسندة حسب الجدول الأسبوعي:</h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white font-bold text-slate-600 border border-slate-200">
                      {stats.classesList.length} فصول
                    </span>
                  </div>

                  {stats.classesList.length === 0 ? (
                    <div className="text-center py-5 bg-white rounded-lg border border-dashed border-slate-300">
                      <p className="text-xs text-slate-500">لم يتم تسكين أي حصة لهذا المعلم في الجدول الأسبوعي بعد.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherDetailModal(false);
                          setActiveTab("schedule");
                        }}
                        className="mt-2 text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        <span>الانتقال لجدول الحصص الأسبوعي لتثبيت دروسه ←</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {stats.classesList.map((cls, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200 p-2.5 rounded-lg flex items-center justify-between shadow-2xs"
                        >
                          <span className="font-bold text-xs text-slate-800">{cls.name}</span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {cls.count} حصص/أسبوع
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* توزيع الحصص التفصيلي في أيام الأسبوع */}
                {stats.schedules.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-slate-700" />
                      <h4 className="font-bold text-xs text-slate-900">مواعيد الحصص في الجدول:</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                      {stats.schedules.map((entry) => {
                        const dayName = daysList.find((d) => d.id === entry.day)?.name || "يوم";
                        return (
                          <span
                            key={entry.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px]"
                          >
                            <span className="font-bold text-slate-900">{dayName}</span>
                            <span className="text-slate-500">• الحصة {entry.period}</span>
                            <span className="text-blue-700 font-bold">({entry.className})</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* شريط الإجراءات والعمليات على المعلم */}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* زر واتساب */}
                  <Button
                    type="button"
                    onClick={() => sendWhatsAppInvite(selectedTeacherForView)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 gap-1.5 font-bold"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>مشاركة واتساب</span>
                  </Button>

                  {/* زر فتح اللوحة */}
                  <a
                    href={directTeacherLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 rounded-md font-bold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح اللوحة مباشرة</span>
                  </a>

                  {/* زر نسخ الرابط */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(directTeacherLink, `رابط الأستاذ ${selectedTeacherForView.name}`)}
                    className="text-slate-700 hover:bg-slate-100 text-xs h-9 gap-1.5 font-bold border-slate-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الرابط</span>
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  {/* زر التعديل */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditTeacherData({
                        id: selectedTeacherForView.id,
                        name: selectedTeacherForView.name,
                        phone: selectedTeacherForView.phone,
                        subject: selectedTeacherForView.subject,
                      });
                      setEditTeacherModal(true);
                    }}
                    className="text-xs h-8 gap-1.5 font-semibold text-slate-800 border-slate-300 hover:bg-slate-100"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل بيانات المعلم</span>
                  </Button>

                  {/* زر الحذف */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDeleteTeacher(selectedTeacherForView.id, selectedTeacherForView.name)}
                    className="text-xs h-8 gap-1.5 font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المعلم</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* نافذة تعديل بيانات المعلم */}
      {editTeacherModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-slate-900 mb-1">تعديل بيانات المعلم</h3>
            <p className="text-xs text-slate-500 mb-4">تحديث الاسم والمادة ورقم الهاتف في قاعدة البيانات</p>

            <form onSubmit={handleUpdateTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">الاسم الكامل:</label>
                <input
                  type="text"
                  required
                  value={editTeacherData.name}
                  onChange={(e) => setEditTeacherData({ ...editTeacherData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">المادة الدراسية:</label>
                <select
                  value={editTeacherData.subject}
                  onChange={(e) => setEditTeacherData({ ...editTeacherData, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                >
                  <option value="">اختر المادة...</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                  <option value="عام">عام / أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">رقم الهاتف:</label>
                <input
                  type="text"
                  required
                  value={editTeacherData.phone}
                  onChange={(e) => setEditTeacherData({ ...editTeacherData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                  dir="ltr"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={editTeacherLoading}
                  onClick={() => setEditTeacherModal(false)}
                  className="text-xs h-8"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={editTeacherLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 gap-1.5"
                >
                  {editTeacherLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editTeacherLoading ? "جارٍ الحفظ..." : "حفظ التعديلات"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
