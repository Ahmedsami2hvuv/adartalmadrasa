"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, Calendar, DollarSign, Settings, Share2, Plus, CheckCircle, Send, FileText } from "lucide-react";
import { generateStudentPDF } from "@/lib/pdf-report";

export function ManagementDashboard({ userProfile }: { userProfile: any }) {
  const [activeTab, setActiveTab] = useState<"overview" | "teachers" | "classes" | "students" | "installments" | "settings">("overview");
  const [stats, setStats] = useState({ teachersCount: 0, studentsCount: 0, classesCount: 0, pendingInstallments: 0 });

  // Data states
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>({ school_name: "مدرستي", working_days: 6, telegram_bot_token: "" });

  // Form states
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherPhone, setNewTeacherPhone] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassSection, setNewClassSection] = useState("");
  const [newClassStage, setNewClassStage] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [msg, setMsg] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Teachers
    const { data: teacherList } = await supabase.from("teachers").select("*, profiles(full_name, phone)");
    if (teacherList) setTeachers(teacherList);

    // Classes
    const { data: classList } = await supabase.from("classes").select("*");
    if (classList) setClasses(classList);

    // Students
    const { data: studentList } = await supabase.from("students").select("*, profiles(full_name), classes(name, section)");
    if (studentList) setStudents(studentList);

    // Settings
    const { data: settings } = await supabase.from("school_settings").select("*").single();
    if (settings) setSchoolSettings(settings);

    // Stats
    setStats({
      teachersCount: teacherList?.length || 0,
      studentsCount: studentList?.length || 0,
      classesCount: classList?.length || 0,
      pendingInstallments: 0,
    });
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !newClassSection) return;
    const { error } = await supabase.from("classes").insert({
      name: newClassName,
      section: newClassSection,
      stage: newClassStage || "الابتدائية",
    });
    if (!error) {
      setMsg("تم إضافة الصف بنجاح!");
      setNewClassName("");
      setNewClassSection("");
      fetchDashboardData();
    } else {
      setMsg("حدث خطأ أثناء إضافة الصف");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("school_settings").upsert({
      id: true,
      school_name: schoolSettings.school_name,
      working_days: schoolSettings.working_days,
      telegram_bot_token: schoolSettings.telegram_bot_token,
    });
    if (!error) {
      setMsg("تم حفظ إعدادات المدرسة وبوت التيليجرام بنجاح!");
    }
  };

  const generateWhatsappInvite = (name: string, phone: string) => {
    const text = `مرحباً أستاذ ${name}، تم إنشاء حسابك في منصة ${schoolSettings.school_name}. تفضل بتسجيل الدخول متابعة جدولاك الحصص.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          { id: "overview", label: "نظرة عامة", icon: Users },
          { id: "teachers", label: "إدارة المدرسين", icon: GraduationCap },
          { id: "classes", label: "الصفوف والجداول", icon: Calendar },
          { id: "students", label: "الطلاب والأقساط", icon: Users },
          { id: "settings", label: "إعدادات البوت والمنصة", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          {msg}
        </div>
      )}

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الطلاب</CardTitle>
              <Users className="text-primary" size={20} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.studentsCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">الكادر التدريسي</CardTitle>
              <GraduationCap className="text-primary" size={20} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.teachersCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">عدد الصفوف</CardTitle>
              <Calendar className="text-primary" size={20} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.classesCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">أيام العمل الأسبوعية</CardTitle>
              <Settings className="text-primary" size={20} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{schoolSettings.working_days} أيام</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TEACHERS */}
      {activeTab === "teachers" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="text-primary" /> قائمة المدرسين ودعوتهم عبر الواتساب
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teachers.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">لا يوجد مدرسين مسجلين حالياً.</p>
              ) : (
                <div className="divide-y">
                  {teachers.map((t) => (
                    <div key={t.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{t.profiles?.full_name || "مدرس"}</p>
                        <p className="text-xs text-slate-500">{t.profiles?.phone || "بدون رقم هاتف"}</p>
                      </div>
                      {t.profiles?.phone && (
                        <a
                          href={generateWhatsappInvite(t.profiles.full_name, t.profiles.phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-emerald-700"
                        >
                          <Share2 size={14} /> إرسال دعوة واتساب
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CLASSES & SCHEDULES */}
      {activeTab === "classes" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="text-primary" /> إضافة صف أو شعبة جديدة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddClass} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">اسم الصف</label>
                  <input
                    type="text"
                    placeholder="مثال: الأول المتوسط"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full border p-2 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">الشعبة</label>
                  <input
                    type="text"
                    placeholder="مثال: أ / ب"
                    value={newClassSection}
                    onChange={(e) => setNewClassSection(e.target.value)}
                    className="w-full border p-2 rounded-lg text-sm"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">إضافة الصف</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الصفوف المتاحة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {classes.map((c) => (
                  <div key={c.id} className="p-3 border rounded-lg flex justify-between items-center bg-slate-50">
                    <span className="font-bold text-sm">{c.name} - شعبة {c.section}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{c.stage}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STUDENTS & REPORTS */}
      {activeTab === "students" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">سجل الطلاب والتقارير</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">لا يوجد طلاب مسجلون بعد في النظام.</p>
            ) : (
              <div className="divide-y">
                {students.map((st) => (
                  <div key={st.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{st.profiles?.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {st.classes ? `${st.classes.name} - شعبة ${st.classes.section}` : "غير محدد الصف"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        generateStudentPDF({
                          studentName: st.profiles?.full_name || "الطالب",
                          className: st.classes?.name || "الدروس",
                          attendanceRate: "95%",
                          grades: [{ subject: "الرياضيات", score: 90, type: "شهري" }],
                          behaviorNotes: ["طالب متميز ومواظب"],
                          schoolName: schoolSettings.school_name,
                        })
                      }
                    >
                      <FileText size={14} className="mr-1" /> تنزيل تقرير PDF
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SETTINGS */}
      {activeTab === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="text-primary" /> إعدادات المدرسة وبوت التيليجرام
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">اسم المدرسة</label>
                <input
                  type="text"
                  value={schoolSettings.school_name}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, school_name: e.target.value })}
                  className="w-full border p-2 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">عدد أيام الدوام الأسبوعية (5 أو 6 أيام)</label>
                <select
                  value={schoolSettings.working_days}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, working_days: Number(e.target.value) })}
                  className="w-full border p-2 rounded-lg text-sm"
                >
                  <option value={5}>5 أيام عمل (الأحد - الخميس)</option>
                  <option value={6}>6 أيام عمل (السبت - الخميس)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">رمز توكن بوت التيليجرام (Telegram Bot Token)</label>
                <input
                  type="text"
                  placeholder="مثال: 123456789:ABCdefGHIjklMNOpqrsTUVwxyZ"
                  value={schoolSettings.telegram_bot_token || ""}
                  onChange={(e) => setSchoolSettings({ ...schoolSettings, telegram_bot_token: e.target.value })}
                  className="w-full border p-2 rounded-lg text-sm font-mono text-left dir-ltr"
                />
                <p className="text-xs text-slate-400 mt-1">يُستخدم البوت لإرسال جدول الحصص الصباحي والإشعارات والتنبيهات للمدرسين والمدير.</p>
              </div>

              <Button type="submit" className="w-full">حفظ التغييرات</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
