"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // مسح كوكيز المصادقة المباشرة
      document.cookie = "auth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "auth_name=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "auth_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";

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
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition ${className}`}
      title="تسجيل الخروج من النظام"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>{loading ? "جارٍ الخروج..." : "تسجيل خروج"}</span>
    </button>
  );
}
