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
    const supabase = createAdminSupabaseClient();
    let { data: subjects, error } = await supabase
      .from("subjects")
      .select("id, name, stage")
      .order("name");

    // إذا كانت قاعدة البيانات فارغة، نضيف المواد الافتراضية
    if (!error && (!subjects || subjects.length === 0)) {
      const inserts = DEFAULT_SUBJECTS.map((name) => ({ name, stage: "عام" }));
      await supabase.from("subjects").insert(inserts);
      const { data: newSubs } = await supabase.from("subjects").select("id, name, stage").order("name");
      subjects = newSubs;
    }

    return NextResponse.json({ subjects: subjects || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
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

    // التحقق من عدم التكرار
    const { data: existing } = await adminSupabase
      .from("subjects")
      .select("id, name")
      .eq("name", cleanName)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, subject: existing });
    }

    const { data: inserted, error } = await adminSupabase
      .from("subjects")
      .insert({
        name: cleanName,
        stage: stage || "عام",
      })
      .select("id, name, stage")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, subject: inserted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المادة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
