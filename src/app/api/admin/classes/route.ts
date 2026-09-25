import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// التسلسل الأبجدي العربي المعتمد للشعب في المدارس
const ARABIC_ALPHABET_SECTIONS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي", "ك", "ل"];

export async function GET() {
  try {
    const adminSupabase = createAdminSupabaseClient();
    let { data: classes, error } = await adminSupabase
      .from("classes")
      .select("*")
      .order("name", { ascending: true })
      .order("section", { ascending: true });

    if (error || !classes) {
      const serverSupabase = createServerSupabaseClient();
      const fallback = await serverSupabase
        .from("classes")
        .select("*")
        .order("name", { ascending: true })
        .order("section", { ascending: true });
      classes = fallback.data || [];
    }

    return NextResponse.json({ classes: classes || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message, classes: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, stage, sectionsCount, academicYear } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "اسم الصف مطلوب." }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanStage = stage || "متوسطة";
    const year = academicYear || "2025-2026";

    // إذا كان المطلوب إضافة شعبة مفردة لصف قائم
    if (body.singleSection && body.section) {
      const cleanSection = body.section.trim();
      const adminSupabase = createAdminSupabaseClient();
      const serverSupabase = createServerSupabaseClient();
      const newClassRow = {
        name: cleanName,
        section: cleanSection,
        stage: cleanStage,
        academic_year: year,
      };

      let { data: insData, error: insErr } = await adminSupabase
        .from("classes")
        .upsert([newClassRow], { onConflict: "name,section,academic_year" })
        .select("*");

      if (insErr || !insData) {
        const fb = await serverSupabase
          .from("classes")
          .upsert([newClassRow], { onConflict: "name,section,academic_year" })
          .select("*");
        insData = fb.data;
      }

      return NextResponse.json({
        success: true,
        message: `تم إضافة شعبة (${cleanSection}) لصف (${cleanName}) بنجاح.`,
        classes: insData,
      });
    }

    const count = Math.max(1, Math.min(Number(sectionsCount) || 1, ARABIC_ALPHABET_SECTIONS.length));

    const adminSupabase = createAdminSupabaseClient();
    const serverSupabase = createServerSupabaseClient();

    // تجهيز مصفوفة الشعب بالتسلسل الأبجدي (أ، ب، ج، د...)
    const newClassesToInsert = [];
    for (let i = 0; i < count; i++) {
      newClassesToInsert.push({
        name: cleanName,
        section: ARABIC_ALPHABET_SECTIONS[i],
        stage: cleanStage,
        academic_year: year,
      });
    }

    // إدراج الشعب في قاعدة البيانات مع تجنب التكرار
    const { data: inserted, error: insertErr } = await adminSupabase
      .from("classes")
      .upsert(newClassesToInsert, { onConflict: "name,section,academic_year" })
      .select("*");

    let finalClasses = inserted;

    if (insertErr || !finalClasses) {
      const { data: serverInserted, error: sErr } = await serverSupabase
        .from("classes")
        .upsert(newClassesToInsert, { onConflict: "name,section,academic_year" })
        .select("*");

      if (sErr && !serverInserted) {
        throw new Error(sErr.message || insertErr?.message || "تعذر حفظ الصف والشعب.");
      }
      finalClasses = serverInserted;
    }

    return NextResponse.json({
      success: true,
      message: `تم إنشاء صف (${cleanName}) بعدد (${count}) شعب بنجاح.`,
      classes: finalClasses,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء إضافة الصف والشعب.";
    console.error("Add classes error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const name = searchParams.get("name");

    const adminSupabase = createAdminSupabaseClient();
    if (id) {
      await adminSupabase.from("classes").delete().eq("id", id);
    } else if (name) {
      await adminSupabase.from("classes").delete().eq("name", name);
    } else {
      return NextResponse.json({ error: "معرف الصف مطلوب للحذف." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء حذف الصف.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { oldName, newName, stage } = await req.json();
    if (!oldName || !newName) {
      return NextResponse.json({ error: "الاسم القديم والجديد مطلوبان." }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();
    const updateData: { name: string; stage?: string } = { name: newName.trim() };
    if (stage) updateData.stage = stage;

    const { error } = await adminSupabase
      .from("classes")
      .update(updateData)
      .eq("name", oldName);

    if (error) {
      const serverSupabase = createServerSupabaseClient();
      await serverSupabase.from("classes").update(updateData).eq("name", oldName);
    }

    return NextResponse.json({ success: true, message: `تم تحديث الصف إلى (${newName.trim()}) بنجاح.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء تعديل الصف.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
