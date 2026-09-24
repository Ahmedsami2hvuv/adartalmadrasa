import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: students, error } = await supabase
      .from("students")
      .select(`
        id,
        qr_code,
        points,
        academic_year,
        profiles ( full_name, phone ),
        classes ( id, name, section ),
        parents ( id, profiles ( full_name, phone ) )
      `);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ students });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
