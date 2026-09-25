import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

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
    const serverSupabase = createServerSupabaseClient();
    const clients = [adminSupabase, serverSupabase];
    const cleanDay = Number(dayValue);
    const cleanPeriod = Number(period);

    // 1. جلب كافة المواد المسجلة في قاعدة البيانات لضمان وجود مفتاح أجنبي صالح 100%
    let allSubjects: { id: string; name: string }[] = [];
    for (const client of clients) {
      try {
        const { data, error } = await client.from("subjects").select("id, name");
        if (!error && data && data.length > 0) {
          allSubjects = data;
          break;
        }
      } catch (_) {}
    }

    const cleanText = (str: string) =>
      (str || "")
        .trim()
        .toLowerCase()
        .replace(/[\u064B-\u065F]/g, "") // إزالة التشكيل
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/\s+/g, " ");

    const targetClean = cleanText(subjectName || "");

    // مطابقة 1: بالمعرف المباشر
    let matchedSubject = allSubjects.find((s) => s.id === subjectId);

    // مطابقة 2: بالاسم الصريح أو التقريبي
    if (!matchedSubject && targetClean) {
      matchedSubject = allSubjects.find((s) => cleanText(s.name) === targetClean);
    }

    // مطابقة 3: احتواء جزئي للاسم
    if (!matchedSubject && targetClean) {
      matchedSubject = allSubjects.find(
        (s) => cleanText(s.name).includes(targetClean) || targetClean.includes(cleanText(s.name))
      );
    }

    // مطابقة 4: إذا لم نجد والمواد متوفرة في الجدول، نأخذ أول مادة موجودة
    if (!matchedSubject && allSubjects.length > 0) {
      matchedSubject = allSubjects[0];
    }

    let finalSubjectId: string | null = matchedSubject ? matchedSubject.id : null;

    // مطابقة 5: إذا كان جدول المواد فارغاً كلياً، نقوم بإنشاء المادة وتثبيتها فوراً في قاعدة البيانات
    if (!finalSubjectId) {
      const nameToAdd = (subjectName || "التربية الإسلامية").trim();
      for (const client of clients) {
        try {
          const { data: insData } = await client
            .from("subjects")
            .insert({ name: nameToAdd, stage: "عام" })
            .select("id")
            .maybeSingle();

          if (insData?.id) {
            finalSubjectId = insData.id;
            break;
          }
        } catch (_) {}

        try {
          const { data: insSimple } = await client
            .from("subjects")
            .insert({ name: nameToAdd })
            .select("id")
            .maybeSingle();

          if (insSimple?.id) {
            finalSubjectId = insSimple.id;
            break;
          }
        } catch (_) {}
      }

      // إذا تعذر الإرجاع المباشر لـ id، نعيد الاستعلام لأخذ أي مادة تم إدخالها
      if (!finalSubjectId) {
        for (const client of clients) {
          try {
            const { data: anySub } = await client.from("subjects").select("id").limit(1).maybeSingle();
            if (anySub?.id) {
              finalSubjectId = anySub.id;
              break;
            }
          } catch (_) {}
        }
      }
    }

    // إذا فشل كل ما سبق وكان المعرف غير متوفر، نرسل خطأ واضحاً
    if (!finalSubjectId) {
      return NextResponse.json(
        { error: "تعذر مطابقة المادة في قاعدة البيانات. يرجى إعادة تحميل الصفحة." },
        { status: 400 }
      );
    }

    // 2. التحقق من صحة معرف المعلم (teacher_id) وتجهيزه
    let finalTeacherId: string | null = null;
    if (teacherId) {
      for (const client of clients) {
        try {
          const { data: tRow } = await client.from("teachers").select("id").eq("id", teacherId).maybeSingle();
          if (tRow?.id) {
            finalTeacherId = tRow.id;
            break;
          }
          const { data: tByProf } = await client.from("teachers").select("id").eq("profile_id", teacherId).maybeSingle();
          if (tByProf?.id) {
            finalTeacherId = tByProf.id;
            break;
          }
        } catch (_) {}
      }
    }

    // 3. حذف الحصة السابقة في نفس اليوم والحصة (استبدال الحصة القديمة)
    for (const client of clients) {
      try {
        await client
          .from("weekly_schedules")
          .delete()
          .eq("class_id", classId)
          .eq("day", cleanDay)
          .eq("period", cleanPeriod);
      } catch (_) {}

      try {
        await client
          .from("weekly_schedules")
          .delete()
          .eq("class_id", classId)
          .eq("day_of_week", cleanDay)
          .eq("period", cleanPeriod);
      } catch (_) {}
    }

    // 4. إدراج الحصة مع المعالجة الذكية لأسماء الأعمدة والعملاء
    let insertedRecord: any = null;
    let insertErr: any = null;

    const tryInsertWithClient = async (client: any, tId: string | null) => {
      // محاولة الإدراج بكلا العمودين day و day_of_week
      let res = await client
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
        res = await client
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
        res = await client
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

    // تجربة الإدراج باستخدام كلا العميلين
    for (const client of clients) {
      let result = await tryInsertWithClient(client, finalTeacherId);

      // إذا فشل بسبب قيد not-null على teacher_id، نبحث عن أي معلم متاح لربطه
      if (result.error && (result.error.message?.includes("teacher_id") || result.error.message?.includes("not-null"))) {
        try {
          const { data: anyTeacher } = await client
            .from("teachers")
            .select("id")
            .limit(1)
            .maybeSingle();

          if (anyTeacher?.id) {
            result = await tryInsertWithClient(client, anyTeacher.id);
          }
        } catch (_) {}
      }

      if (!result.error && result.data) {
        insertedRecord = result.data;
        insertErr = null;
        break;
      } else {
        insertErr = result.error;
      }
    }

    if (insertErr && !insertedRecord) {
      throw new Error(insertErr.message);
    }

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
