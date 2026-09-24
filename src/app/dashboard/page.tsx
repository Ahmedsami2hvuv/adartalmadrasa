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
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuthorizedUser() {
      try {
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          router.replace("/login");
          return;
        }

        // جلب الملف الشخصي والدور من سوبابيس
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name, is_active")
          .eq("id", session.user.id)
          .single();

        if (profileError || !profile) {
          console.error("Profile not found:", profileError);
          // في حال عدم العثور على الدور، فحص metadata
          const metaRole = session.user.user_metadata?.role as "director" | "vice_director" | "teacher" | "student" | "parent";
          if (metaRole) {
            setRole(metaRole);
            setUserName(session.user.user_metadata?.full_name || session.user.email || "المستخدم");
          } else {
            router.replace("/login");
            return;
          }
        } else {
          if (profile.is_active === false) {
            await supabase.auth.signOut();
            router.replace("/login");
            return;
          }
          setRole(profile.role);
          setUserName(profile.full_name);
        }
      } catch (err) {
        console.error("Dashboard Auth Error:", err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadAuthorizedUser();
  }, [router]);

  if (loading || !role) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-700 text-sm font-medium" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-slate-700 border-t-transparent rounded-full animate-spin" />
          <span>جارٍ التحقق من الصلاحيات وتهيئة لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  // عرض اللوحة المصرح بها فقط بناءً على الدور من قاعدة بيانات سوبابيس
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
