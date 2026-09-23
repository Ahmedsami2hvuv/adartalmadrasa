import { createClient } from "@/lib/supabase/server";
import { InstallPWA } from "@/components/install-pwa";
import { LogoutButton } from "@/components/logout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, ClipboardCheck, TrendingUp } from "lucide-react";

const roleNames: Record<string, string> = { director: "المدير", vice_director: "معاون المدير", teacher: "المدرس", student: "الطالب", parent: "ولي الأمر" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("full_name, role").eq("id", user.id).single() : { data: null };
  const role = profile?.role ?? "director";
  const stats = [{ label: "إجمالي الطلاب", value: "—", icon: Users }, { label: "نسبة الحضور اليوم", value: "—", icon: ClipboardCheck }, { label: "الحصص اليوم", value: "—", icon: CalendarDays }, { label: "متوسط الأداء", value: "—", icon: TrendingUp }];
  return <main className="min-h-screen"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><h1 className="text-xl font-bold text-primary">إدارة المدرسة</h1><p className="text-sm text-muted-foreground">{roleNames[role]}{profile?.full_name ? ` — ${profile.full_name}` : ""}</p></div><div className="flex items-center gap-3"><InstallPWA /><LogoutButton /></div></div></header><div className="mx-auto max-w-7xl px-4 py-8"><h2 className="mb-6 text-2xl font-bold">مرحباً بك 👋</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <Card key={label}><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle><Icon size={20} className="text-primary" /></CardHeader><CardContent><p className="text-3xl font-bold">{value}</p></CardContent></Card>)}</div><Card className="mt-6"><CardHeader><CardTitle>مساحة العمل</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">تم تجهيز النظام. أضف بيانات Supabase وشغّل migration للبدء بإدارة الطلاب والجداول والحضور والدرجات.</p></CardContent></Card></div></main>;
}
