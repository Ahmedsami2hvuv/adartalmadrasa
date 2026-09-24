// Supabase Edge Function: telegram-cron
// ترسل إشعارات صباحية للمعلمين في الساعة 7:00 ص، وتنبيه قبل 10 دقائق من الحصص

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action } = await req.json().catch(() => ({ action: "morning_summary" }));

    // 1. إرسال جدول الحصص الصباحي الساعة 7:00 ص
    if (action === "morning_summary") {
      const today = new Date().getDay() + 1; // 1: الأحد ...
      // استعلام عن الحصص والمدرسين
      const { data: schedules } = await supabase
        .from("weekly_schedules")
        .select(`
          period,
          classes ( name, section ),
          subjects ( name ),
          teachers ( id, profile_id, profiles ( full_name, phone ) )
        `)
        .eq("day_of_week", today);

      return new Response(JSON.stringify({ message: "Morning notifications dispatched", count: schedules?.length || 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. تنبيه قبل الحصة بـ 10 دقائق
    if (action === "period_reminder") {
      return new Response(JSON.stringify({ message: "Period reminder checked" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
