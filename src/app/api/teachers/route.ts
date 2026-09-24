import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { parseAndFormatPhone } from "@/lib/phone-utils";

export async function GET() {
  try {
    const adminSupabase = createAdminSupabaseClient();
    const serverSupabase = createServerSupabaseClient();

    // 1. محاولة جلب المعلمين عبر عميل الإدارة
    let teachersData: any[] = [];
    const { data: tData, error: tErr } = await adminSupabase.from("teachers").select("*");

    if (!tErr && tData) {
      teachersData = tData;
    } else {
      const { data: fallbackT } = await serverSupabase.from("teachers").select("*");
      teachersData = fallbackT || [];
    }

    // 2. جلب الملفات الشخصية لربط الأسماء والهواتف
    let profilesData: any[] = [];
    const { data: pData } = await adminSupabase.from("profiles").select("*");
    if (pData) {
      profilesData = pData;
    } else {
      const { data: fallbackP } = await serverSupabase.from("profiles").select("*");
      profilesData = fallbackP || [];
    }

    // 3. ربط كل معلم ببيانات ملفه الشخصي بدقة 100%
    const combinedTeachers = teachersData.map((t) => {
      const matchedProfile = profilesData.find(
        (p) => p.id === t.profile_id || p.id === t.id
      );

      return {
        id: t.id,
        profile_id: t.profile_id,
        name: matchedProfile?.full_name || t.name || "معلم",
        phone: matchedProfile?.phone || t.phone || "-",
        subject: t.specialization || (t.subjects && t.subjects[0]) || "عام",
        classes: t.classes || [],
        inviteToken: "TCH-" + t.id.substring(0, 6).toUpperCase(),
      };
    });

    return NextResponse.json({ teachers: combinedTeachers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message, teachers: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, subject, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "اسم المعلم مطلوب." }, { status: 400 });
    }

    const parsedPhone = parseAndFormatPhone(phone || "");
    const cleanPhoneDigits = parsedPhone.digitsOnly || Date.now().toString().slice(-8);
    const teacherPassword = password?.trim() || (cleanPhoneDigits.length >= 6 ? cleanPhoneDigits : "123456");
    const storedPhone = parsedPhone.whatsappNumber ? `+${parsedPhone.whatsappNumber}` : phone || null;

    const adminSupabase = createAdminSupabaseClient();
    const serverSupabase = createServerSupabaseClient();

    let teacherProfileId = crypto.randomUUID();
    let profileSaved = false;

    // 1. محاولة الإدخال في profiles عبر adminSupabase
    const { error: adminProfErr } = await adminSupabase.from("profiles").upsert({
      id: teacherProfileId,
      role: "teacher",
      full_name: name.trim(),
      phone: storedPhone,
      password: teacherPassword,
      is_active: true,
    });

    if (!adminProfErr) {
      profileSaved = true;
    } else {
      console.warn("adminSupabase profiles error:", adminProfErr.message);
      // تجربة serverSupabase
      const { error: serverProfErr } = await serverSupabase.from("profiles").upsert({
        id: teacherProfileId,
        role: "teacher",
        full_name: name.trim(),
        phone: storedPhone,
        password: teacherPassword,
        is_active: true,
      });

      if (!serverProfErr) {
        profileSaved = true;
      } else {
        console.warn("serverSupabase profiles error:", serverProfErr.message);
      }
    }

    // 2. إدخال سجل المعلم في جدول teachers
    let finalTeacherRecord: any = null;

    const { data: tInsert1, error: tErr1 } = await adminSupabase
      .from("teachers")
      .insert({
        profile_id: teacherProfileId,
        specialization: subject?.trim() || "عام",
        subjects: subject?.trim() ? [subject.trim()] : ["عام"],
      })
      .select("*")
      .maybeSingle();

    if (!tErr1 && tInsert1) {
      finalTeacherRecord = tInsert1;
    } else {
      console.warn("adminSupabase teachers error:", tErr1?.message);
      const { data: tInsert2, error: tErr2 } = await serverSupabase
        .from("teachers")
        .insert({
          profile_id: teacherProfileId,
          specialization: subject?.trim() || "عام",
          subjects: subject?.trim() ? [subject.trim()] : ["عام"],
        })
        .select("*")
        .maybeSingle();

      if (!tErr2 && tInsert2) {
        finalTeacherRecord = tInsert2;
      } else {
        console.error("serverSupabase teachers error:", tErr2?.message);
        // إذا فشل الإدخالان نرجع سبب الخطأ الصريح من سوبابيس
        const reason = tErr2?.message || tErr1?.message || "فشل إدراج المعلم في قاعدة البيانات.";
        return NextResponse.json({ error: `خطأ قاعدة البيانات: ${reason}` }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: finalTeacherRecord.id,
        profile_id: teacherProfileId,
        name: name.trim(),
        phone: storedPhone || "-",
        subject: subject?.trim() || "عام",
        password: teacherPassword,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المعلم.";
    console.error("Add teacher fatal error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
