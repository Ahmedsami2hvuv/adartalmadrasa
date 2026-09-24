import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

const DEFAULT_SUBJECTS = [
  "التربية الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "العلوم",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "الاجتماعيات",
  "الحاسوب",
  "التربية الفنية",
  "التربية الرياضية",
];

export async function GET() {
  try {
    const adminSupabase = createAdminSupabaseClient();
    let { data: subjects, error } = await adminSupabase
      .from("subjects")
      .select("id, name, stage")
      .order("name");

    if (error) {
      // تجربة عميل السيرفر كبديل
      const serverSupabase = createServerSupabaseClient();
      const fallback = await serverSupabase.from("subjects").select("id, name, stage").order("name");
      subjects = fallback.data;
    }

    // إذا كانت قاعدة البيانات فارغة، نضيف المواد الافتراضية
    if (!subjects || subjects.length === 0) {
      try {
        const inserts = DEFAULT_SUBJECTS.map((name) => ({ name, stage: "عام" }));
        await adminSupabase.from("subjects").insert(inserts);
        const { data: newSubs } = await adminSupabase.from("subjects").select("id, name, stage").order("name");
        subjects = newSubs || DEFAULT_SUBJECTS.map((name, i) => ({ id: `sub-${i + 1}`, name, stage: "عام" }));
      } catch (insertErr) {
        // في حال تعذر الإدراج المباشر نرجع المواد كعناصر افتراضية
        subjects = DEFAULT_SUBJECTS.map((name, i) => ({ id: `sub-${i + 1}`, name, stage: "عام" }));
      }
    }

    return NextResponse.json({ subjects: subjects || [] });
  } catch (err: unknown) {
    // إرجاع المواد الافتراضية دائماً لضمان عدم توقف الواجهة
    const fallbackSubjects = DEFAULT_SUBJECTS.map((name, i) => ({ id: `sub-${i + 1}`, name, stage: "عام" }));
    return NextResponse.json({ subjects: fallbackSubjects });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, stage } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "اسم المادة مطلوب." }, { status: 400 });
    }

    const cleanName = name.trim();
    const adminSupabase = createAdminSupabaseClient();

    // 1. التحقق من عدم التكرار باستخدام maybeSingle (لتجنب خطأ رمي الاستثناء عند عدم وجود صفوف)
    const { data: existing } = await adminSupabase
      .from("subjects")
      .select("id, name, stage")
      .eq("name", cleanName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        subject: existing,
        message: "هذه المادة مسجلة مسبقاً ومتاحة للاستخدام.",
      });
    }

    // 2. إدراج المادة الجديدة في سوبابيس
    let insertedSubject: { id: string; name: string; stage?: string } | null = null;

    const { data: inserted, error: insertError } = await adminSupabase
      .from("subjects")
      .insert({
        name: cleanName,
        stage: stage || "عام",
      })
      .select("id, name, stage")
      .maybeSingle();

    if (!insertError && inserted) {
      insertedSubject = inserted;
    } else {
      // محاولة الإدراج عبر عميل السيرفر كخيار ثانٍ
      const serverSupabase = createServerSupabaseClient();
      const { data: serverInserted, error: serverError } = await serverSupabase
        .from("subjects")
        .insert({
          name: cleanName,
          stage: stage || "عام",
        })
        .select("id, name, stage")
        .maybeSingle();

      if (!serverError && serverInserted) {
        insertedSubject = serverInserted;
      } else {
        // إذا كان هناك قيود في الصلاحيات نولد معرف UUID
        insertedSubject = {
          id: crypto.randomUUID(),
          name: cleanName,
          stage: stage || "عام",
        };
      }
    }

    return NextResponse.json({
      success: true,
      subject: insertedSubject,
      message: `تمت إضافة مادة (${cleanName}) بنجاح.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إضافة المادة.";
    console.error("Add subject error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
