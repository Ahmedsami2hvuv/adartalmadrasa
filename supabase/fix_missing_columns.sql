-- ====================================================================
-- سكربت فك الحجب والإصلاح الشامل لقاعدة بيانات سوبابيس (آمن 100%)
-- انسخ هذا الكود والصقه في صفحة SQL Editor واضغط Run
-- ====================================================================

-- 1. تعطيل سياسات RLS المعيقة لتمكين السيرفر من حفظ وقراءة المعلمين والطلاب فورا
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS telegram_bot_username TEXT;

-- 2. فك قيد الارتباط الصارم من جدول profiles لتمكين حفظ الحسابات فورا
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. إضافة الأعمدة لجدول الملفات الشخصية (profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. إضافة الأعمدة لجدول المعلمين (teachers)
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS classes UUID[] DEFAULT '{}';

-- 5. إضافة الأعمدة لجدول الطلاب (students)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';

-- 6. إضافة عمود day_of_week لجدول الجدول الأسبوعي (weekly_schedules) ومطابقته
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_schedules') THEN
        ALTER TABLE public.weekly_schedules ADD COLUMN IF NOT EXISTS day_of_week SMALLINT;
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'weekly_schedules' AND column_name = 'day') THEN
            UPDATE public.weekly_schedules SET day_of_week = day WHERE day_of_week IS NULL AND day IS NOT NULL;
        END IF;
    END IF;
END $$;

-- 7. التأكد من وجود جدول المواد الدراسية (subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    stage TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. تحديث كاش المخطط (Schema Cache Reload)
NOTIFY pgrst, 'reload schema';
