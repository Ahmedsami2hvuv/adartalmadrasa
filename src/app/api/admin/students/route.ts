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

    // 2. إدخال ولي الأمر مباشرة في profiles
    let parentProfileId = crypto.randomUUID();
    let parentRecordId: string | null = null;

    try {
      const { error: pProfErr } = await adminSupabase.from("profiles").insert({
        id: parentProfileId,
        role: "parent",
        full_name: (parentName || "ولي أمر").trim(),
        phone: storedParentPhone,
        password: defaultPassword,
        is_active: true,
      });

      if (pProfErr) {
        // تجربة عبر عميل السيرفر
        await serverSupabase.from("profiles").insert({
          id: parentProfileId,
          role: "parent",
          full_name: (parentName || "ولي أمر").trim(),
          phone: storedParentPhone,
          password: defaultPassword,
          is_active: true,
        });
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

    // 3. إدخال الطالب مباشرة في profiles
    const studentProfileId = crypto.randomUUID();

    try {
      const { error: sProfErr } = await adminSupabase.from("profiles").insert({
        id: studentProfileId,
        role: "student",
        full_name: name.trim(),
        password: defaultPassword,
        is_active: true,
      });

      if (sProfErr) {
        await serverSupabase.from("profiles").insert({
          id: studentProfileId,
          role: "student",
          full_name: name.trim(),
          password: defaultPassword,
          is_active: true,
        });
      }
    } catch (e) {
      console.warn("Student profile insert error:", e);
    }

    const qrCode = `STU-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: studentRecord, error: studentError } = await adminSupabase
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

    let finalStudentId = studentRecord?.id;
    if (!finalStudentId) {
      const { data: sRecord } = await serverSupabase
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
      finalStudentId = sRecord?.id || crypto.randomUUID();
    }

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
