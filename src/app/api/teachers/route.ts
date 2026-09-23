import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "غير مصرح لك بالوصول" }, { status: 401 });
    }

    // التأكد من أن المستخدم الحالي هو مدير أو معاون مدير
    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "director" && profile.role !== "vice_director")) {
      return NextResponse.json({ error: "هذه الصلاحية متاحة لمدير المدرسة فقط" }, { status: 403 });
    }

    const { fullName, username, password, phone } = await req.json();

    if (!fullName || !username || !password) {
      return NextResponse.json({ error: "يرجى ملء جميع الحقول المطلوبة" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const internalEmail = `${cleanUsername}@login.adartalmadrasa.local`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // استخدام عميل مخصص بدون حفظ الجلسة حتى لا تؤثر على حساب المدير الحالي
    const tempSupabase = createAdminClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // إنشاء حساب جديد في Supabase Auth
    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
      email: internalEmail,
      password: password,
      options: {
        data: {
          full_name: fullName,
          role: "teacher"
        }
      }
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "حدث خطأ أثناء إنشاء حساب المدرس" },
        { status: 400 }
      );
    }

    const teacherUserId = authData.user.id;

    // تحديث ملف البروفايل ورقم الهاتف
    await supabaseServer
      .from("profiles")
      .upsert({
        id: teacherUserId,
        full_name: fullName,
        phone: phone || null,
        role: "teacher"
      });

    // إضافة المدرس إلى جدول المدرسين (teachers)
    const { data: existingTeacher } = await supabaseServer
      .from("teachers")
      .select("id")
      .eq("profile_id", teacherUserId)
      .maybeSingle();

    if (!existingTeacher) {
      await supabaseServer.from("teachers").insert({
        profile_id: teacherUserId
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم إضافة المدرس بنجاح!",
      teacher: {
        id: teacherUserId,
        fullName,
        username: cleanUsername,
        phone
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "حدث خطأ غير متوقع في السيرفر" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("id");

    if (!teacherId) {
      return NextResponse.json({ error: "معرف المدرس مطلوب" }, { status: 400 });
    }

    // حذف المدرس من جدول teachers
    const { error } = await supabaseServer.from("teachers").delete().eq("id", teacherId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "تم حذف المدرس بنجاح" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
