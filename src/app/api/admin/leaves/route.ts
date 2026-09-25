import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const adminSupabase = createAdminSupabaseClient();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // 1. جلب إجازات الطلاب
    let studentLeaves: any[] = [];
    try {
      const { data: sLeaves, error: sErr } = await adminSupabase
        .from("leave_requests")
        .select(`
          id,
          student_id,
          reason,
          start_date,
          end_date,
          status,
          created_at,
          students (
            id,
            profiles ( full_name ),
            classes ( name, section )
          )
        `)
        .order("created_at", { ascending: false });

      if (!sErr && sLeaves) {
        studentLeaves = sLeaves.map((l: any) => ({
          id: l.id,
          studentId: l.student_id,
          studentName: l.students?.profiles?.full_name || "طالب",
          className: l.students?.classes
            ? `${l.students.classes.name} (${l.students.classes.section})`
            : "الصف",
          reason: l.reason,
          startDate: l.start_date,
          endDate: l.end_date,
          status: l.status,
          createdAt: l.created_at,
        }));
      }
    } catch (e) {
      console.warn("Could not fetch leave_requests:", e);
    }

    // 2. جلب إجازات المعلمين من إعدادات المدرسة أو جدول مخصص
    let teacherLeaves: any[] = [];
    try {
      const { data: dbSettings } = await adminSupabase
        .from("school_settings")
        .select("notes")
        .limit(1)
        .single();

      if (dbSettings?.notes) {
        try {
          const parsed = JSON.parse(dbSettings.notes);
          if (parsed && Array.isArray(parsed.teacherLeaves)) {
            teacherLeaves = parsed.teacherLeaves;
          }
        } catch {
          // ليس بصيغة JSON
        }
      }
    } catch (e) {
      console.warn("Could not fetch teacher leaves:", e);
    }

    return NextResponse.json({
      studentLeaves,
      teacherLeaves,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching leaves";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSupabase = createAdminSupabaseClient();
    const body = await req.json();
    const {
      type, // 'student' | 'teacher'
      targetId,
      targetName,
      className,
      subject,
      startDate,
      endDate,
      reason,
      notes,
    } = body;

    if (!type || !targetId || !startDate || !reason) {
      return NextResponse.json(
        { error: "بيانات الإجازة غير مكتملة (المستفيد، التاريخ، والسبب مطلوبة)." },
        { status: 400 }
      );
    }

    const start = startDate;
    const end = endDate || startDate;

    if (type === "student") {
      // 1. تسجيل الإجازة في جدول leave_requests
      const leaveId = crypto.randomUUID();
      const { error: insErr } = await adminSupabase.from("leave_requests").insert({
        id: leaveId,
        student_id: targetId,
        reason: reason + (notes ? ` - ${notes}` : ""),
        start_date: start,
        end_date: end,
        status: "approved",
      });

      if (insErr) {
        console.warn("leave_requests insert fallback:", insErr);
      }

      // 2. تحديث جدول الحضور attendances آلياً ليصبح الطالب مجازاً (excused)
      // نسجل لكل الأيام الواقعة بين start و end وللحصص من 1 إلى 5
      try {
        const dStart = new Date(start);
        const dEnd = new Date(end);
        const datesToMark: string[] = [];

        for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
          datesToMark.push(d.toISOString().split("T")[0]);
        }

        // جلب صف الطالب
        const { data: studentRec } = await adminSupabase
          .from("students")
          .select("class_id")
          .eq("id", targetId)
          .single();

        const classId = studentRec?.class_id;

        if (classId) {
          const attendanceInserts: any[] = [];
          for (const dateStr of datesToMark) {
            for (let period = 1; period <= 5; period++) {
              attendanceInserts.push({
                student_id: targetId,
                class_id: classId,
                date: dateStr,
                period,
                status: "excused",
                notes: `إجازة معتمدة من الإدارة: ${reason}`,
              });
            }
          }

          if (attendanceInserts.length > 0) {
            await adminSupabase
              .from("attendances")
              .upsert(attendanceInserts, { onConflict: "student_id,date,period" });
          }
        }
      } catch (attErr) {
        console.warn("Could not upsert excused attendances:", attErr);
      }

      return NextResponse.json({
        success: true,
        message: `تم تسجيل إجازة الطالب (${targetName || "الطالب"}) وتثبيته كمجاز في سجل الحضور بنجاح.`,
      });
    } else if (type === "teacher") {
      // إجازة معلم: حفظها في سجل إجازات المعلمين
      const newLeave = {
        id: crypto.randomUUID(),
        teacherId: targetId,
        teacherName: targetName || "معلم",
        subject: subject || "المادة",
        startDate: start,
        endDate: end,
        reason,
        notes: notes || "",
        status: "approved",
        createdAt: new Date().toISOString(),
      };

      try {
        const { data: dbSettings } = await adminSupabase
          .from("school_settings")
          .select("id, notes")
          .limit(1)
          .single();

        let currentTeacherLeaves: any[] = [];
        if (dbSettings?.notes) {
          try {
            const parsed = JSON.parse(dbSettings.notes);
            if (Array.isArray(parsed.teacherLeaves)) {
              currentTeacherLeaves = parsed.teacherLeaves;
            }
          } catch {
            // ليس json
          }
        }

        currentTeacherLeaves.unshift(newLeave);

        const updatedNotes = JSON.stringify({
          teacherLeaves: currentTeacherLeaves,
        });

        if (dbSettings?.id) {
          await adminSupabase
            .from("school_settings")
            .update({ notes: updatedNotes })
            .eq("id", dbSettings.id);
        }
      } catch (tErr) {
        console.warn("Error saving teacher leave:", tErr);
      }

      return NextResponse.json({
        success: true,
        message: `تم توثيق إجازة المعلم (${targetName || "المعلم"}) بنجاح.`,
      });
    }

    return NextResponse.json({ error: "نوع الإجازة غير صحيح." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error saving leave";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminSupabase = createAdminSupabaseClient();
    const { searchParams } = new URL(req.url);
    const leaveId = searchParams.get("id");
    const type = searchParams.get("type") || "student";

    if (!leaveId) {
      return NextResponse.json({ error: "معرف الإجازة مطلوب." }, { status: 400 });
    }

    if (type === "student") {
      // جلب بيانات الإجازة لحذف حالات الحضور المقترنة بها إذا لزم
      const { data: leaveRec } = await adminSupabase
        .from("leave_requests")
        .select("student_id, start_date, end_date")
        .eq("id", leaveId)
        .single();

      if (leaveRec) {
        // حذف حضور excused المقترن بهذه التواريخ
        await adminSupabase
          .from("attendances")
          .delete()
          .eq("student_id", leaveRec.student_id)
          .gte("date", leaveRec.start_date)
          .lte("date", leaveRec.end_date)
          .eq("status", "excused");
      }

      await adminSupabase.from("leave_requests").delete().eq("id", leaveId);

      return NextResponse.json({ success: true, message: "تم إلغاء إجازة الطالب بنجاح." });
    } else {
      // حذف إجازة معلم
      try {
        const { data: dbSettings } = await adminSupabase
          .from("school_settings")
          .select("id, notes")
          .limit(1)
          .single();

        if (dbSettings?.notes) {
          try {
            const parsed = JSON.parse(dbSettings.notes);
            if (Array.isArray(parsed.teacherLeaves)) {
              const filtered = parsed.teacherLeaves.filter((l: any) => l.id !== leaveId);
              await adminSupabase
                .from("school_settings")
                .update({ notes: JSON.stringify({ teacherLeaves: filtered }) })
                .eq("id", dbSettings.id);
            }
          } catch {
            //
          }
        }
      } catch (err) {
        console.warn("Error deleting teacher leave:", err);
      }

      return NextResponse.json({ success: true, message: "تم إلغاء إجازة المعلم بنجاح." });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error deleting leave";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
