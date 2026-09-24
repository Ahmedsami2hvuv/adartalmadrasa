-- ====================================================================
-- سكربت تحديث وإصلاح أعمدة قاعدة بيانات سوبابيس (آمن 100% ولا يحذف أي بيانات)
-- قم بنسخ هذا الكود ولصقه في صفحة (SQL Editor) في موقع سوبابيس ثم اضغط Run
-- ====================================================================

-- 1. إضافة الأعمدة الناقصة لجدول المعلمين (teachers)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teachers') THEN
        ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS specialization TEXT;
        ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';
        ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS classes UUID[] DEFAULT '{}';
    ELSE
        CREATE TABLE public.teachers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
            specialization TEXT,
            subjects TEXT[] DEFAULT '{}',
            classes UUID[] DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. إضافة الأعمدة الناقصة لجدول الطلاب (students)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS qr_code TEXT;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
        ALTER TABLE public.students ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';
    END IF;
END $$;

-- 3. التأكد من وجود جدول المواد الدراسية (subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    stage TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. التأكد من وجود جدول الصفوف والشعب (classes)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    section TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'متوسطة',
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_class_section UNIQUE (name, section, academic_year)
);

-- 5. التأكد من وجود جدول الجدول الأسبوعي (weekly_schedules)
CREATE TABLE IF NOT EXISTS public.weekly_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    period SMALLINT NOT NULL CHECK (period BETWEEN 1 AND 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_teacher_time UNIQUE (teacher_id, day_of_week, period),
    CONSTRAINT unique_class_time UNIQUE (class_id, day_of_week, period)
);

-- 6. التأكد من وجود جدول إعدادات المدرسة (school_settings)
CREATE TABLE IF NOT EXISTS public.school_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL DEFAULT 'المدرسة النموذجية',
    working_days SMALLINT NOT NULL DEFAULT 5,
    periods_per_day SMALLINT NOT NULL DEFAULT 5,
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    telegram_bot_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. تحديث الكاش وإعادة تحميل المخطط (Schema Cache Reload)
NOTIFY pgrst, 'reload schema';
