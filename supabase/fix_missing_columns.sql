-- ====================================================================
-- سكربت الإصلاح الشامل لقاعدة بيانات سوبابيس (آمن 100% ولا يحذف أي بيانات)
-- فك القيود المعيقة وإضافة الأعمدة لتمكين حفظ المعلمين والطلاب والجدول فوراً
-- ====================================================================

-- 1. فك قيد الارتباط الصارم من جدول profiles لتمكين حفظ الحسابات فورا
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. إضافة الأعمدة لجدول الملفات الشخصية (profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. إضافة الأعمدة لجدول المعلمين (teachers)
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS classes UUID[] DEFAULT '{}';

-- 4. إضافة الأعمدة لجدول الطلاب (students)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';

-- 5. إضافة عمود day_of_week لجدول الجدول الأسبوعي (weekly_schedules) ومطابقته
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_schedules') THEN
        ALTER TABLE public.weekly_schedules ADD COLUMN IF NOT EXISTS day_of_week SMALLINT;
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'weekly_schedules' AND column_name = 'day') THEN
            UPDATE public.weekly_schedules SET day_of_week = day WHERE day_of_week IS NULL AND day IS NOT NULL;
        END IF;
    END IF;
END $$;

-- 6. التأكد من وجود جدول المواد الدراسية (subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    stage TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. تحديث كاش المخطط (Schema Cache Reload)
NOTIFY pgrst, 'reload schema';
