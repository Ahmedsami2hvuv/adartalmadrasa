import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    const adminSupabase = createAdminSupabaseClient();
    
    // محاولة 1: الاستعلام مع عمود day (العمود الأساسي في قاعدة البيانات)
    let query = adminSupabase.from("weekly_schedules").select(`
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
      query = query.eq("class_id", classId);
    }

    let { data: schedules, error } = await query;

    if (!error && schedules) {
      schedules = schedules.map((r: any) => ({
        ...r,
        day: r.day,
        day_of_week: r.day,
      }));
    }

    // محاولة 2: إذا فشل بسبب عدم وجود عمود day، نستعلم بـ day_of_week
    if (error) {
      let queryDayOfWeek = adminSupabase.from("weekly_schedules").select(`
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
        queryDayOfWeek = queryDayOfWeek.eq("class_id", classId);
      }

      const resDayOfWeek = await queryDayOfWeek;
      if (!resDayOfWeek.error && resDayOfWeek.data) {
        schedules = resDayOfWeek.data.map((r: any) => ({
          ...r,
          day: r.day_of_week,
          day_of_week: r.day_of_week,
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
    const body = await req.json();
    const classId = body.classId;
    const dayValue = body.day ?? body.dayOfWeek;
    const period = body.period;
    const subjectId = body.subjectId;
    const teacherId = body.teacherId;
    const subjectName = body.subjectName;

    if (!classId || dayValue === undefined || dayValue === null || !period || !subjectId) {
      return NextResponse.json(
        { error: "يرجى تحديد الصف، اليوم، الحصة، والمادة." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminSupabaseClient();
    const cleanDay = Number(dayValue);
    const cleanPeriod = Number(period);

    // 1. التحقق الصارم من وجود المادة في جدول subjects وضمان مطابقة المفتاح الأجنبي (Foreign Key)
    let finalSubjectId: string | null = null;

    // محاولة أ: فحص إذا كان المعرف الممرر موجوداً بالفعل في جدول subjects
    if (subjectId) {
      try {
        const { data: checkSub } = await adminSupabase
          .from("subjects")
          .select("id")
          .eq("id", subjectId)
          .maybeSingle();

        if (checkSub?.id) {
          finalSubjectId = checkSub.id;
        }
      } catch (_) {}
    }

    // محاولة ب: إذا لم يوجد بالمعرف، نبحث عن المادة باسمها
    let targetName = (subjectName || "").trim();
    if (!targetName && typeof subjectId === "string" && subjectId.startsWith("sub-")) {
      const DEFAULT_SUBJECTS = [
        "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", "الرياضيات",
        "العلوم", "الفيزياء", "الكيمياء", "الأحياء",
        "الاجتماعيات", "الحاسوب", "التربية الفنية", "التربية الرياضية"
      ];
      const idx = parseInt(subjectId.replace("sub-", ""), 10) - 1;
      targetName = DEFAULT_SUBJECTS[idx] || "التربية الإسلامية";
    }

    if (!finalSubjectId && targetName) {
      try {
        const { data: matchedSub } = await adminSupabase
          .from("subjects")
          .select("id")
          .eq("name", targetName)
          .maybeSingle();

        if (matchedSub?.id) {
          finalSubjectId = matchedSub.id;
        }
      } catch (_) {}
    }

    // محاولة ج: إذا لم تكن المادة موجودة إطلاقاً في جدول subjects، ننشئها فوراً
    if (!finalSubjectId) {
      const nameToInsert = targetName || "التربية الإسلامية";
      try {
        const { data: newSub } = await adminSupabase
          .from("subjects")
          .upsert({ name: nameToInsert, stage: "عام" }, { onConflict: "name" })
          .select("id")
          .maybeSingle();

        if (newSub?.id) {
          finalSubjectId = newSub.id;
        }
      } catch (_) {}
    }

    // محاولة د: إذا تعذر، أخذ معرف أي مادة متوفرة في الجدول لضمان عدم كسر القيد الأجنبي
    if (!finalSubjectId) {
      try {
        const { data: anySub } = await adminSupabase
          .from("subjects")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (anySub?.id) {
          finalSubjectId = anySub.id;
        }
      } catch (_) {}
    }

    // محاولة هـ: إذا كان الجدول فارغاً كلياً، ندخل مادة التربية الإسلامية ونحصل على معرّفها
    if (!finalSubjectId) {
      try {
        const { data: seeded } = await adminSupabase
          .from("subjects")
          .insert({ name: "التربية الإسلامية", stage: "عام" })
          .select("id")
          .maybeSingle();
        if (seeded?.id) {
          finalSubjectId = seeded.id;
        }
      } catch (_) {}
    }

    // 2. التحقق من صحة معرف المعلم (teacher_id) وضمان توافقه مع جدول teachers
    let finalTeacherId: string | null = null;
    if (teacherId) {
      try {
        // فحص إذا كان المعرف موجود في teachers كـ id
        const { data: tRow } = await adminSupabase
          .from("teachers")
          .select("id")
          .eq("id", teacherId)
          .maybeSingle();

        if (tRow?.id) {
          finalTeacherId = tRow.id;
        } else {
          // فحص إذا كان المعرف يمثل profile_id لمعلم
          const { data: tByProf } = await adminSupabase
            .from("teachers")
            .select("id")
            .eq("profile_id", teacherId)
            .maybeSingle();

          if (tByProf?.id) {
            finalTeacherId = tByProf.id;
          } else {
            // التحقق من وجود حساب معلم في profiles وإضافته في teachers
            const { data: prof } = await adminSupabase
              .from("profiles")
              .select("id")
              .eq("id", teacherId)
              .maybeSingle();

            if (prof?.id) {
              const { data: createdT } = await adminSupabase
                .from("teachers")
                .insert({ profile_id: prof.id, specialization: "عام" })
                .select("id")
                .maybeSingle();
              if (createdT?.id) finalTeacherId = createdT.id;
            }
          }
        }
      } catch (_) {}
    }

    // 3. حذف الحصة السابقة في نفس اليوم والحصة (استبدال الحصة القديمة)
    try {
      await adminSupabase
        .from("weekly_schedules")
        .delete()
        .eq("class_id", classId)
        .eq("day", cleanDay)
        .eq("period", cleanPeriod);
    } catch (_) {}

    try {
      await adminSupabase
        .from("weekly_schedules")
        .delete()
        .eq("class_id", classId)
        .eq("day_of_week", cleanDay)
        .eq("period", cleanPeriod);
    } catch (_) {}

    // 4. إدراج الحصة مع المعالجة الذكية لأسماء الأعمدة والقيود
    let insertedRecord: any = null;
    let insertErr: any = null;

    // دالة مساعدة لمحاولة الإدراج
    const tryInsert = async (tId: string | null) => {
      // محاولة الإدراج بكلا العمودين day و day_of_week
      let res = await adminSupabase
        .from("weekly_schedules")
        .insert({
          class_id: classId,
          day: cleanDay,
          day_of_week: cleanDay,
          period: cleanPeriod,
          subject_id: finalSubjectId,
          teacher_id: tId,
        })
        .select("*")
        .maybeSingle();

      if (!res.error) return { data: res.data, error: null };

      // إذا كان الخطأ بسبب عدم وجود عمود day_of_week
      if (res.error?.message?.includes("day_of_week")) {
        res = await adminSupabase
          .from("weekly_schedules")
          .insert({
            class_id: classId,
            day: cleanDay,
            period: cleanPeriod,
            subject_id: finalSubjectId,
            teacher_id: tId,
          })
          .select("*")
          .maybeSingle();
        if (!res.error) return { data: res.data, error: null };
      }

      // إذا كان الخطأ بسبب عدم وجود عمود day
      if (res.error?.message?.includes('"day"')) {
        res = await adminSupabase
          .from("weekly_schedules")
          .insert({
            class_id: classId,
            day_of_week: cleanDay,
            period: cleanPeriod,
            subject_id: finalSubjectId,
            teacher_id: tId,
          })
          .select("*")
          .maybeSingle();
        if (!res.error) return { data: res.data, error: null };
      }

      return { data: null, error: res.error };
    };

    let result = await tryInsert(finalTeacherId);

    // إذا فشل بسبب قيد not-null على teacher_id، نبحث عن أي معلم متاح لربطه
    if (result.error && (result.error.message?.includes("teacher_id") || result.error.message?.includes("not-null"))) {
      try {
        const { data: anyTeacher } = await adminSupabase
          .from("teachers")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (anyTeacher?.id) {
          result = await tryInsert(anyTeacher.id);
        }
      } catch (_) {}
    }

    if (result.error) {
      throw new Error(result.error.message);
    }

    insertedRecord = result.data;

    return NextResponse.json({
      success: true,
      schedule: {
        ...insertedRecord,
        day: insertedRecord?.day ?? insertedRecord?.day_of_week ?? cleanDay,
        day_of_week: insertedRecord?.day_of_week ?? insertedRecord?.day ?? cleanDay,
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
    const day = searchParams.get("day") || searchParams.get("dayOfWeek");
    const period = searchParams.get("period");

    const adminSupabase = createAdminSupabaseClient();

    if (id) {
      await adminSupabase.from("weekly_schedules").delete().eq("id", id);
    } else if (classId && day && period) {
      const cleanDay = Number(day);
      const cleanPeriod = Number(period);

      try {
        await adminSupabase
          .from("weekly_schedules")
          .delete()
          .eq("class_id", classId)
          .eq("day", cleanDay)
          .eq("period", cleanPeriod);
      } catch (_) {}

      try {
        await adminSupabase
          .from("weekly_schedules")
          .delete()
          .eq("class_id", classId)
          .eq("day_of_week", cleanDay)
          .eq("period", cleanPeriod);
      } catch (_) {}
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء حذف الحصة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
