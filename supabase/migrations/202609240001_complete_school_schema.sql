-- =====================================================
-- نظام إدارة المدرسة المتكامل - قاعدة بيانات سوبابيس (Supabase SQL Schema)
-- يتضمن الجداول والعلاقات وسياسات الأمان على مستوى الصفوف (RLS)
-- =====================================================

-- 1. تمكين امتدادات UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. إنشاء نوع مخصص للأدوار (Roles)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('director', 'vice_director', 'teacher', 'student', 'parent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. جدول الملفات الشخصية (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'student',
    full_name TEXT NOT NULL,
    phone TEXT,
    national_id TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. جدول الصفوف والشعب (classes)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,          -- مثل: "الأول متوسط", "الخامس العلمي"
    section TEXT NOT NULL,       -- مثل: "أ", "ب", "ج"
    stage TEXT NOT NULL,         -- مثل: "ابتدائي", "متوسط", "إعدادي"
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. جدول أولياء الأمور (parents)
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_title TEXT,
    alternative_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. جدول المعلمين (teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    specialization TEXT,
    subjects TEXT[] DEFAULT '{}',
    classes UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. جدول المواد الدراسية (subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,          -- مثل: "الرياضيات", "اللغة العربية"
    stage TEXT,                  -- اختياري: مرحلة المادة
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. جدول الطلاب (students)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
    qr_code TEXT UNIQUE NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. جدول الجدول الأسبوعي (weekly_schedules)
CREATE TABLE IF NOT EXISTS public.weekly_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1: الأحد, 2: الاثنين ...
    period SMALLINT NOT NULL CHECK (period BETWEEN 1 AND 8),             -- الحصة من 1 إلى 5 أو 8
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- منع التضارب: لا يمكن لمعلم أن يدرس صفين في نفس الحصة واليوم
    CONSTRAINT unique_teacher_time UNIQUE (teacher_id, day_of_week, period),
    -- منع التضارب: لا يمكن للصف أن يدرس حصتين في نفس الوقت
    CONSTRAINT unique_class_time UNIQUE (class_id, day_of_week, period)
);

-- 10. جدول الحضور والغياب (attendances)
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    period SMALLINT NOT NULL CHECK (period BETWEEN 1 AND 8),
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_student_attendance UNIQUE (student_id, date, period)
);

-- 11. جدول الدرجات (grades)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('daily', 'monthly', 'final', 'activity')),
    score NUMERIC(5,2) NOT NULL CHECK (score >= 0),
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
    note TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. جدول الملاحظات السلوكية (behavior_notes)
CREATE TABLE IF NOT EXISTS public.behavior_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL CHECK (note_type IN ('positive', 'negative', 'neutral')),
    points_impact INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. جدول الواجبات المنزلية (homeworks)
CREATE TABLE IF NOT EXISTS public.homeworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. جدول تسليم الواجبات (homework_submissions)
CREATE TABLE IF NOT EXISTS public.homework_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    homework_id UUID NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    solution_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late')),
    score NUMERIC(5,2),
    feedback TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_homework_submission UNIQUE (homework_id, student_id)
);

-- 15. جدول الأقساط المدرسية (installments)
CREATE TABLE IF NOT EXISTS public.installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title TEXT NOT NULL,         -- مثل: "القسط الأول", "قسط النقل"
    amount NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
    receipt_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. جدول طلبات الإجازة للطلاب (leave_requests)
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. جدول الخطة اليومية للمعلم (daily_lesson_plans)
CREATE TABLE IF NOT EXISTS public.daily_lesson_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    period SMALLINT NOT NULL,
    lesson_title TEXT NOT NULL,
    objectives TEXT,
    homework_assigned TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. جدول حجز مواعيد أولياء الأمور (parent_appointments)
CREATE TABLE IF NOT EXISTS public.parent_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    requested_date DATE NOT NULL,
    requested_time TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    reply_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. جدول الإشعارات (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. جدول إعدادات المدرسة (school_settings)
CREATE TABLE IF NOT EXISTS public.school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name TEXT NOT NULL DEFAULT 'المدرسة الذكية النموذجية',
    working_days SMALLINT NOT NULL DEFAULT 5, -- 5 أو 6 أيام عمل
    periods_per_day SMALLINT NOT NULL DEFAULT 5, -- 5 حصص
    telegram_bot_token TEXT,
    telegram_director_chat_id TEXT,
    telegram_channel_id TEXT,
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- وضع صف إعدادات افتراضي للمدرسة إذا لم يكن موجوداً
INSERT INTO public.school_settings (school_name, working_days, periods_per_day)
SELECT 'المدرسة الذكية النموذجية', 5, 5
WHERE NOT EXISTS (SELECT 1 FROM public.school_settings);

-- =====================================================
-- دوال مساعدة لسياسات الأمان RLS
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_management()
RETURNS BOOLEAN AS $$
    SELECT current_user_role() IN ('director', 'vice_director');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS UUID AS $$
    SELECT id FROM public.teachers WHERE profile_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID AS $$
    SELECT id FROM public.students WHERE profile_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_parent_id()
RETURNS UUID AS $$
    SELECT id FROM public.parents WHERE profile_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- سياسات RLS: profiles
-- =====================================================
CREATE POLICY "المستخدم يرى حسابه أو الإدارة ترى الجميع" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_management() OR current_user_role() = 'teacher');

CREATE POLICY "المستخدم يحدث حسابه أو الإدارة" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_management());

CREATE POLICY "الإدارة تنشئ وتحذف الحسابات" ON public.profiles
    FOR ALL USING (public.is_management());

-- =====================================================
-- سياسات RLS: classes & subjects
-- =====================================================
CREATE POLICY "الجميع يقرأ الصفوف والمواد" ON public.classes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "الإدارة تدير الصفوف" ON public.classes
    FOR ALL USING (public.is_management());

CREATE POLICY "الجميع يقرأ المواد" ON public.subjects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "الإدارة تدير المواد" ON public.subjects
    FOR ALL USING (public.is_management());

-- =====================================================
-- سياسات RLS: teachers & parents & students
-- =====================================================
CREATE POLICY "قراءة بيانات المعلمين" ON public.teachers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "الإدارة تدير المعلمين" ON public.teachers
    FOR ALL USING (public.is_management());

CREATE POLICY "قراءة بيانات الطلاب" ON public.students
    FOR SELECT TO authenticated USING (
        public.is_management()
        OR current_user_role() = 'teacher'
        OR profile_id = auth.uid()
        OR parent_id = public.current_parent_id()
    );

CREATE POLICY "الإدارة تدير الطلاب" ON public.students
    FOR ALL USING (public.is_management());

CREATE POLICY "قراءة بيانات أولياء الأمور" ON public.parents
    FOR SELECT TO authenticated USING (
        public.is_management()
        OR current_user_role() = 'teacher'
        OR profile_id = auth.uid()
    );

CREATE POLICY "الإدارة تدير أولياء الأمور" ON public.parents
    FOR ALL USING (public.is_management());

-- =====================================================
-- سياسات RLS: weekly_schedules
-- =====================================================
CREATE POLICY "الجميع يقرأ الجداول الدراسية" ON public.weekly_schedules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "الإدارة تدير الجداول الدراسية" ON public.weekly_schedules
    FOR ALL USING (public.is_management());

-- =====================================================
-- سياسات RLS: attendances
-- =====================================================
CREATE POLICY "عرض الحضور والغياب" ON public.attendances
    FOR SELECT TO authenticated USING (
        public.is_management()
        OR teacher_id = public.current_teacher_id()
        OR student_id = public.current_student_id()
        OR student_id IN (SELECT id FROM public.students WHERE parent_id = public.current_parent_id())
    );

CREATE POLICY "المعلم والإدارة يسجلان الحضور" ON public.attendances
    FOR INSERT TO authenticated WITH CHECK (
        public.is_management() OR teacher_id = public.current_teacher_id()
    );

CREATE POLICY "المعلم والإدارة يعدلان الحضور" ON public.attendances
    FOR UPDATE TO authenticated USING (
        public.is_management() OR teacher_id = public.current_teacher_id()
    );

CREATE POLICY "الإدارة تحذف الحضور" ON public.attendances
    FOR DELETE TO authenticated USING (public.is_management());

-- =====================================================
-- سياسات RLS: grades
-- =====================================================
CREATE POLICY "عرض الدرجات" ON public.grades
    FOR SELECT TO authenticated USING (
        public.is_management()
        OR current_user_role() = 'teacher'
        OR student_id = public.current_student_id()
        OR student_id IN (SELECT id FROM public.students WHERE parent_id = public.current_parent_id())
    );

CREATE POLICY "المعلم والإدارة يضيفان ويعدلان الدرجات" ON public.grades
    FOR ALL TO authenticated USING (
        public.is_management() OR current_user_role() = 'teacher'
    );

-- =====================================================
-- سياسات RLS: behavior_notes
-- =====================================================
CREATE POLICY "عرض الملاحظات السلوكية" ON public.behavior_notes
    FOR SELECT TO authenticated USING (
        public.is_management()
        OR teacher_id = public.current_teacher_id()
        OR student_id = public.current_student_id()
        OR student_id IN (SELECT id FROM public.students WHERE parent_id = public.current_parent_id())
    );

CREATE POLICY "المعلم والإدارة يكتبان الملاحظات السلوكية" ON public.behavior_notes
    FOR ALL TO authenticated USING (
        public.is_management() OR teacher_id = public.current_teacher_id()
    );

-- =====================================================
-- سياسات RLS: homeworks & homework_submissions
-- =====================================================
CREATE POLICY "الجميع في المدرسة يرى الواجبات" ON public.homeworks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "المعلم والإدارة يضيفان الواجبات" ON public.homeworks
    FOR ALL TO authenticated USING (
        public.is_management() OR teacher_id = public.current_teacher_id()
    );

CREATE POLICY "رؤية تسليمات الواجبات" ON public.homework_submissions
    FOR SELECT TO authenticated USING (
        public.is_management()
        OR current_user_role() = 'teacher'
        OR student_id = public.current_student_id()
        OR student_id IN (SELECT id FROM public.students WHERE parent_id = public.current_parent_id())
    );

CREATE POLICY "الطالب يسلم واجبه" ON public.homework_submissions
    FOR INSERT TO authenticated WITH CHECK (
        student_id = public.current_student_id()
    );

CREATE POLICY "المعلم يقيم ويسجل درجة الواجب" ON public.homework_submissions
    FOR UPDATE TO authenticated USING (
        public.is_management() OR current_user_role() = 'teacher' OR student_id = public.current_student_id()
    );

-- =====================================================
-- سياسات RLS: installments
-- =====================================================
CREATE POLICY "عرض الأقساط" ON public.installments
    FOR SELECT TO authenticated USING (
        public.is_management()
        OR student_id = public.current_student_id()
        OR student_id IN (SELECT id FROM public.students WHERE parent_id = public.current_parent_id())
    );

CREATE POLICY "الإدارة تدير الأقساط" ON public.installments
    FOR ALL USING (public.is_management());

-- =====================================================
-- سياسات RLS: leave_requests
-- =====================================================
CREATE POLICY "عرض طلبات الإجازة" ON public.leave_requests
    FOR SELECT TO authenticated USING (
        public.is_management()
        OR student_id = public.current_student_id()
        OR student_id IN (SELECT id FROM public.students WHERE parent_id = public.current_parent_id())
    );

CREATE POLICY "الطالب أو ولي الأمر يقدم إجازة" ON public.leave_requests
    FOR INSERT TO authenticated WITH CHECK (
        student_id = public.current_student_id()
        OR student_id IN (SELECT id FROM public.students WHERE parent_id = public.current_parent_id())
    );

CREATE POLICY "الإدارة تراجع طلب الإجازة" ON public.leave_requests
    FOR UPDATE TO authenticated USING (public.is_management());

-- =====================================================
-- سياسات RLS: daily_lesson_plans
-- =====================================================
CREATE POLICY "عرض الخطط اليومية" ON public.daily_lesson_plans
    FOR SELECT TO authenticated USING (
        public.is_management() OR teacher_id = public.current_teacher_id()
    );

CREATE POLICY "المعلم يدير خططه اليومية" ON public.daily_lesson_plans
    FOR ALL TO authenticated USING (
        teacher_id = public.current_teacher_id() OR public.is_management()
    );

-- =====================================================
-- سياسات RLS: parent_appointments
-- =====================================================
CREATE POLICY "عرض مواعيد أولياء الأمور" ON public.parent_appointments
    FOR SELECT TO authenticated USING (
        public.is_management()
        OR parent_id = public.current_parent_id()
        OR teacher_id = public.current_teacher_id()
    );

CREATE POLICY "ولي الأمر يطلب موعد" ON public.parent_appointments
    FOR INSERT TO authenticated WITH CHECK (
        parent_id = public.current_parent_id()
    );

CREATE POLICY "المعلم والإدارة يعدلان حالة الموعد" ON public.parent_appointments
    FOR UPDATE TO authenticated USING (
        public.is_management() OR teacher_id = public.current_teacher_id()
    );

-- =====================================================
-- سياسات RLS: notifications
-- =====================================================
CREATE POLICY "المستخدم يرى إشعاراته فقط" ON public.notifications
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "المستخدم يحدث حالة قراءة إشعاره" ON public.notifications
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "إرسال الإشعارات" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- سياسات RLS: school_settings
-- =====================================================
CREATE POLICY "الجميع يقرأ إعدادات المدرسة" ON public.school_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "الإدارة تعدل إعدادات المدرسة" ON public.school_settings
    FOR ALL USING (public.is_management());

-- =====================================================
-- تريغر لإنشاء profile تلقائياً عند تسجيل المستخدم في auth.users
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, phone, national_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'national_id'
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- تمكين ميزة Realtime على الجداول الحساسة
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.behavior_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homeworks;
