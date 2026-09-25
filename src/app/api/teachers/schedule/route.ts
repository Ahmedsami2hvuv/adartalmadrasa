import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherIdParam = searchParams.get("teacherId");
    const nameParam = searchParams.get("name");

    const adminSupabase = createAdminSupabaseClient();
    const serverSupabase = createServerSupabaseClient();
    const clients = [adminSupabase, serverSupabase];

    // 1. جلب قائمة المعلمين والملفات الشخصية للعثور على معرّفات المعلم المطلوب
    let allTeachers: any[] = [];
    let allProfiles: any[] = [];

    for (const client of clients) {
      try {
        const { data: tData } = await client.from("teachers").select("*");
        if (tData && tData.length > 0) {
          allTeachers = tData;
          break;
        }
      } catch (e) {
        // تجاهل والمحاولة مع العميل التالي
      }
    }

    for (const client of clients) {
      try {
        const { data: pData } = await client.from("profiles").select("*");
        if (pData && pData.length > 0) {
          allProfiles = pData;
          break;
        }
      } catch (e) {
        // تجاهل والمحاولة مع العميل التالي
      }
    }

    // تجميع المعرّفات المحتملة للمعلم
    const targetTeacherIds = new Set<string>();
    const cleanSearchName = (nameParam || "").trim().toLowerCase();

    // البحث بالمعرف المباشر
    if (teacherIdParam) {
      targetTeacherIds.add(teacherIdParam);
    }

    // البحث والمطابقة في جدول teachers و profiles
    allTeachers.forEach((t) => {
      const prof = allProfiles.find((p) => p.id === t.profile_id || p.id === t.id);
      const teacherName = (prof?.full_name || t.name || "").trim().toLowerCase();

      let isMatch = false;
      if (teacherIdParam && (t.id === teacherIdParam || t.profile_id === teacherIdParam)) {
        isMatch = true;
      }
      if (cleanSearchName) {
        if (
          teacherName.includes(cleanSearchName) ||
          cleanSearchName.includes(teacherName) ||
          (cleanSearchName.includes("أحمد") && teacherName.includes("أحمد")) ||
          (cleanSearchName.includes("احمد") && teacherName.includes("احمد")) ||
          (cleanSearchName.replace(/أ|إ|آ/g, "ا").includes(teacherName.replace(/أ|إ|آ/g, "ا"))) ||
          (teacherName.replace(/أ|إ|آ/g, "ا").includes(cleanSearchName.replace(/أ|إ|آ/g, "ا")))
        ) {
          isMatch = true;
        }
      }

      if (isMatch) {
        if (t.id) targetTeacherIds.add(t.id);
        if (t.profile_id) targetTeacherIds.add(t.profile_id);
      }
    });

    // فحص profiles مباشرة بدور teacher
    allProfiles
      .filter((p) => p.role === "teacher")
      .forEach((p) => {
        const pName = (p.full_name || "").trim().toLowerCase();
        let isMatch = false;
        if (teacherIdParam && p.id === teacherIdParam) isMatch = true;
        if (
          cleanSearchName &&
          (pName.includes(cleanSearchName) ||
            cleanSearchName.includes(pName) ||
            pName.replace(/أ|إ|آ/g, "ا").includes(cleanSearchName.replace(/أ|إ|آ/g, "ا")))
        ) {
          isMatch = true;
        }
        if (isMatch) {
          targetTeacherIds.add(p.id);
        }
      });

    // 2. جلب جميع الحصص من weekly_schedules عبر السيرفر
    let schedulesRaw: any[] = [];

    // محاولة 1: الاستعلام مع عمود day
    for (const client of clients) {
      try {
        const { data: sData, error: sErr } = await client.from("weekly_schedules").select(`
          id,
          day,
          period,
          class_id,
          teacher_id,
          subject_id,
          classes ( id, name, section ),
          subjects ( id, name ),
          teachers ( id, name, profiles ( id, full_name ) )
        `);

        if (!sErr && sData) {
          schedulesRaw = sData.map((r: any) => ({
            ...r,
            day: r.day,
            day_of_week: r.day,
          }));
          break;
        }
      } catch (e) {
        // تجربة المحاولة التالية
      }
    }

    // محاولة 2: إذا لم تنجح، الاستعلام مع عمود day_of_week
    if (schedulesRaw.length === 0) {
      for (const client of clients) {
        try {
          const { data: sData, error: sErr } = await client.from("weekly_schedules").select(`
            id,
            day_of_week,
            period,
            class_id,
            teacher_id,
            subject_id,
            classes ( id, name, section ),
            subjects ( id, name ),
            teachers ( id, name, profiles ( id, full_name ) )
          `);

          if (!sErr && sData) {
            schedulesRaw = sData.map((r: any) => ({
              ...r,
              day: r.day_of_week,
              day_of_week: r.day_of_week,
            }));
            break;
          }
        } catch (e) {
          // تجربة العميل التالي
        }
      }
    }

    // 3. فلترة الحصص الخاصة بالمعلم بدقة
    const matchedSchedules = schedulesRaw.filter((sc) => {
      // أ) مطابقة معرّف المعلم
      if (sc.teacher_id && targetTeacherIds.has(sc.teacher_id)) {
        return true;
      }

      // ب) مطابقة اسم المعلم المرتبط بالحصة مباشرة
      const directTeacherName = (
        sc.teachers?.profiles?.full_name ||
        sc.teachers?.name ||
        ""
      ).trim().toLowerCase();

      if (cleanSearchName && directTeacherName) {
        const normSearch = cleanSearchName.replace(/أ|إ|آ/g, "ا");
        const normDirect = directTeacherName.replace(/أ|إ|آ/g, "ا");
        if (normSearch.includes(normDirect) || normDirect.includes(normSearch)) {
          return true;
        }
      }

      return false;
    });

    // 4. تنسيق الحصص
    const detailedSchedules = matchedSchedules.map((s) => ({
      id: s.id,
      day: Number(s.day || s.day_of_week || 1),
      period: Number(s.period || 1),
      classId: s.class_id || s.classes?.id,
      gradeName: s.classes?.name || "صف",
      section: s.classes?.section || "أ",
      className: s.classes ? `${s.classes.name} (${s.classes.section})` : "صف",
      subject: s.subjects?.name || "مادة",
      teacherId: s.teacher_id,
    }));

    // 5. جلب طلاب الصفوف الموكلة لهذا المعلم
    const classIds = Array.from(new Set(detailedSchedules.map((s) => s.classId).filter(Boolean)));
    let studentsRaw: any[] = [];

    if (classIds.length > 0) {
      for (const client of clients) {
        try {
          const { data: stData, error: stErr } = await client
            .from("students")
            .select("id, class_id, classes(id, name, section), profiles(full_name)")
            .in("class_id", classIds);

          if (!stErr && stData) {
            studentsRaw = stData.map((st: any) => ({
              id: st.id,
              name: st.profiles?.full_name || "طالب",
              classId: st.class_id,
              className: st.classes?.name || "الصف",
              section: st.classes?.section || "أ",
            }));
            break;
          }
        } catch (e) {
          // تجربة التالي
        }
      }
    }

    return NextResponse.json({
      success: true,
      teacherId: Array.from(targetTeacherIds)[0] || teacherIdParam || "",
      schedules: detailedSchedules,
      students: studentsRaw,
      totalCount: detailedSchedules.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching teacher schedule";
    return NextResponse.json({ error: message, schedules: [], students: [] }, { status: 500 });
  }
}
