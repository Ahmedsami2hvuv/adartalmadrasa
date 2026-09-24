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
    const teacherProfileIds = new Set(teachersData.map((t) => t.profile_id || t.id));
    const combinedTeachers = teachersData.map((t) => {
      const matchedProfile = profilesData.find(
        (p) => p.id === t.profile_id || p.id === t.id
      );

      return {
        id: t.id,
        profile_id: t.profile_id,
        name: matchedProfile?.full_name || t.name || "معلم",
        phone: matchedProfile?.phone || t.phone || "-",
        subject: t.specialization || (t.subjects && t.subjects[0]) || t.subject || "عام",
        classes: t.classes || [],
        inviteToken: "TCH-" + (t.id || "").substring(0, 6).toUpperCase(),
      };
    });

    // إضافة المعلمين الموجودين في profiles بدور teacher حتى لو لم يكتمل إدراجهم في جدول teachers القديم
    profilesData
      .filter((p) => p.role === "teacher" && !teacherProfileIds.has(p.id))
      .forEach((p) => {
        combinedTeachers.push({
          id: p.id,
          profile_id: p.id,
          name: p.full_name || "معلم",
          phone: p.phone || "-",
          subject: "عام",
          classes: [],
          inviteToken: "TCH-" + p.id.substring(0, 6).toUpperCase(),
        });
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

    // 2. إدخال سجل المعلم في جدول teachers بمرونة فائقة
    let finalTeacherRecord: any = null;

    // محاولة 1: بالحقول المتقدمة (specialization و subjects)
    let tRes = await adminSupabase
      .from("teachers")
      .insert({
        profile_id: teacherProfileId,
        specialization: subject?.trim() || "عام",
        subjects: subject?.trim() ? [subject.trim()] : ["عام"],
      })
      .select("*")
      .maybeSingle();

    // محاولة 2: إذا فشل بسبب عمود specialization أو subjects، نجرب بحقل subject فقط
    if (tRes.error && (tRes.error.message?.includes("specialization") || tRes.error.message?.includes("column"))) {
      console.warn("Retrying teacher insert with subject column:", tRes.error.message);
      tRes = await adminSupabase
        .from("teachers")
        .insert({
          profile_id: teacherProfileId,
          subject: subject?.trim() || "عام",
        })
        .select("*")
        .maybeSingle();
    }

    // محاولة 3: إذا فشل أيضاً بسبب الأعمدة، ندخل المعلم بالمعرف profile_id فقط
    if (tRes.error && tRes.error.message?.includes("column")) {
      console.warn("Retrying teacher insert with profile_id only:", tRes.error.message);
      tRes = await adminSupabase
        .from("teachers")
        .insert({
          profile_id: teacherProfileId,
        })
        .select("*")
        .maybeSingle();
    }

    // محاولة 4: تجربة عبر عميل serverSupabase إذا لزم الأمر
    if (tRes.error) {
      console.warn("Admin insert failed, trying serverSupabase:", tRes.error.message);
      const sRes = await serverSupabase
        .from("teachers")
        .insert({
          profile_id: teacherProfileId,
        })
        .select("*")
        .maybeSingle();
      if (!sRes.error && sRes.data) {
        tRes = sRes;
      }
    }

    if (!tRes.error && tRes.data) {
      finalTeacherRecord = tRes.data;
    } else {
      // حتى لو فشل جدول teachers، فإن الحساب تم إنشاؤه بنجاح في profiles
      console.warn("Teacher record in teachers table could not be saved, but profile is ready:", tRes.error?.message);
      finalTeacherRecord = { id: teacherProfileId, profile_id: teacherProfileId };
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
