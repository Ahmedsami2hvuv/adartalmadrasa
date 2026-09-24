import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: students, error } = await supabase
      .from("students")
      .select(`
        id,
        qr_code,
        points,
        academic_year,
        profiles ( full_name, phone ),
        classes ( id, name, section ),
        parents ( id, profiles ( full_name, phone ) )
      `);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ students });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, classId, parentName, parentPhone, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "اسم الطالب مطلوب." }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();
    const defaultPassword = password?.trim() || "123456";

    // 1. إنشاء حساب وسجل ولي الأمر
    const cleanParentPhone = (parentPhone || "").replace(/[^0-9]/g, "");
    const randomParentSuffix = Math.floor(1000 + Math.random() * 9000);
    const parentEmail = cleanParentPhone
      ? `parent_${cleanParentPhone}@login.adartalmadrasa.local`
      : `parent_${Date.now()}_${randomParentSuffix}@login.adartalmadrasa.local`;

    let parentUserId: string | null = null;
    try {
      const { data: parentCreated } = await adminSupabase.auth.admin.createUser({
        email: parentEmail,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { role: "parent", full_name: (parentName || "ولي أمر").trim() },
      });
      if (parentCreated?.user) parentUserId = parentCreated.user.id;
    } catch (e) {
      console.warn("Parent createUser error:", e);
    }

    if (!parentUserId) {
      const serverClient = createServerSupabaseClient();
      const { data: parentSignUp } = await serverClient.auth.signUp({
        email: parentEmail,
        password: defaultPassword,
      });
      parentUserId = parentSignUp?.user?.id || null;
    }

    let parentRecordId: string | null = null;
    if (parentUserId) {
      await adminSupabase.from("profiles").upsert({
        id: parentUserId,
        role: "parent",
        full_name: (parentName || "ولي أمر").trim(),
        phone: parentPhone || null,
        password: defaultPassword,
        is_active: true,
      });

      const { data: parentRec } = await adminSupabase
        .from("parents")
        .upsert({ profile_id: parentUserId })
        .select("id")
        .single();
      if (parentRec) parentRecordId = parentRec.id;
    }

    // 2. إنشاء حساب وسجل الطالب
    const randomStudentSuffix = Math.floor(1000 + Math.random() * 9000);
    const studentEmail = `student_${Date.now()}_${randomStudentSuffix}@login.adartalmadrasa.local`;

    let studentUserId: string | null = null;
    try {
      const { data: studentCreated } = await adminSupabase.auth.admin.createUser({
        email: studentEmail,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { role: "student", full_name: name.trim() },
      });
      if (studentCreated?.user) studentUserId = studentCreated.user.id;
    } catch (e) {
      console.warn("Student createUser error:", e);
    }

    if (!studentUserId) {
      const serverClient = createServerSupabaseClient();
      const { data: studentSignUp } = await serverClient.auth.signUp({
        email: studentEmail,
        password: defaultPassword,
      });
      studentUserId = studentSignUp?.user?.id || null;
    }

    if (!studentUserId) {
      throw new Error("تعذر إنشاء حساب الطالب في سوبابيس.");
    }

    await adminSupabase.from("profiles").upsert({
      id: studentUserId,
      role: "student",
      full_name: name.trim(),
      password: defaultPassword,
      is_active: true,
    });

    const qrCode = `STU-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: studentRecord, error: studentError } = await adminSupabase
      .from("students")
      .insert({
        profile_id: studentUserId,
        class_id: classId || null,
        parent_id: parentRecordId,
        qr_code: qrCode,
        academic_year: "2025-2026",
      })
      .select("id")
      .single();

    if (studentError) {
      console.error("students table error:", studentError);
      throw new Error(`تعذر حفظ سجل الطالب: ${studentError.message}`);
    }

    return NextResponse.json({
      success: true,
      student: {
        id: studentRecord.id,
        name: name.trim(),
        qrCode,
        classId,
        parentName: parentName || "ولي أمر",
        parentPhone: parentPhone || "-",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إضافة الطالب.";
    console.error("Add student error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
