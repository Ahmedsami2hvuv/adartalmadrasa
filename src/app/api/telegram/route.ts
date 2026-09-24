import { NextRequest, NextResponse } from "next/server";

// معالجة استدعاءات وبوت التيليجرام والأوامر المدرسية
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;

    // استخراج بيانات الرسالة من تيليجرام
    const message = body?.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true, info: "No text message" });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // 1. أمر /دروسي_اليوم
    if (text === "/دروسي_اليوم" || text.startsWith("/دروسي_اليوم")) {
      const reply = `📚 *جدول دروسك لليوم في المدرسة:*\n\n` +
        `1️⃣ *الحصة 1* (8:00 - 8:45 ص): الأول متوسط (أ) - رياضيات\n` +
        `2️⃣ *الحصة 3* (9:50 - 10:35 ص): الثاني متوسط (ب) - رياضيات\n\n` +
        `💡 تذكير: يمكنك مسح باركود الطلاب لتسجيل الحضور من خلال تطبيق PWA.`;

      await sendTelegramMessage(token, chatId, reply);
      return NextResponse.json({ ok: true, command: "دروسي_اليوم" });
    }

    // 2. أمر /احصائية_اليوم للمدير
    if (text === "/احصائية_اليوم" || text.startsWith("/احصائية_اليوم")) {
      const reply = `📊 *تقرير إحصائيات المدرسة اليوم:*\n\n` +
        `👥 إجمالي الطلاب: *280 طالب*\n` +
        `✅ الحضور اليوم: *95.2%*\n` +
        `❌ الغياب: *13 طالب*\n` +
        `👨‍🏫 دوام الكادر: *100% مكتمل*\n` +
        `💰 نسبة تحصيل الأقساط: *76%*\n\n` +
        `النظام يعمل بصورة ممتازة.`;

      await sendTelegramMessage(token, chatId, reply);
      return NextResponse.json({ ok: true, command: "احصائية_اليوم" });
    }

    // رسالة الترحيب الافتراضية لأي أمر آخر
    if (text === "/start") {
      const welcome = `مرحباً بك في بوت *نظام إدارة المدرسة الذكية* 🎓\n\n` +
        `الأوامر المتاحة:\n` +
        `▫️ /دروسي_اليوم - عرض جدول حصصك لليوم\n` +
        `▫️ /احصائية_اليوم - كشف فوري بنسب الحضور والغياب للمدير\n\n` +
        `سيصلك يومياً إشعار جدولك الصباحي في تمام 7:00 ص، وتنبيه قبل 10 دقائق من كل حصة.`;
      await sendTelegramMessage(token, chatId, welcome);
      return NextResponse.json({ ok: true, command: "start" });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}

// دالة إرسال رسالة عبر تيلجرام API
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
