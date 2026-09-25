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
    const serverSupabase = createServerSupabaseClient();
    const client = adminSupabase || serverSupabase;

    // 1. جلب المواد من جدول subjects
    let { data: dbSubjects } = await client
      .from("subjects")
      .select("id, name, stage")
      .order("name");

    // 2. جلب المواد المحفوظة احتياطياً في school_settings
    let customFromSettings: string[] = [];
    try {
      const { data: sData } = await client
        .from("school_settings")
        .select("custom_subjects")
        .limit(1)
        .maybeSingle();
      if (sData?.custom_subjects && Array.isArray(sData.custom_subjects)) {
        customFromSettings = sData.custom_subjects;
      }
    } catch (e) {
      console.warn("Could not query custom_subjects from settings:", e);
    }

    // تجميع كافة الأسماء بدون تكرار
    const allNamesMap = new Map<string, { id: string; name: string; stage: string }>();

    // إضافة المواد الافتراضية أولاً
    DEFAULT_SUBJECTS.forEach((name, i) => {
      allNamesMap.set(name, {
        id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
        name,
        stage: "عام",
      });
    });

    // دمج المواد من school_settings
    customFromSettings.forEach((name, i) => {
      if (!allNamesMap.has(name)) {
        allNamesMap.set(name, {
          id: `10000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
          name,
          stage: "عام",
        });
      }
    });

    // دمج المواد الموجودة فعلياً في جدول subjects بأرقامها الحقيقية
    if (dbSubjects && dbSubjects.length > 0) {
      dbSubjects.forEach((sub) => {
        allNamesMap.set(sub.name, {
          id: sub.id,
          name: sub.name,
          stage: sub.stage || "عام",
        });
      });
    }

    const finalList = Array.from(allNamesMap.values());
    return NextResponse.json({ subjects: finalList });
  } catch (err: unknown) {
    const fallbackSubjects = DEFAULT_SUBJECTS.map((name, i) => ({
      id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
      name,
      stage: "عام",
    }));
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
    const serverSupabase = createServerSupabaseClient();
    const client = adminSupabase || serverSupabase;

    let finalId = crypto.randomUUID();

    // 1. محاولة إدراج أو جلب المادة من جدول subjects
    try {
      const { data: existing } = await client
        .from("subjects")
        .select("id, name, stage")
        .eq("name", cleanName)
        .maybeSingle();

      if (existing) {
        finalId = existing.id;
      } else {
        const { data: inserted } = await client
          .from("subjects")
          .upsert({ name: cleanName, stage: stage || "عام" }, { onConflict: "name" })
          .select("id, name, stage")
          .maybeSingle();

        if (inserted?.id) {
          finalId = inserted.id;
        }
      }
    } catch (e) {
      console.warn("Subjects table upsert error:", e);
    }

    // 2. الحفظ الدائم في school_settings.custom_subjects
    try {
      const { data: sData } = await client
        .from("school_settings")
        .select("custom_subjects")
        .limit(1)
        .maybeSingle();

      const currentList: string[] = Array.isArray(sData?.custom_subjects) ? sData.custom_subjects : [];
      if (!currentList.includes(cleanName)) {
        currentList.push(cleanName);
        await client.from("school_settings").upsert({
          custom_subjects: currentList,
        });
      }
    } catch (e) {
      console.warn("Settings custom_subjects upsert error:", e);
    }

    return NextResponse.json({
      success: true,
      subject: {
        id: finalId,
        name: cleanName,
        stage: stage || "عام",
      },
      message: `تم حفظ مادة (${cleanName}) بنجاح.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المادة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const name = searchParams.get("name");

    const adminSupabase = createAdminSupabaseClient();
    const serverSupabase = createServerSupabaseClient();
    const client = adminSupabase || serverSupabase;

    // حذف من جدول subjects
    if (id) {
      await client.from("subjects").delete().eq("id", id);
    }
    if (name) {
      await client.from("subjects").delete().eq("name", name);
    }

    // حذف من مصفوفة custom_subjects في school_settings
    try {
      const { data: sData } = await client
        .from("school_settings")
        .select("custom_subjects")
        .limit(1)
        .maybeSingle();

      if (sData?.custom_subjects && Array.isArray(sData.custom_subjects)) {
        const updated = sData.custom_subjects.filter((subName: string) => subName !== name);
        await client.from("school_settings").upsert({
          custom_subjects: updated,
        });
      }
    } catch (e) {
      console.warn("Error deleting from custom_subjects:", e);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء حذف المادة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
