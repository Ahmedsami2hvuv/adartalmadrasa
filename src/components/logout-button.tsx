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
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    } finally {
      router.replace("/login");
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
