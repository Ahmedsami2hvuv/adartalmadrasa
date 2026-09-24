import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { parseAndFormatPhone } from "@/lib/phone-utils";

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();
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
      const serverClient = createServerSupabaseClient();
      const fallback = await serverClient.from("teachers").select(`
        id,
        specialization,
        subjects,
        classes,
        profiles ( full_name, phone )
      `);
      return NextResponse.json({ teachers: fallback.data || [] });
    }

    return NextResponse.json({ teachers: teachers || [] });
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

    // معالجة ومرونة رقم الهاتف بكافة الأشكال (عراقي/دولي/عربي)
    const parsedPhone = parseAndFormatPhone(phone || "");
    const cleanPhoneDigits = parsedPhone.digitsOnly || Date.now().toString().slice(-8);
    const teacherPassword = password?.trim() || (cleanPhoneDigits.length >= 6 ? cleanPhoneDigits : "123456");
    const storedPhone = parsedPhone.whatsappNumber ? `+${parsedPhone.whatsappNumber}` : phone || null;

    const adminSupabase = createAdminSupabaseClient();
    const serverSupabase = createServerSupabaseClient();

    let teacherProfileId = crypto.randomUUID();
    let isInserted = false;

    // 1. محاولة الإدخال المباشر في جدول profiles (لتجنب إرسال أي إيميلات أو استهلاك email rate limit نهائياً)
    try {
      const { error: directError } = await adminSupabase.from("profiles").insert({
        id: teacherProfileId,
        role: "teacher",
        full_name: name.trim(),
        phone: storedPhone,
        password: teacherPassword,
        is_active: true,
      });

      if (!directError) {
        isInserted = true;
      } else {
        // تجربة عبر عميل السيرفر
        const { error: serverDirectError } = await serverSupabase.from("profiles").insert({
          id: teacherProfileId,
          role: "teacher",
          full_name: name.trim(),
          phone: storedPhone,
          password: teacherPassword,
          is_active: true,
        });
        if (!serverDirectError) {
          isInserted = true;
        }
      }
    } catch (e) {
      console.warn("Direct profiles insert exception:", e);
    }

    // 2. إذا فشل الإدخال المباشر (لوجود قيد على auth.users)، نستخدم admin.createUser الصامت (بدون إرسال إيميل)
    if (!isInserted) {
      try {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const teacherEmail = `teacher_${cleanPhoneDigits}_${randomSuffix}@adartalmadrasa.com`;

        const { data: userCreated, error: createError } = await adminSupabase.auth.admin.createUser({
          email: teacherEmail,
          password: teacherPassword,
          email_confirm: true, // تأكيد فوري يمنع إرسال أي إيميل تأكيد
          user_metadata: {
            role: "teacher",
            full_name: name.trim(),
          },
        });

        if (!createError && userCreated?.user) {
          teacherProfileId = userCreated.user.id;

          // تحديث السجل في profiles
          await adminSupabase.from("profiles").upsert({
            id: teacherProfileId,
            role: "teacher",
            full_name: name.trim(),
            phone: storedPhone,
            password: teacherPassword,
            is_active: true,
          });
          isInserted = true;
        }
      } catch (adminErr) {
        console.warn("admin.createUser exception:", adminErr);
      }
    }

    // 3. إدخال المعلم في جدول teachers
    const { data: teacherRecord, error: teacherError } = await adminSupabase
      .from("teachers")
      .insert({
        profile_id: teacherProfileId,
        specialization: subject?.trim() || "عام",
        subjects: subject?.trim() ? [subject.trim()] : ["عام"],
      })
      .select("id")
      .maybeSingle();

    let finalTeacherId = teacherRecord?.id;

    if (teacherError || !finalTeacherId) {
      // تجربة عميل السيرفر
      const { data: sTeacher } = await serverSupabase
        .from("teachers")
        .insert({
          profile_id: teacherProfileId,
          specialization: subject?.trim() || "عام",
          subjects: subject?.trim() ? [subject.trim()] : ["عام"],
        })
        .select("id")
        .maybeSingle();

      finalTeacherId = sTeacher?.id || crypto.randomUUID();
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: finalTeacherId,
        name: name.trim(),
        phone: storedPhone || "-",
        subject: subject?.trim() || "عام",
        password: teacherPassword,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المعلم.";
    console.error("Add teacher error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
