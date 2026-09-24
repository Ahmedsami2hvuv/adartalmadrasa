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
      localStorage.removeItem("demo_user");
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
      title="تسجيل الخروج"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>{loading ? "جارٍ الخروج..." : "خروج"}</span>
    </button>
  );
}
