import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// معالجة استدعاءات بوت التيليجرام بربط حقيقي مع قاعدة بيانات سوبابيس
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createServerSupabaseClient();
    let token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      try {
        const { data: sData } = await supabase.from("school_settings").select("telegram_bot_token").limit(1).single();
        if (sData?.telegram_bot_token) {
          token = sData.telegram_bot_token;
        }
      } catch (e) {
        console.warn("Could not query telegram token from school_settings:", e);
      }
    }

    const message = body?.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true, info: "No text message" });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // 1. أمر /احصائية_اليوم للمدير (بيانات حية من الجداول)
    if (text === "/احصائية_اليوم" || text.startsWith("/احصائية_اليوم")) {
      const today = new Date().toISOString().split("T")[0];

      // إجمالي الطلاب الفعلي
      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      // إجمالي المعلمين الفعلي
      const { count: totalTeachers } = await supabase
        .from("teachers")
        .select("*", { count: "exact", head: true });

      // سجلات الحضور لليوم الفعلي
      const { data: todayAttendance } = await supabase
        .from("attendances")
        .select("status")
        .eq("date", today);

      const totalRecorded = todayAttendance?.length || 0;
      const presentCount = todayAttendance?.filter((a) => a.status === "present").length || 0;
      const absentCount = todayAttendance?.filter((a) => a.status === "absent").length || 0;

      const attendancePercentage = totalRecorded > 0
        ? ((presentCount / totalRecorded) * 100).toFixed(1)
        : "لم يبدأ التسجيل بعد";

      const reply = `📊 *كشف إحصائيات المدرسة لليوم (${today}):*\n\n` +
        `👥 إجمالي الطلاب المسجلين: *${totalStudents || 0} طالب*\n` +
        `👨‍🏫 إجمالي الكادر التدريسي: *${totalTeachers || 0} معلم*\n` +
        `✅ نسبة الحضور اليوم: *${attendancePercentage}${totalRecorded > 0 ? "%" : ""}*\n` +
        `❌ الغياب المسجل: *${absentCount} طالب*\n` +
        `📌 الحاضرون: *${presentCount} طالب*\n\n` +
        `_البيانات محدثة لحظياً من قاعدة البيانات المركزية._`;

      await sendTelegramMessage(token, chatId, reply);
      return NextResponse.json({ ok: true, command: "احصائية_اليوم" });
    }

    // 2. أمر /دروسي_اليوم (جدول الحصص الفعلي لليوم)
    if (text === "/دروسي_اليوم" || text.startsWith("/دروسي_اليوم")) {
      // اليوم الحالي من 1 إلى 7 (1: الأحد ... 5: الخميس)
      const dayOfWeek = (new Date().getDay() + 1);

      const { data: schedules } = await supabase
        .from("weekly_schedules")
        .select(`
          period,
          classes ( name, section ),
          subjects ( name ),
          teachers ( profile_id, profiles ( full_name ) )
        `)
        .eq("day_of_week", dayOfWeek)
        .order("period", { ascending: true })
        .limit(8);

      let reply = `📚 *جدول الحصص المدرسية لليوم:* \n\n`;

      if (schedules && schedules.length > 0) {
        schedules.forEach((sc: unknown) => {
          const item = sc as {
            period: number;
            classes?: { name: string; section: string };
            subjects?: { name: string };
            teachers?: { profiles?: { full_name: string } };
          };
          reply += `🔹 *الحصة ${item.period}:* ${item.classes?.name || "الصف"} (${item.classes?.section || ""}) - مادة: ${item.subjects?.name || "عام"} [${item.teachers?.profiles?.full_name || ""}]\n`;
        });
      } else {
        reply += `لا توجد حصص مجدولة مسجلة لهذا اليوم في قاعدة البيانات.`;
      }

      await sendTelegramMessage(token, chatId, reply);
      return NextResponse.json({ ok: true, command: "دروسي_اليوم" });
    }

    // 3. أمر /الواجبات أو /واجباتي للطلاب وأولياء الأمور
    if (text === "/الواجبات" || text.startsWith("/الواجبات") || text === "/واجباتي" || text.startsWith("/واجباتي")) {
      const { data: homeworks } = await supabase
        .from("homeworks")
        .select(`
          id,
          title,
          description,
          due_date,
          classes ( name, section ),
          subjects ( name ),
          teachers ( profiles ( full_name ) )
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      let reply = `📚 *أحدث الواجبات المدرسية المقررة:* \n\n`;

      if (homeworks && homeworks.length > 0) {
        homeworks.forEach((hw: unknown) => {
          const item = hw as {
            title: string;
            description: string;
            due_date: string;
            classes?: { name: string; section: string };
            subjects?: { name: string };
            teachers?: { profiles?: { full_name: string } };
          };
          reply += `━━━━━━━━━━━━━━━━━━\n` +
            `🏫 *الصف:* ${item.classes?.name || "الصف"} (${item.classes?.section || ""})\n` +
            `📖 *المادة:* ${item.subjects?.name || "عام"}\n` +
            `👨‍🏫 *الأستاذ:* ${item.teachers?.profiles?.full_name || "مدرس المادة"}\n` +
            `📝 *الواجب:* ${item.title}\n` +
            `📅 *موعد التسليم:* ${item.due_date}\n` +
            `ℹ️ *التعليمات:* ${item.description}\n`;
        });
        reply += `\n💡 يرجى الالتزام بمواعيد التسليم المحددة.`;
      } else {
        reply += `لا توجد واجبات منزلية منشورة حالياً في المنظومة.`;
      }

      await sendTelegramMessage(token, chatId, reply);
      return NextResponse.json({ ok: true, command: "الواجبات" });
    }

    // رسالة الترحيب وقائمة الأوامر
    if (text === "/start") {
      const welcome = `مرحباً بك في بوت *نظام إدارة المدرسة* 🎓\n\n` +
        `الأوامر المعتمدة:\n` +
        `▫️ /الواجبات - استعراض أحدث الواجبات المنزلية المقررة ومواعيد تسليمها\n` +
        `▫️ /دروسي_اليوم - استعراض جدول الحصص الفعلي لليوم\n` +
        `▫️ /احصائية_اليوم - كشف فوري بالأرقام الحقيقية للطلاب ونسب الحضور\n\n` +
        `جميع البيانات مربوطة لحظياً بالمنظومة المدرسية وقاعدة بيانات سوبابيس.`;
      await sendTelegramMessage(token, chatId, welcome);
      return NextResponse.json({ ok: true, command: "start" });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}

async function sendTelegramMessage(token: string | undefined, chatId: number | string, text: string) {
  if (!token) return;
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
}
