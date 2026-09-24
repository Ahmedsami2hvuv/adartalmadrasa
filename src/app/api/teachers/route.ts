import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: teachers, error } = await supabase
      .from("teachers")
      .select(`
        id,
        specialization,
        subjects,
        classes,
        profiles ( full_name, phone )
      `);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ teachers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, subject, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "اسم المعلم مطلوب." }, { status: 400 });
    }

    const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
    const teacherPassword = password?.trim() || (cleanPhone.length >= 6 ? cleanPhone : "123456");
    const adminSupabase = createAdminSupabaseClient();

    // 1. توليد إيميل رسمي للمعلم
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const teacherEmail = cleanPhone
      ? `teacher_${cleanPhone}@login.adartalmadrasa.local`
      : `teacher_${Date.now()}_${randomSuffix}@login.adartalmadrasa.local`;

    let userId: string | null = null;

    // محاولة إنشاء الحساب عبر admin.createUser
    try {
      const { data: userCreated, error: createError } = await adminSupabase.auth.admin.createUser({
        email: teacherEmail,
        password: teacherPassword,
        email_confirm: true,
        user_metadata: {
          role: "teacher",
          full_name: name.trim(),
        },
      });

      if (!createError && userCreated?.user) {
        userId = userCreated.user.id;
      } else {
        console.warn("admin.createUser error:", createError);
      }
    } catch (e) {
      console.warn("admin.createUser exception:", e);
    }

    // إذا فشل admin (مثلاً في حال عدم توفر Service Role Key)، نستخدم signUp كبديل
    if (!userId) {
      const serverClient = createServerSupabaseClient();
      const { data: signUpData, error: signUpError } = await serverClient.auth.signUp({
        email: teacherEmail,
        password: teacherPassword,
        options: {
          data: {
            role: "teacher",
            full_name: name.trim(),
          },
        },
      });

      if (signUpError || !signUpData.user) {
        throw new Error(signUpError?.message || "فشل إنشاء حساب المعلم في سوبابيس.");
      }
      userId = signUpData.user.id;
    }

    // 2. إدخال أو تحديث الملف الشخصي في profiles
    const { error: profileError } = await adminSupabase.from("profiles").upsert({
      id: userId,
      role: "teacher",
      full_name: name.trim(),
      phone: phone || null,
      password: teacherPassword,
      is_active: true,
    });

    if (profileError) {
      console.error("profiles insert error:", profileError);
      throw new Error(`خطأ في حفظ الملف الشخصي: ${profileError.message}`);
    }

    // 3. إدخال المعلم في جدول teachers
    const { data: teacherRecord, error: teacherError } = await adminSupabase
      .from("teachers")
      .insert({
        profile_id: userId,
        specialization: subject?.trim() || "عام",
        subjects: subject?.trim() ? [subject.trim()] : ["عام"],
      })
      .select("id")
      .single();

    if (teacherError) {
      console.error("teachers insert error:", teacherError);
      throw new Error(`خطأ في حفظ سجل المعلم: ${teacherError.message}`);
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: teacherRecord.id,
        name: name.trim(),
        phone: phone || "-",
        subject: subject?.trim() || "عام",
        email: teacherEmail,
        password: teacherPassword,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إضافة المعلم.";
    console.error("Add teacher error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
