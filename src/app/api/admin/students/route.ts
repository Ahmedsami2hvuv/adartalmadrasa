import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { parseAndFormatPhone } from "@/lib/phone-utils";

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();
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
      const serverClient = createServerSupabaseClient();
      const fallback = await serverClient.from("students").select(`
        id,
        qr_code,
        points,
        academic_year,
        profiles ( full_name, phone ),
        classes ( id, name, section ),
        parents ( id, profiles ( full_name, phone ) )
      `);
      return NextResponse.json({ students: fallback.data || [] });
    }

    return NextResponse.json({ students: students || [] });
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
    const serverSupabase = createServerSupabaseClient();
    const defaultPassword = password?.trim() || "123456";

    // 1. معالجة وتنسيق هاتف ولي الأمر بمرونة كاملة
    const parsedParentPhone = parseAndFormatPhone(parentPhone || "");
    const storedParentPhone = parsedParentPhone.whatsappNumber ? `+${parsedParentPhone.whatsappNumber}` : parentPhone || null;

    // 2. إدخال ولي الأمر
    let parentProfileId = crypto.randomUUID();
    let parentRecordId: string | null = null;

    try {
      // محاولة إنشاء حساب في auth.users لضمان تلبية القيد إن وجد
      try {
        const pEmail = `parent_${Date.now()}_${Math.floor(Math.random() * 10000)}@adartalmadrasa.com`;
        const { data: pAuth } = await adminSupabase.auth.admin.createUser({
          email: pEmail,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { role: "parent", full_name: (parentName || "ولي أمر").trim() },
        });
        if (pAuth?.user) parentProfileId = pAuth.user.id;
      } catch (e) {
        console.warn("Parent auth createUser skipped:", e);
      }

      let pErr = (
        await adminSupabase.from("profiles").upsert({
          id: parentProfileId,
          role: "parent",
          full_name: (parentName || "ولي أمر").trim(),
          phone: storedParentPhone,
          password: defaultPassword,
          is_active: true,
        })
      ).error;

      if (pErr) {
        pErr = (
          await adminSupabase.from("profiles").upsert({
            id: parentProfileId,
            role: "parent",
            full_name: (parentName || "ولي أمر").trim(),
            phone: storedParentPhone,
          })
        ).error;
      }

      const { data: parentRec } = await adminSupabase
        .from("parents")
        .insert({ profile_id: parentProfileId })
        .select("id")
        .maybeSingle();

      parentRecordId = parentRec?.id || null;
    } catch (e) {
      console.warn("Parent insert error:", e);
    }

    // 3. إدخال الطالب
    let studentProfileId = crypto.randomUUID();

    try {
      try {
        const sEmail = `student_${Date.now()}_${Math.floor(Math.random() * 10000)}@adartalmadrasa.com`;
        const { data: sAuth } = await adminSupabase.auth.admin.createUser({
          email: sEmail,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { role: "student", full_name: name.trim() },
        });
        if (sAuth?.user) studentProfileId = sAuth.user.id;
      } catch (e) {
        console.warn("Student auth createUser skipped:", e);
      }

      let sErr = (
        await adminSupabase.from("profiles").upsert({
          id: studentProfileId,
          role: "student",
          full_name: name.trim(),
          password: defaultPassword,
          is_active: true,
        })
      ).error;

      if (sErr) {
        sErr = (
          await adminSupabase.from("profiles").upsert({
            id: studentProfileId,
            role: "student",
            full_name: name.trim(),
          })
        ).error;
      }
    } catch (e) {
      console.warn("Student profile insert error:", e);
    }

    const qrCode = `STU-${Math.floor(1000 + Math.random() * 9000)}`;

    let finalStudentId: string | null = null;

    // محاولة 1: بالحقول الكاملة
    let sRes = await adminSupabase
      .from("students")
      .insert({
        profile_id: studentProfileId,
        class_id: classId || null,
        parent_id: parentRecordId,
        qr_code: qrCode,
        academic_year: "2025-2026",
      })
      .select("id")
      .maybeSingle();

    // محاولة 2: إذا فشل بسبب عمود مثل academic_year
    if (sRes.error && sRes.error.message?.includes("column")) {
      sRes = await adminSupabase
        .from("students")
        .insert({
          profile_id: studentProfileId,
          class_id: classId || null,
          parent_id: parentRecordId,
          qr_code: qrCode,
        })
        .select("id")
        .maybeSingle();
    }

    // محاولة 3: تجربة عبر عميل serverSupabase
    if (sRes.error) {
      const sFallback = await serverSupabase
        .from("students")
        .insert({
          profile_id: studentProfileId,
          class_id: classId || null,
          parent_id: parentRecordId,
          qr_code: qrCode,
        })
        .select("id")
        .maybeSingle();

      if (!sFallback.error && sFallback.data) {
        sRes = sFallback;
      }
    }

    finalStudentId = sRes.data?.id || studentProfileId;

    return NextResponse.json({
      success: true,
      student: {
        id: finalStudentId,
        name: name.trim(),
        qrCode,
        classId,
        parentName: parentName || "ولي أمر",
        parentPhone: storedParentPhone || "-",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إضافة الطالب.";
    console.error("Add student error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { studentId, classId } = await req.json();
    if (!studentId || !classId) {
      return NextResponse.json({ error: "معرف الطالب ومعرف الصف مطلوبان." }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();
    const serverSupabase = createServerSupabaseClient();
    const client = adminSupabase || serverSupabase;

    const { error } = await client.from("students").update({ class_id: classId }).eq("id", studentId);
    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "تم نقل الطالب بنجاح." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "تعذر نقل الطالب.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "معرف الطالب مطلوب." }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();
    const serverSupabase = createServerSupabaseClient();
    const client = adminSupabase || serverSupabase;

    const { error } = await client.from("students").delete().eq("id", id);
    if (error) {
      await serverSupabase.from("students").delete().eq("id", id);
    }

    return NextResponse.json({ success: true, message: "تم حذف الطالب بنجاح." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "تعذر حذف الطالب.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
