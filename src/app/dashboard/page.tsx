"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ManagementDashboard } from "@/components/dashboard/management-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<
    "director" | "vice_director" | "teacher" | "student" | "parent" | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      // 1. فحص هل هناك مستخدم تجريبي في التخزين المحلي
      const stored = localStorage.getItem("demo_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.role) {
            setRole(parsed.role);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 2. فحص سوبابيس الحقيقي
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (profile?.role) {
            setRole(profile.role);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Supabase auth check:", err);
      }

      // افتراضياً في بيئة الاستعراض نفتح لوحة المدير
      setRole("director");
      setLoading(false);
    }

    checkAuth();
  }, [router]);

  if (loading || !role) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>جارٍ تحميل لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* شريط تبديل سريع للأدوار أثناء العرض التوضيحي */}
      <div className="bg-slate-900 text-white text-xs py-1.5 px-4 flex flex-wrap items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">معاينة الدور الحالي:</span>
          <span className="font-bold text-blue-400">
            {role === "director"
              ? "المدير العام"
              : role === "vice_director"
              ? "معاون المدير"
              : role === "teacher"
              ? "معلم"
              : role === "student"
              ? "طالب"
              : "ولي أمر"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] text-slate-400 ml-1">تبديل فوري:</span>
          <button
            onClick={() => setRole("director")}
            className={`px-2 py-0.5 rounded text-[11px] transition ${
              role === "director" ? "bg-blue-600 font-bold" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            مدير
          </button>
          <button
            onClick={() => setRole("vice_director")}
            className={`px-2 py-0.5 rounded text-[11px] transition ${
              role === "vice_director" ? "bg-blue-600 font-bold" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            معاون
          </button>
          <button
            onClick={() => setRole("teacher")}
            className={`px-2 py-0.5 rounded text-[11px] transition ${
              role === "teacher" ? "bg-emerald-600 font-bold" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            مدرس
          </button>
          <button
            onClick={() => setRole("student")}
            className={`px-2 py-0.5 rounded text-[11px] transition ${
              role === "student" ? "bg-amber-600 font-bold" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            طالب
          </button>
          <button
            onClick={() => setRole("parent")}
            className={`px-2 py-0.5 rounded text-[11px] transition ${
              role === "parent" ? "bg-purple-600 font-bold" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            ولي أمر
          </button>
        </div>
      </div>

      {/* عرض لوحة التحكم المناسبة */}
      {role === "director" && <ManagementDashboard userRole="director" />}
      {role === "vice_director" && <ManagementDashboard userRole="vice_director" />}
      {role === "teacher" && <TeacherDashboard />}
      {role === "student" && <StudentDashboard />}
      {role === "parent" && <ParentDashboard />}
    </div>
  );
}
