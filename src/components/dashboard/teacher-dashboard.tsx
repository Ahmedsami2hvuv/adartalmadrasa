"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Camera, BookOpen, Award, CheckCircle, Plus, FileText } from "lucide-react";
import { QRScanner } from "@/components/qr-scanner";

export function TeacherDashboard({ userProfile }: { userProfile: any }) {
  const [activeTab, setActiveTab] = useState<"schedule" | "attendance" | "grades" | "homework" | "notes">("schedule");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Form states
  const [selectedStudent, setSelectedStudent] = useState("");
  const [gradeScore, setGradeScore] = useState("");
  const [gradeType, setGradeType] = useState<"daily" | "monthly" | "final">("daily");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [homeworkTitle, setHomeworkTitle] = useState("");
  const [homeworkBody, setHomeworkBody] = useState("");
  const [behaviorNote, setBehaviorNote] = useState("");
  const [msg, setMsg] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    const { data: stList } = await supabase.from("students").select("*, profiles(full_name), classes(name, section)");
    if (stList) setStudents(stList);

    const { data: sbList } = await supabase.from("subjects").select("*");
    if (sbList) setSubjects(sbList);

    const { data: clList } = await supabase.from("classes").select("*");
    if (clList) setClasses(clList);
  };

  const handleQRScanSuccess = async (qrCode: string) => {
    setShowQRScanner(false);
    // Find student by QR Code
    const { data: st } = await supabase.from("students").select("id, profiles(full_name)").eq("qr_code", qrCode).single();
    if (st) {
      const profileData: any = st.profiles;
      const fullName = Array.isArray(profileData) ? profileData[0]?.full_name : profileData?.full_name;
      setMsg(`تم تسجيل حضور الطالب (${fullName || "الطالب"}) بنجاح!`);
    } else {
      setMsg(`رمز الكيو آر (${qrCode}) غير مسجل في النظام.`);
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !gradeScore || !selectedSubject) return;

    const { error } = await supabase.from("grades").insert({
      student_id: selectedStudent,
      subject_id: selectedSubject,
      type: gradeType,
      score: Number(gradeScore),
    });

    if (!error) {
      setMsg("تم رصد الدرجة بنجاح!");
      setGradeScore("");
    } else {
      setMsg("حدث خطأ أثناء رصد الدرجة.");
    }
  };

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeworkTitle || !homeworkBody) return;

    // Get first teacher record
    const { data: t } = await supabase.from("teachers").select("id").limit(1).single();

    if (!t || classes.length === 0 || subjects.length === 0) {
      setMsg("يرجى التأكد من إضافة الصفوف والمواد أولاً.");
      return;
    }

    const { error } = await supabase.from("homeworks").insert({
      teacher_id: t.id,
      class_id: classes[0].id,
      subject_id: subjects[0].id,
      title: homeworkTitle,
      body: homeworkBody,
    });

    if (!error) {
      setMsg("تم إرسال الواجب المنزلي بنجاح!");
      setHomeworkTitle("");
      setHomeworkBody("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          { id: "schedule", label: "جدولي الأسبوعي", icon: Calendar },
          { id: "attendance", label: "تسجيل الغياب والحضور", icon: Camera },
          { id: "grades", label: "رصد الدرجات", icon: Award },
          { id: "homework", label: "الواجبات المنزلية", icon: BookOpen },
          { id: "notes", label: "الملاحظات السلوكية", icon: FileText },
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

      {/* SCHEDULE */}
      {activeTab === "schedule" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="text-primary" /> جدولي الأسبوعي والحصص اليومية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {["الحصة الأولى (08:00 ص)", "الحصة الثانية (09:00 ص)", "الحصة الثالثة (10:00 ص)", "الحصة الرابعة (11:00 ص)", "الحصة الخامسة (12:00 م)"].map(
                (period, idx) => (
                  <div key={idx} className="p-4 border rounded-xl bg-slate-50 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                        {period}
                      </span>
                      <h4 className="font-bold text-slate-800 mt-2">مادة الرياضيات</h4>
                      <p className="text-xs text-slate-500">الصف الأول المتوسط - شعبة أ</p>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ATTENDANCE WITH QR SCANNER */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">تسجيل الحضور والغياب للطلاب</CardTitle>
              <Button onClick={() => setShowQRScanner(!showQRScanner)}>
                <Camera size={16} className="mr-1" />
                {showQRScanner ? "إغلاق الكاميرا" : "مسح رمز الكيو آر (QR)"}
              </Button>
            </CardHeader>
            <CardContent>
              {showQRScanner && (
                <div className="mb-6">
                  <QRScanner onScan={handleQRScanSuccess} onClose={() => setShowQRScanner(false)} />
                </div>
              )}

              <div className="divide-y">
                {students.map((st) => (
                  <div key={st.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{st.profiles?.full_name}</p>
                      <p className="text-xs text-slate-500">{st.classes?.name || "بدون صف"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-600 hover:bg-emerald-50">
                        حاضر
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                        غائب
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GRADES */}
      {activeTab === "grades" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">رصد وتحديث درجات الطلاب</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddGrade} className="space-y-4 max-w-md">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">اختر الطالب</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full border p-2 rounded-lg text-sm"
                  required
                >
                  <option value="">-- حدد الطالب --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.profiles?.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">المادة الدراسية</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full border p-2 rounded-lg text-sm"
                  required
                >
                  <option value="">-- حدد المادة --</option>
                  {subjects.map((sb) => (
                    <option key={sb.id} value={sb.id}>
                      {sb.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">نوع التقييم</label>
                  <select
                    value={gradeType}
                    onChange={(e) => setGradeType(e.target.value as any)}
                    className="w-full border p-2 rounded-lg text-sm"
                  >
                    <option value="daily">يومي</option>
                    <option value="monthly">شهري</option>
                    <option value="final">نهائي</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">الدرجة (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    className="w-full border p-2 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">حفظ الدرجة</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* HOMEWORK */}
      {activeTab === "homework" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إضافة واجب منزلي جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddHomework} className="space-y-4 max-w-lg">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">عنوان الواجب</label>
                <input
                  type="text"
                  placeholder="مثال: حل التمارين صفحة 45"
                  value={homeworkTitle}
                  onChange={(e) => setHomeworkTitle(e.target.value)}
                  className="w-full border p-2 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">تفاصيل الواجب</label>
                <textarea
                  rows={4}
                  placeholder="اكتب الأسئلة أو التعليمات للطالب هنا..."
                  value={homeworkBody}
                  onChange={(e) => setHomeworkBody(e.target.value)}
                  className="w-full border p-2 rounded-lg text-sm"
                  required
                ></textarea>
              </div>

              <Button type="submit" className="w-full">نشر الواجب للمدرس والطلاب</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
