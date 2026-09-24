import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    const adminSupabase = createAdminSupabaseClient();
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

    const { data: schedules, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ schedules });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { classId, dayOfWeek, period, subjectId, teacherId } = await req.json();

    if (!classId || !dayOfWeek || !period || !subjectId) {
      return NextResponse.json(
        { error: "يرجى تحديد الصف، اليوم، الحصة، والمادة." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminSupabaseClient();

    // 1. فحص تضارب المعلم إن وجد
    if (teacherId) {
      const { data: conflictTeacher } = await adminSupabase
        .from("weekly_schedules")
        .select("id, class_id, classes ( name, section )")
        .eq("teacher_id", teacherId)
        .eq("day_of_week", Number(dayOfWeek))
        .eq("period", Number(period))
        .neq("class_id", classId)
        .limit(1);

      if (conflictTeacher && conflictTeacher.length > 0) {
        return NextResponse.json(
          { error: "تضارب: هذا المعلم لديه حصة مجدولة مع صف آخر في نفس التوقيت." },
          { status: 409 }
        );
      }
    }

    // 2. حذف أي حصة سابقة مسجلة لنفس الصف في هذا اليوم والحصة (استبدال الحصة)
    await adminSupabase
      .from("weekly_schedules")
      .delete()
      .eq("class_id", classId)
      .eq("day_of_week", Number(dayOfWeek))
      .eq("period", Number(period));

    // 3. إدراج الحصة الجديدة
    const { data: inserted, error: insertError } = await adminSupabase
      .from("weekly_schedules")
      .insert({
        class_id: classId,
        day_of_week: Number(dayOfWeek),
        period: Number(period),
        subject_id: subjectId,
        teacher_id: teacherId || null,
      })
      .select(`
        id,
        day_of_week,
        period,
        class_id,
        teacher_id,
        subject_id,
        classes ( name, section ),
        subjects ( name ),
        teachers ( profiles ( full_name ) )
      `)
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({ success: true, schedule: inserted });
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
      await adminSupabase
        .from("weekly_schedules")
        .delete()
        .eq("class_id", classId)
        .eq("day_of_week", Number(day))
        .eq("period", Number(period));
    } else {
      return NextResponse.json({ error: "معرف الحصة مطلوب." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء حذف الحصة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
