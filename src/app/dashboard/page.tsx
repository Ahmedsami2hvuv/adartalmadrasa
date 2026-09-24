"use client";

import React, { useEffect, useState } from "react";
import { ManagementDashboard } from "@/components/dashboard/management-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [role, setRole] = useState<
    "director" | "vice_director" | "teacher" | "student" | "parent" | null
  >(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // مهلة أمان قاطعة: إذا استغرق التحقق أكثر من ثانية ونصف، نوجه فوراً لصفحة الدخول
    const timeoutTimer = setTimeout(() => {
      if (isMounted && !role) {
        window.location.replace("/login");
      }
    }, 1500);

    async function loadAuthorizedUser() {
      try {
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          clearTimeout(timeoutTimer);
          window.location.replace("/login");
          return;
        }

        // جلب الملف الشخصي والدور من سوبابيس
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name, is_active")
          .eq("id", session.user.id)
          .single();

        if (!isMounted) return;

        if (profile?.role) {
          if (profile.is_active === false) {
            await supabase.auth.signOut();
            window.location.replace("/login");
            return;
          }
          clearTimeout(timeoutTimer);
          setRole(profile.role);
          setUserName(profile.full_name || "");
          setLoading(false);
          return;
        }

        // فحص بديل من metadata
        const metaRole = session.user.user_metadata?.role as "director" | "vice_director" | "teacher" | "student" | "parent";
        if (metaRole) {
          clearTimeout(timeoutTimer);
          setRole(metaRole);
          setUserName(session.user.user_metadata?.full_name || "");
          setLoading(false);
          return;
        }

        // إذا لم يكن لديه دور مصرح به، توجيهه لصفحة الدخول
        clearTimeout(timeoutTimer);
        window.location.replace("/login");
      } catch (err) {
        console.error("Dashboard Auth Error:", err);
        clearTimeout(timeoutTimer);
        window.location.replace("/login");
      }
    }

    loadAuthorizedUser();

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
    };
  }, [role]);

  if (loading || !role) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-slate-700 text-sm font-medium" dir="rtl">
        <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-xs text-center w-full">
          <div className="w-8 h-8 border-3 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-600">جارٍ التحقق من الصلاحيات...</span>
          <button
            onClick={() => window.location.replace("/login")}
            className="mt-2 text-xs text-slate-800 underline font-semibold hover:text-slate-900"
          >
            الانتقال لصفحة تسجيل الدخول فوراً
          </button>
        </div>
      </div>
    );
  }

  // عرض اللوحة المصرح بها فقط
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 selection:bg-slate-800 selection:text-white">
      {role === "director" && <ManagementDashboard userRole="director" currentUserName={userName} />}
      {role === "vice_director" && <ManagementDashboard userRole="vice_director" currentUserName={userName} />}
      {role === "teacher" && <TeacherDashboard currentUserName={userName} />}
      {role === "student" && <StudentDashboard currentUserName={userName} />}
      {role === "parent" && <ParentDashboard currentUserName={userName} />}
    </div>
  );
}
