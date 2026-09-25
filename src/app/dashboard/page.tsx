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
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthorizedUser() {
      try {
        // فحص الكوكيز أولاً (للدخول المباشر بكلمة المرور)
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(";").shift();
          return null;
        };

        const cookieRole = getCookie("auth_role") as "director" | "vice_director" | "teacher" | "student" | "parent" | null;
        const cookieName = getCookie("auth_name");
        const cookieId = getCookie("auth_id");

        const cleanName = (() => {
          if (!cookieName) return cookieRole === "director" ? "المدير العام" : "المعاون الإداري";
          try {
            let val = cookieName;
            if (val.includes("%")) {
              val = decodeURIComponent(val);
            }
            if (val.includes("%") || /^[A-Fa-f0-9%]+$/.test(val)) {
              return cookieRole === "director" ? "المدير العام" : "المعاون الإداري";
            }
            return val.trim() || (cookieRole === "director" ? "المدير العام" : "المعاون الإداري");
          } catch {
            return cookieRole === "director" ? "المدير العام" : "المعاون الإداري";
          }
        })();

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (cookieRole) {
          if (isMounted) {
            setRole(cookieRole);
            setUserName(cleanName);
            if (cookieId) setUserId(cookieId);
            setLoading(false);
          }
          return;
        }

        if (!session?.user) {
          // إذا لم يكن هناك جلسة ولا كوكيز، تحويل مباشر إلى شاشة الدخول
          window.location.replace("/login");
          return;
        }

        const userEmail = session.user.email || "";
        const userFullName = session.user.user_metadata?.full_name || userEmail.split("@")[0] || "المدير";

        let userRole: "director" | "vice_director" | "teacher" | "student" | "parent" = "director";
        let resolvedName = userFullName;

        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, full_name, is_active")
            .eq("id", session.user.id)
            .single();

          if (profile) {
            if (profile.is_active === false) {
              await supabase.auth.signOut();
              window.location.replace("/login");
              return;
            }
            if (profile.role) {
              userRole = profile.role;
            }
            if (profile.full_name) {
              resolvedName = profile.full_name;
            }
          } else if (session.user.user_metadata?.role) {
            userRole = session.user.user_metadata.role;
          }
        } catch (dbErr) {
          console.warn("Could not query profiles table, defaulting to director:", dbErr);
        }

        if (isMounted) {
          setRole(userRole);
          setUserName(resolvedName);
          setLoading(false);
        }
      } catch (err) {
        console.error("Dashboard Auth Error:", err);
        window.location.replace("/login");
      }
    }

    loadAuthorizedUser();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !role) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-slate-700 text-sm font-medium" dir="rtl">
        <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-xs text-center w-full">
          <div className="w-8 h-8 border-3 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-600">جارٍ تهيئة لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  // عرض اللوحة المصرح بها للمستخدم
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 selection:bg-slate-800 selection:text-white">
      {role === "director" && <ManagementDashboard userRole="director" currentUserName={userName} />}
      {role === "vice_director" && <ManagementDashboard userRole="vice_director" currentUserName={userName} />}
      {role === "teacher" && <TeacherDashboard currentUserName={userName} currentUserId={userId} />}
      {role === "student" && <StudentDashboard currentUserName={userName} />}
      {role === "parent" && <ParentDashboard currentUserName={userName} />}
    </div>
  );
}
