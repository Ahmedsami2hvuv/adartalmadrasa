import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// دالة مساعدة لإرسال رسالة تيليجرام
async function sendTelegramMessage(token: string | undefined, chatId: number | string, text: string) {
  if (!token || !chatId) return;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.warn("Failed to send telegram message to chat:", chatId, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      classId,
      className,
      section,
      subjectId,
      subjectName,
      teacherId,
      teacherName,
      title,
      description,
      dueDate,
    } = body;

    if (!classId || !title || !description) {
      return NextResponse.json(
        { error: "يرجى تعبئة جميع الحقول المطلوبة (الصف، الشعبة، العنوان، والتفاصيل)" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 1. إدراج الواجب في جدول homeworks
    const { data: newHw, error: hwError } = await supabase
      .from("homeworks")
      .insert({
        class_id: classId,
        subject_id: subjectId || null,
        teacher_id: teacherId || null,
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate || new Date().toISOString().split("T")[0],
      })
      .select("id")
      .single();

    if (hwError) {
      console.error("Error creating homework:", hwError);
      return NextResponse.json({ error: "فشل حفظ الواجب في قاعدة البيانات: " + hwError.message }, { status: 500 });
    }

    // 2. جلب جميع الطلاب في هذه الشعبة وأولياء أمورهم
    const { data: students } = await supabase
      .from("students")
      .select("id, profile_id, parent_id, profiles(full_name)")
      .eq("class_id", classId);

    const fullClassName = `${className || "الصف"} (${section || "الشعبة"})`;
    const cleanTeacherName = teacherName ? `الأستاذ ${teacherName}` : "مدرس المادة";
    const cleanSubject = subjectName || "المادة الدراسية";

    // 3. إنشاء إشعارات داخلية في جدول notifications
    if (students && students.length > 0) {
      const notificationsToInsert: {
        user_id: string;
        title: string;
        message: string;
        link: string;
      }[] = [];

      // جلب معرفات أولياء الأمور
      const parentIds = students.map((s) => s.parent_id).filter(Boolean);
      let parentsProfileMap: Record<string, string> = {};

      if (parentIds.length > 0) {
        const { data: parentsData } = await supabase
          .from("parents")
          .select("id, profile_id")
          .in("id", parentIds);

        if (parentsData) {
          parentsData.forEach((p) => {
            if (p.profile_id) parentsProfileMap[p.id] = p.profile_id;
          });
        }
      }

      students.forEach((stu) => {
        const profilesObj = stu.profiles as unknown as { full_name?: string } | { full_name?: string }[] | null;
        const studentName = Array.isArray(profilesObj) ? profilesObj[0]?.full_name : profilesObj?.full_name;

        // إشعار للطالب
        if (stu.profile_id) {
          notificationsToInsert.push({
            user_id: stu.profile_id,
            title: `📚 واجب مدرسي جديد: ${title}`,
            message: `أضاف ${cleanTeacherName} واجباً جديداً في مادة ${cleanSubject} لصفك. موعد التسليم: ${dueDate}`,
            link: "/dashboard",
          });
        }

        // إشعار لولي أمر الطالب
        if (stu.parent_id && parentsProfileMap[stu.parent_id]) {
          notificationsToInsert.push({
            user_id: parentsProfileMap[stu.parent_id],
            title: `📚 واجب مدرسي جديد لابنك (${studentName || "الطالب"}): ${title}`,
            message: `أضاف ${cleanTeacherName} واجباً جديداً لمادة ${cleanSubject}. يرجى متابعة ابنك لإنجازه قبل: ${dueDate}`,
            link: "/dashboard",
          });
        }
      });

      if (notificationsToInsert.length > 0) {
        await supabase.from("notifications").insert(notificationsToInsert);
      }
    }

    // 4. إرسال الإشعار عبر بوت التيليجرام
    try {
      const { data: schoolSettings } = await supabase
        .from("school_settings")
        .select("telegram_bot_token, telegram_director_chat_id")
        .limit(1)
        .single();

      const botToken = schoolSettings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;

      if (botToken) {
        const telegramMessageText =
          `📚 *إشعار واجب مدرسي جديد* 🎓\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🏫 *الصف والشعبة:* ${fullClassName}\n` +
          `📖 *المادة:* ${cleanSubject}\n` +
          `👨‍🏫 *المعلم:* ${cleanTeacherName}\n` +
          `📝 *عنوان الواجب:* ${title}\n` +
          `📅 *موعد التسليم:* ${dueDate}\n\n` +
          `📋 *تفاصيل الواجب والتعليمات:*\n` +
          `${description}\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `⚠️ *تنبيه للطلبة وأولياء الأمور:* يرجى حل الواجب وتسليمه في الوقت المحدد ومتابعته عبر المنظومة.`;

        // إرسال للمدير إذا وُجد chat_id
        if (schoolSettings?.telegram_director_chat_id) {
          await sendTelegramMessage(botToken, schoolSettings.telegram_director_chat_id, telegramMessageText);
        }

        // إرسال لأي شات مسجل في قاعدة البيانات
        const { data: chatSubscribers } = await supabase
          .from("school_settings")
          .select("id");
      }
    } catch (telegramErr) {
      console.warn("Could not dispatch telegram notification:", telegramErr);
    }

    return NextResponse.json({
      ok: true,
      homeworkId: newHw?.id,
      message: "تم حفظ الواجب ونشر الإشعارات بنجاح للطلاب وأولياء الأمور",
    });
  } catch (error: unknown) {
    console.error("Error in /api/homeworks:", error);
    const err = error as Error;
    return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
