"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, DollarSign, Calendar, CheckCircle } from "lucide-react";
import { generateStudentPDF } from "@/lib/pdf-report";

export function ParentDashboard({ userProfile }: { userProfile: any }) {
  const [activeTab, setActiveTab] = useState<"children" | "installments">("children");
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchParentData();
  }, []);

  const fetchParentData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("parents").select("id").eq("profile_id", user.id).single();
      if (p) {
        const { data: chList } = await supabase
          .from("students")
          .select("*, profiles(full_name), classes(name, section)")
          .eq("parent_id", p.id);

        if (chList && chList.length > 0) {
          setChildren(chList);
          setSelectedChild(chList[0]);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          { id: "children", label: "متابعة أبنائي", icon: Users },
          { id: "installments", label: "متابعة الأقساط المالية", icon: DollarSign },
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

      {activeTab === "children" && (
        <div className="space-y-4">
          {children.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-slate-600">اختر الابن:</span>
              {children.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChild(ch)}
                  className={`px-3 py-1 rounded-md text-xs font-bold ${
                    selectedChild?.id === ch.id
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {ch.profiles?.full_name}
                </button>
              ))}
            </div>
          )}

          {selectedChild ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedChild.profiles?.full_name}</CardTitle>
                  <p className="text-xs text-slate-500">
                    {selectedChild.classes?.name} - شعبة {selectedChild.classes?.section}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    generateStudentPDF({
                      studentName: selectedChild.profiles?.full_name || "الابن",
                      className: selectedChild.classes?.name || "الصف",
                      attendanceRate: "98%",
                      grades: [
                        { subject: "الرياضيات", score: 92, type: "شهري" },
                        { subject: "العلوم", score: 96, type: "شهري" },
                      ],
                      behaviorNotes: ["طالب ملتزم بالواجبات ومتفوق سلوكياً."],
                      schoolName: "مدرستي",
                    })
                  }
                >
                  <FileText size={14} className="mr-1" /> تنزيل التقرير الأسبوعي PDF
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-3 border rounded-xl bg-slate-50">
                    <span className="text-xs text-slate-500 font-bold block mb-1">نسبة الحضور</span>
                    <span className="text-2xl font-bold text-emerald-600">98%</span>
                  </div>
                  <div className="p-3 border rounded-xl bg-slate-50">
                    <span className="text-xs text-slate-500 font-bold block mb-1">المعدل الأكاديمي</span>
                    <span className="text-2xl font-bold text-primary">94.5 / 100</span>
                  </div>
                  <div className="p-3 border rounded-xl bg-slate-50">
                    <span className="text-xs text-slate-500 font-bold block mb-1">الواجبات المكتملة</span>
                    <span className="text-2xl font-bold text-slate-800">12 / 12</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-slate-500 text-sm">
                لم يتم إضافة أبناء مرتبطين بحساب ولي الأمر حالياً.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "installments" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="text-primary" /> حالة الأقساط المالية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-xl bg-slate-50 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-800">القسط الأول للسنة الدراسية</h4>
                <p className="text-xs text-slate-500">حالة السداد: مكتمل</p>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
                مدفوع
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
