import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    const adminSupabase = createAdminSupabaseClient();
    
    // محاولة 1: الاستعلام مع day_of_week
    let query = adminSupabase.from("weekly_schedules").select(`
      id,
      day_of_week,
      period,
      class_id,
      teacher_id,
      subject_id,
      classes ( name, section ),
      subjects ( name ),
      teachers ( profiles ( full_name ) )
    `);

    if (classId) {
      query = query.eq("class_id", classId);
    }

    let { data: schedules, error } = await query;

    // محاولة 2: إذا فشل بسبب عمود day_of_week، نستعلم بـ day
    if (error && error.message?.includes("day_of_week")) {
      let queryDay = adminSupabase.from("weekly_schedules").select(`
        id,
        day,
        period,
        class_id,
        teacher_id,
        subject_id,
        classes ( name, section ),
        subjects ( name ),
        teachers ( profiles ( full_name ) )
      `);

      if (classId) {
        queryDay = queryDay.eq("class_id", classId);
      }

      const resDay = await queryDay;
      if (!resDay.error && resDay.data) {
        schedules = resDay.data.map((r: any) => ({
          ...r,
          day_of_week: r.day,
        }));
        error = null;
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message, schedules: [] }, { status: 400 });
    }

    return NextResponse.json({ schedules: schedules || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message, schedules: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { classId, dayOfWeek, period, subjectId, teacherId, subjectName } = await req.json();

    if (!classId || !dayOfWeek || !period || !subjectId) {
      return NextResponse.json(
        { error: "يرجى تحديد الصف، اليوم، الحصة، والمادة." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminSupabaseClient();
    const cleanDay = Number(dayOfWeek);
    const cleanPeriod = Number(period);

    // التحقق من أن معرف المادة UUID صالح، وإذا لم يكن كذلك يتم جلبه أو إنشاؤه في جدول subjects
    let finalSubjectId = subjectId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subjectId);

    if (!isUUID) {
      const DEFAULT_SUBJECTS = [
        "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الرياضيات",
        "العلوم", "الفيزياء", "الكيمياء", "الأحياء",
        "الاجتماعيات", "الحاسوب", "التربية الفنية", "التربية الرياضية"
      ];

      let targetName = subjectName || "";
      if (!targetName && typeof subjectId === "string" && subjectId.startsWith("sub-")) {
        const idx = parseInt(subjectId.replace("sub-", ""), 10) - 1;
        targetName = DEFAULT_SUBJECTS[idx] || "التربية الإسلامية";
      }

      if (targetName) {
        const { data: matchedSub } = await adminSupabase
          .from("subjects")
          .select("id")
          .eq("name", targetName)
          .maybeSingle();

        if (matchedSub?.id) {
          finalSubjectId = matchedSub.id;
        } else {
          const { data: newSub } = await adminSupabase
            .from("subjects")
            .insert({ name: targetName, stage: "عام" })
            .select("id")
            .maybeSingle();
          if (newSub?.id) {
            finalSubjectId = newSub.id;
          }
        }
      }

      // كحل احتياطي، أخذ أول مادة مسجلة بـ UUID
      if (finalSubjectId === subjectId) {
        const { data: anySub } = await adminSupabase.from("subjects").select("id").limit(1).maybeSingle();
        if (anySub?.id) {
          finalSubjectId = anySub.id;
        }
      }
    }

    // 1. حذف الحصة السابقة في نفس اليوم والحصة (استبدال الحصة)
    const { error: delErr } = await adminSupabase
      .from("weekly_schedules")
      .delete()
      .eq("class_id", classId)
      .eq("day_of_week", cleanDay)
      .eq("period", cleanPeriod);

    if (delErr && delErr.message?.includes("day_of_week")) {
      await adminSupabase
        .from("weekly_schedules")
        .delete()
        .eq("class_id", classId)
        .eq("day", cleanDay)
        .eq("period", cleanPeriod);
    }

    // 2. محاولة الإدراج باستخدام day_of_week
    let insertedRecord: any = null;
    let insertErr: any = null;

    const res1 = await adminSupabase
      .from("weekly_schedules")
      .insert({
        class_id: classId,
        day_of_week: cleanDay,
        period: cleanPeriod,
        subject_id: finalSubjectId,
        teacher_id: teacherId || null,
      })
      .select("*")
      .maybeSingle();

    if (!res1.error && res1.data) {
      insertedRecord = res1.data;
    } else if (res1.error && res1.error.message?.includes("day_of_week")) {
      // محاولة الإدراج باستخدام عمود day البديل
      const res2 = await adminSupabase
        .from("weekly_schedules")
        .insert({
          class_id: classId,
          day: cleanDay,
          period: cleanPeriod,
          subject_id: subjectId,
          teacher_id: teacherId || null,
        })
        .select("*")
        .maybeSingle();

      if (!res2.error && res2.data) {
        insertedRecord = res2.data;
      } else {
        insertErr = res2.error;
      }
    } else {
      insertErr = res1.error;
    }

    if (insertErr) {
      throw new Error(insertErr.message);
    }

    return NextResponse.json({
      success: true,
      schedule: {
        ...insertedRecord,
        day_of_week: insertedRecord.day_of_week ?? insertedRecord.day ?? cleanDay,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الحصة في الجدول.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const classId = searchParams.get("classId");
    const day = searchParams.get("day");
    const period = searchParams.get("period");

    const adminSupabase = createAdminSupabaseClient();

    if (id) {
      await adminSupabase.from("weekly_schedules").delete().eq("id", id);
    } else if (classId && day && period) {
      const cleanDay = Number(day);
      const cleanPeriod = Number(period);

      const { error: dErr } = await adminSupabase
        .from("weekly_schedules")
        .delete()
        .eq("class_id", classId)
        .eq("day_of_week", cleanDay)
        .eq("period", cleanPeriod);

      if (dErr && dErr.message?.includes("day_of_week")) {
        await adminSupabase
          .from("weekly_schedules")
          .delete()
          .eq("class_id", classId)
          .eq("day", cleanDay)
          .eq("period", cleanPeriod);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء حذف الحصة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
