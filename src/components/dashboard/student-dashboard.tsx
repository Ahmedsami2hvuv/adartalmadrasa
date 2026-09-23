"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, BookOpen, Award, QrCode, CheckCircle, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export function StudentDashboard({ userProfile }: { userProfile: any }) {
  const [activeTab, setActiveTab] = useState<"schedule" | "grades" | "homework" | "qrcode">("schedule");
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [submissionAnswer, setSubmissionAnswer] = useState("");
  const [selectedHwId, setSelectedHwId] = useState("");
  const [msg, setMsg] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    // Current student
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: st } = await supabase.from("students").select("*, classes(name, section)").eq("profile_id", user.id).single();
      if (st) setStudentInfo(st);
    }

    // Homeworks
    const { data: hwList } = await supabase.from("homeworks").select("*, subjects(name)");
    if (hwList) setHomeworks(hwList);

    // Grades for chart
    setGradesData([
      { subject: "الرياضيات", score: 88 },
      { subject: "العلوم", score: 95 },
      { subject: "اللغة العربية", score: 90 },
      { subject: "اللغة الإنجليزية", score: 85 },
      { subject: "الاجتماعيات", score: 92 },
    ]);
  };

  const handleHomeworkSubmit = async (hwId: string) => {
    if (!submissionAnswer || !studentInfo) return;

    const { error } = await supabase.from("homework_submissions").upsert({
      homework_id: hwId,
      student_id: studentInfo.id,
      answer: submissionAnswer,
    });

    if (!error) {
      setMsg("تم إرسال إجابة الواجب بنجاح!");
      setSubmissionAnswer("");
      setSelectedHwId("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          { id: "schedule", label: "جدولي وتنبيهاتي", icon: Calendar },
          { id: "grades", label: "درجاتي وتقييمي", icon: TrendingUp },
          { id: "homework", label: "الواجبات اليومية", icon: BookOpen },
          { id: "qrcode", label: "رمز الكيو آر الخاص بي", icon: QrCode },
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
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="text-primary" /> جدول الحصص اليومي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { period: "الحصة 1 (08:00 ص)", subject: "الرياضيات", room: "القاعة 1" },
                  { period: "الحصة 2 (09:00 ص)", subject: "العلوم", room: "المختبر" },
                  { period: "الحصة 3 (10:00 ص)", subject: "اللغة العربية", room: "القاعة 1" },
                  { period: "الحصة 4 (11:00 ص)", subject: "اللغة الإنجليزية", room: "القاعة 1" },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-slate-50 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-primary">{item.period}</span>
                      <h4 className="font-bold text-slate-800">{item.subject}</h4>
                    </div>
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">{item.room}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GRADES CHART */}
      {activeTab === "grades" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="text-primary" /> تحليل مستوى الطالب والدرجات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradesData}>
                  <XAxis dataKey="subject" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HOMEWORK */}
      {activeTab === "homework" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="text-primary" /> الواجبات المدرسية المطلوبة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {homeworks.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">لا يوجد واجبات منزلية مطلوبة حالياً.</p>
            ) : (
              <div className="space-y-4">
                {homeworks.map((hw) => (
                  <div key={hw.id} className="p-4 border rounded-xl bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-base text-slate-900">{hw.title}</h4>
                      <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-1 rounded">
                        {hw.subjects?.name || "المادة"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">{hw.body}</p>

                    {selectedHwId === hw.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          placeholder="اكتب إجابتك هنا..."
                          value={submissionAnswer}
                          onChange={(e) => setSubmissionAnswer(e.target.value)}
                          className="w-full border p-2 rounded-lg text-sm bg-white"
                        ></textarea>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleHomeworkSubmit(hw.id)}>
                            إرسال الإجابة
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedHwId("")}>
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setSelectedHwId(hw.id)}>
                        حل الواجب
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR CODE */}
      {activeTab === "qrcode" && (
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-lg">بطاقة كيو آر (QR Code) الخاصة بالحضور</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="p-6 bg-slate-100 border-2 border-dashed rounded-2xl my-4">
              <QrCode size={160} className="text-slate-800" />
            </div>
            <p className="font-mono text-xs text-slate-500 mb-2">
              رمز الطالب: {studentInfo?.qr_code || "adart-student-qr"}
            </p>
            <p className="text-xs text-slate-600">اعرض هذا الكود للمدرس ليمسحه من هاتف المدرس لتأكيد حضورك الحصة فورياً.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
