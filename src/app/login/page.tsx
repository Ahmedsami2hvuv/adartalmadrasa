"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const normalizedUsername = username.trim().toLowerCase();
    const internalEmail = `${normalizedUsername}@login.adartalmadrasa.local`;
    const { error: authError } = await createClient().auth.signInWithPassword({ email: internalEmail, password });
    if (authError) { setError("بيانات الدخول غير صحيحة"); setLoading(false); return; }
    window.location.assign("/dashboard");
  }

  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-950 to-teal-700 p-4">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <div className="mb-8 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl text-white">م</div><h1 className="text-2xl font-bold">إدارة المدرسة</h1><p className="mt-2 text-sm text-muted-foreground">سجّل الدخول للمتابعة</p></div>
      <label className="mb-2 block text-sm font-medium">اسم المستخدم</label>
      <input required minLength={3} autoComplete="username" placeholder="director أو vice" value={username} onChange={(e) => setUsername(e.target.value)} className="mb-4 h-11 w-full rounded-md border px-3 outline-none focus:ring-2 focus:ring-primary" dir="ltr" />
      <label className="mb-2 block text-sm font-medium">كلمة المرور</label>
      <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-5 h-11 w-full rounded-md border px-3 outline-none focus:ring-2 focus:ring-primary" dir="ltr" />
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Button disabled={loading} className="w-full">{loading ? "جارٍ الدخول..." : "تسجيل الدخول"}</Button>
    </form>
  </main>;
}
