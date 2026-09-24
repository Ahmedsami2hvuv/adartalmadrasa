import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || !password.trim()) {
      return NextResponse.json(
        { error: "يرجى إدخال كلمة المرور." },
        { status: 400 }
      );
    }

    const cleanPassword = password.trim();
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

    // 1. محاولة مطابقة كلمة المرور مع الحسابات المسجلة في Supabase Auth
    // نجرب الإيميلات المحتملة للمدير أو الحساب الإداري
    const possibleAdminEmails = [
      "admin@school.com",
      "admin@school.edu",
      "director@school.com",
      "manager@school.com",
    ];

    if (supabaseUrl && !supabaseUrl.includes("dummyproject")) {
      const supabaseServer = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options) { cookieStore.set({ name, value: "", ...options }); },
        },
      });

      // تجربة تسجيل الدخول بحسابات الأدمن
      for (const email of possibleAdminEmails) {
        try {
          const { data, error } = await supabaseServer.auth.signInWithPassword({
            email,
            password: cleanPassword,
          });

          if (!error && data?.user) {
            const { data: prof } = await supabaseServer
              .from("profiles")
              .select("role, full_name")
              .eq("id", data.user.id)
              .single();

            const role = prof?.role || "director";
            const name = prof?.full_name || "المدير العام";

            cookieStore.set("auth_role", role, { path: "/", httpOnly: false });
            cookieStore.set("auth_name", encodeURIComponent(name), { path: "/", httpOnly: false });

            return NextResponse.json({
              success: true,
              role,
              name,
            });
          }
        } catch (e) {
          // استمرار الفحص
        }
      }

      // 2. البحث في جدول profiles عن تطابق حقل password
      try {
        const { data: matchedProfiles } = await supabaseServer
          .from("profiles")
          .select("id, role, full_name, is_active")
          .eq("password", cleanPassword)
          .limit(1);

        if (matchedProfiles && matchedProfiles.length > 0) {
          const matched = matchedProfiles[0];
          if (matched.is_active === false) {
            return NextResponse.json({ error: "هذا الحساب معطل حالياً من قبل الإدارة." }, { status: 403 });
          }

          cookieStore.set("auth_role", matched.role, { path: "/", httpOnly: false });
          cookieStore.set("auth_name", encodeURIComponent(matched.full_name || "مستخدم"), { path: "/", httpOnly: false });

          return NextResponse.json({
            success: true,
            role: matched.role,
            name: matched.full_name,
          });
        }
      } catch (dbErr) {
        console.warn("Profiles password check:", dbErr);
      }
    }

    // 3. مطابقة كلمات المرور الافتراضية المباشرة (مثل كلمة مرور الإدارة الشائعة)
    // إذا تطابقت مع كلمات مرور النظام، يدخل كمدير
    if (cleanPassword === "admin" || cleanPassword === "admin123" || cleanPassword === "123456" || cleanPassword === "school2025" || cleanPassword === "school2026") {
      cookieStore.set("auth_role", "director", { path: "/", httpOnly: false });
      cookieStore.set("auth_name", encodeURIComponent("المدير العام"), { path: "/", httpOnly: false });
      return NextResponse.json({
        success: true,
        role: "director",
        name: "المدير العام",
      });
    }

    // إذا كانت كلمة المرور غير صحيحة
    return NextResponse.json(
      { error: "كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة." },
      { status: 401 }
    );
  } catch (error) {
    console.error("Password login error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة تسجيل الدخول." },
      { status: 500 }
    );
  }
}
