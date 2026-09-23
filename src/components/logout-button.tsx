"use client";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return <Button className="bg-transparent text-muted-foreground hover:bg-muted" onClick={() => createClient().auth.signOut().then(() => window.location.assign("/login"))}><LogOut size={16} className="ml-2" /> تسجيل الخروج</Button>;
}
