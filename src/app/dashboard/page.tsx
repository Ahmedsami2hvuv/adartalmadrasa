import { createClient } from "@/lib/supabase/server";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";
import { ManagementDashboard } from "@/components/dashboard/management-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";

const roleNames: Record<string, string> = {
  director: "المدير العام",
  vice_director: "معاون المدير",
  teacher: "المدرس",
  student: "الطالب",
  parent: "ولي الأمر",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, role").eq("id", user.id).single()
    : { data: null };

  const role = profile?.role ?? "director";

  return (
    <main className="min-h-screen bg-slate-50/50 pb-12">
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-primary">منصة إدارة المدرسة</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {roleNames[role]} {profile?.full_name ? `— ${profile.full_name}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <InstallPWA />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Render Dashboard Component According to User Role */}
        {(role === "director" || role === "vice_director") && (
          <ManagementDashboard userProfile={profile} />
        )}
        {role === "teacher" && <TeacherDashboard userProfile={profile} />}
        {role === "student" && <StudentDashboard userProfile={profile} />}
        {role === "parent" && <ParentDashboard userProfile={profile} />}
      </div>
    </main>
  );
}
