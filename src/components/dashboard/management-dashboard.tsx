"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, Calendar, Settings, Share2, Plus, CheckCircle, FileText, UserPlus, Search, ArrowLeftRight, Trash2 } from "lucide-react";
import { generateStudentPDF } from "@/lib/pdf-report";

export function ManagementDashboard({ userProfile }: { userProfile: any }) {
  const [activeTab, setActiveTab] = useState<"overview" | "teachers" | "classes" | "students" | "settings">("overview");
  const [stats, setStats] = useState({ teachersCount: 0, studentsCount: 0, classesCount: 0, pendingInstallments: 0 });

  // Data states
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>({ school_name: "مدرستي", working_days: 6, telegram_bot_token: "" });

  // Form states
  const [newClassName, setNewClassName] = useState("");
  const [newClassSection, setNewClassSection] = useState("");
  const [newClassStage, setNewClassStage] = useState("");

  // Student form states
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentClassId, setNewStudentClassId] = useState("");
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Filter & Search states
  const [filterClassId, setFilterClassId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Teachers
    const { data: teacherList } = await supabase.from("teachers").select("*, profiles(full_name, phone)");
    if (teacherList) setTeachers(teacherList);

    // Classes
    const { data: classList } = await supabase.from("classes").select("*").order("name");
    if (classList) setClasses(classList);

    // Students
    const { data: studentList } = await supabase.from("students").select("*, profiles(full_name, phone), classes(name, section, stage)");
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
    setMsg("");
    setErrorMsg("");
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
      setErrorMsg("حدث خطأ أثناء إضافة الصف");
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");
    if (!newStudentName.trim()) {
      setErrorMsg("يرجى إدخال اسم الطالب الكامل");
      return;
    }

    setIsSubmittingStudent(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newStudentName.trim(),
          phone: newStudentPhone.trim(),
          class_id: newStudentClassId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ أثناء إضافة الطالب");
      }

      setMsg("تم إضافة الطالب وتوزيعه على الصف بنجاح!");
      setNewStudentName("");
      setNewStudentPhone("");
      setNewStudentClassId("");
      fetchDashboardData();
    } catch (err: any) {
      setErrorMsg(err.message || "فشل إضافة الطالب");
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const handleUpdateStudentClass = async (studentId: string, newClassId: string) => {
    setMsg("");
    setErrorMsg("");
    const { error } = await supabase
      .from("students")
      .update({ class_id: newClassId || null })
      .eq("id", studentId);

    if (!error) {
      setMsg("تم تغيير وتوزيع صف الطالب بنجاح!");
      fetchDashboardData();
    } else {
      setErrorMsg("حدث خطأ أثناء تحديث صف الطالب");
    }
  };

  const handleDeleteStudent = async (studentId: string, profileId: string) => {
    if (!confirm("هل أنت تأكد من رغبتك في حذف هذا الطالب؟")) return;
    setMsg("");
    setErrorMsg("");

    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (!error) {
      setMsg("تم حذف الطالب بنجاح.");
      fetchDashboardData();
    } else {
      setErrorMsg("فشل حذف الطالب");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");
    const { error } = await supabase.from("school_settings").upsert({
      id: true,
      school_name: schoolSettings.school_name,
      working_days: schoolSettings.working_days,
      telegram_bot_token: schoolSettings.telegram_bot_token,
    });
    if (!error) {
      setMsg("تم حفظ إعدادات المدرسة بنجاح!");
    } else {
      setErrorMsg("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  const generateWhatsappInvite = (name: string, phone: string) => {
    const text = `مرحباً أستاذ ${name}، تم إنشاء حسابك في منصة ${schoolSettings.school_name}. تفضل بتسجيل الدخول لمتابعة جدولاك الحصص.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  // Filter students based on selected class and search text
  const filteredStudents = students.filter((st) => {
    const matchesClass = filterClassId === "all" || (filterClassId === "unassigned" ? !st.class_id : st.class_id === filterClassId);
    const matchesSearch = !searchQuery || (st.profiles?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          { id: "overview", label: "نظرة عامة", icon: Users },
          { id: "teachers", label: "إدارة المدرسين", icon: GraduationCap },
          { id: "classes", label: "الصفوف والشعب", icon: Calendar },
          { id: "students", label: "إضافة وتوزيع الطلاب", icon: UserPlus },
          { id: "settings", label: "إعدادات المنصة", icon: Settings },
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

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-center gap-2">
          {errorMsg}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">عدد الصفوف والشعب</CardTitle>
              <Calendar className="text-primary" size={20} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.classesCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">أيام الدوام الأسبوعية</CardTitle>
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

      {/* CLASSES */}
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
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">المرحلة الدراسية</label>
                  <input
                    type="text"
                    placeholder="مثال: المتوسطة / الثانوية / الابتدائية"
                    value={newClassStage}
                    onChange={(e) => setNewClassStage(e.target.value)}
                    className="w-full border p-2 rounded-lg text-sm"
                  />
                </div>
                <Button type="submit" className="w-full">إضافة الصف</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الصفوف المتاحة ({classes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">لم يتم إضافة صفوف بعد.</p>
              ) : (
                <div className="space-y-2">
                  {classes.map((c) => (
                    <div key={c.id} className="p-3 border rounded-lg flex justify-between items-center bg-slate-50">
                      <div>
                        <span className="font-bold text-sm block">{c.name} - شعبة ({c.section})</span>
                        <span className="text-xs text-slate-500">المرحلة: {c.stage || "عام"}</span>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-medium">
                        {students.filter(st => st.class_id === c.id).length} طالب
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* STUDENTS & DISTRIBUTION */}
      {activeTab === "students" && (
        <div className="space-y-6">
          {/* Add Student Form */}
          <Card className="border-primary/20 bg-emerald-50/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <UserPlus size={20} /> إضافة طالب جديد وتوزيعه على صف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddStudent} className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">اسم الطالب الثلاثي أو الكامل *</label>
                  <input
                    type="text"
                    placeholder="مثال: أحمد علي حسين"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full border p-2.5 rounded-lg text-sm bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">رقم هاتف الطالب / ولي الأمر (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: 07700000000"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    className="w-full border p-2.5 rounded-lg text-sm bg-white dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">الصف والشعبة المراد توزيعه عليها *</label>
                  <select
                    value={newStudentClassId}
                    onChange={(e) => setNewStudentClassId(e.target.value)}
                    className="w-full border p-2.5 rounded-lg text-sm bg-white"
                    required
                  >
                    <option value="">-- اختر الصف والشعبة --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - شعبة ({c.section})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <Button type="submit" disabled={isSubmittingStudent} className="w-full sm:w-auto">
                    {isSubmittingStudent ? "جارٍ إضافة الطالب وتوزيعه..." : "حفظ إضافة الطالب وتوزيعه على الصف"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Students List & Redistribution */}
          <Card>
            <CardHeader className="space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="text-primary" /> سجل الطلاب وتوزيع الصفوف ({filteredStudents.length})
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">يمكنك إعادة توزيع وتغيير صف أي طالب مباشرة من القائمة أسفله</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={16} className="absolute right-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بحث باسم الطالب..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border pr-8 pl-3 py-1.5 rounded-lg text-xs w-44"
                  />
                </div>

                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="border p-1.5 rounded-lg text-xs bg-white"
                >
                  <option value="all">جميع الصفوف والشعب</option>
                  <option value="unassigned">غير موزعين على صف</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - شعبة ({c.section})
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  لا يوجد طلاب مطابقون للبحث أو الفلتر المحدد.
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStudents.map((st) => (
                    <div key={st.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800 flex items-center gap-2">
                          {st.profiles?.full_name || "طالب بدون اسم"}
                          {st.profiles?.phone && (
                            <span className="text-xs font-normal text-slate-500">({st.profiles.phone})</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          الصف الحالي: 
                          <span className="font-semibold text-primary">
                            {st.classes ? `${st.classes.name} - شعبة ${st.classes.section}` : "غير موزع على صف"}
                          </span>
                        </p>
                      </div>

                      {/* Action & Re-assign class */}
                      <div className="flex items-center gap-2">
                        {/* Class Dropdown */}
                        <div className="flex items-center gap-1">
                          <ArrowLeftRight size={14} className="text-slate-400" />
                          <select
                            value={st.class_id || ""}
                            onChange={(e) => handleUpdateStudentClass(st.id, e.target.value)}
                            className="border p-1.5 rounded-md text-xs bg-slate-50 hover:bg-white text-slate-800"
                          >
                            <option value="">-- اختر صف لتوزيع الطالب --</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} - شعبة ({c.section})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* PDF Report */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            generateStudentPDF({
                              studentName: st.profiles?.full_name || "الطالب",
                              className: st.classes ? `${st.classes.name} - شعبة ${st.classes.section}` : "غير محدد",
                              attendanceRate: "95%",
                              grades: [{ subject: "الرياضيات", score: 90, type: "شهري" }],
                              behaviorNotes: ["طالب متميز ومواظب"],
                              schoolName: schoolSettings.school_name,
                            })
                          }
                        >
                          <FileText size={14} className="mr-1" /> PDF
                        </Button>

                        {/* Delete Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2"
                          onClick={() => handleDeleteStudent(st.id, st.profile_id)}
                          title="حذف الطالب"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
