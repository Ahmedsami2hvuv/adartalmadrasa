"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // مسح كوكيز المصادقة المباشرة
      document.cookie = "auth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "auth_name=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";

      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    } finally {
      window.location.replace("/login");
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition"
      title="تسجيل الخروج من النظام"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>{loading ? "جارٍ الخروج..." : "تسجيل خروج"}</span>
    </button>
  );
}
