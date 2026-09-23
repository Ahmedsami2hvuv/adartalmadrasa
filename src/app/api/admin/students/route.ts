import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { full_name, phone, class_id } = await req.json();

    if (!full_name) {
      return NextResponse.json({ error: "اسم الطالب مطلوب" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Generate unique internal login email & password for student
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const internalEmail = `st_${timestamp}_${randomSuffix}@adartalmadrasa.local`;
    const tempPassword = `stPass${timestamp}`;

    // 2. Create auth user for the student
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: internalEmail,
      password: tempPassword,
      options: {
        data: {
          full_name: full_name.trim(),
          role: "student"
        }
      }
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "فشل إنشاء حساب الطالب" }, { status: 500 });
    }

    const userId = authData.user.id;

    // 3. Ensure profile exists or updated with role student and name
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: full_name.trim(),
      phone: phone || null,
      role: "student"
    });

    // 4. Create student record with assigned class_id
    const { data: studentRecord, error: studentError } = await supabaseAdmin.from("students").insert({
      profile_id: userId,
      class_id: class_id || null
    }).select("*, profiles(full_name), classes(name, section)").single();

    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تم إضافة الطالب وتوزيعه بنجاح",
      student: studentRecord,
      credentials: {
        username: internalEmail.split("@")[0],
        password: tempPassword
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
