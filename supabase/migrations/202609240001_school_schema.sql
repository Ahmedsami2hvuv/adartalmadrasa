-- School management schema for Supabase.
-- Passwords are intentionally managed by Supabase Auth, never stored in profiles.
create extension if not exists "pgcrypto";

create type public.user_role as enum ('director','vice_director','teacher','student','parent');
create type public.attendance_status as enum ('present','absent');
create type public.grade_type as enum ('daily','monthly','final');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  subjects uuid[] not null default '{}',
  classes uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section text not null,
  stage text not null,
  academic_year text not null default extract(year from now())::text,
  created_at timestamptz not null default now(),
  unique(name, section, academic_year)
);
create table public.parents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  parent_id uuid references public.parents(id) on delete set null,
  qr_code text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
create table public.weekly_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  day smallint not null check (day between 1 and 6),
  period smallint not null check (period between 1 and 5),
  created_at timestamptz not null default now(),
  unique(class_id, day, period),
  unique(teacher_id, day, period)
);
create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  date date not null default current_date,
  period smallint not null check (period between 1 and 5),
  status public.attendance_status not null,
  created_at timestamptz not null default now(),
  unique(student_id, date, period)
);
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  type public.grade_type not null,
  score numeric(5,2) not null check (score between 0 and 100),
  note text,
  created_at timestamptz not null default now()
);
create table public.behavior_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  note text not null,
  points integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.homeworks (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  title text not null,
  body text not null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  answer text not null,
  score numeric(5,2) check (score between 0 and 100),
  feedback text,
  submitted_at timestamptz not null default now(),
  unique(homework_id, student_id)
);
create table public.school_settings (
  id boolean primary key default true check (id),
  working_days smallint not null default 6 check (working_days between 5 and 6),
  school_name text not null default 'مدرستي',
  telegram_bot_token text,
  updated_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.installments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0 and paid_amount <= amount),
  due_date date,
  status text not null default 'pending' check (status in ('pending','partial','paid')),
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.current_role() returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;
create or replace function public.is_management() returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role() in ('director','vice_director') $$;
create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role() = 'teacher' $$;
create or replace function public.touch_updated_at() returns trigger
language plpgsql security invoker set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger settings_updated_at before update on public.school_settings for each row execute function public.touch_updated_at();

-- Create the public profile after a Supabase Auth user is created.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id, full_name, role) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.parents enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.weekly_schedules enable row level security;
alter table public.attendances enable row level security;
alter table public.grades enable row level security;
alter table public.behavior_notes enable row level security;
alter table public.homeworks enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.school_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.installments enable row level security;

create policy "profiles own or management read" on public.profiles for select using (id = auth.uid() or public.is_management());
create policy "management updates profiles" on public.profiles for update using (public.is_management() or id = auth.uid());
create policy "management manages teachers" on public.teachers for all using (public.is_management()) with check (public.is_management());
create policy "teachers read own record" on public.teachers for select using (profile_id = auth.uid());
create policy "authenticated read classes" on public.classes for select to authenticated using (true);
create policy "management manages classes" on public.classes for all using (public.is_management()) with check (public.is_management());
create policy "management manages parents" on public.parents for all using (public.is_management()) with check (public.is_management());
create policy "parents read own record" on public.parents for select using (profile_id = auth.uid());
create policy "management manages students" on public.students for all using (public.is_management()) with check (public.is_management());
create policy "student or parent reads student" on public.students for select using (profile_id = auth.uid() or parent_id in (select id from public.parents where profile_id = auth.uid()));
create policy "authenticated read subjects" on public.subjects for select to authenticated using (true);
create policy "management manages subjects" on public.subjects for all using (public.is_management()) with check (public.is_management());
create policy "authenticated read schedules" on public.weekly_schedules for select to authenticated using (true);
create policy "management manages schedules" on public.weekly_schedules for all using (public.is_management()) with check (public.is_management());
create policy "teachers manage attendance" on public.attendances for all using (public.is_teacher() and teacher_id in (select id from public.teachers where profile_id = auth.uid())) with check (public.is_teacher() and teacher_id in (select id from public.teachers where profile_id = auth.uid()));
create policy "student parent read attendance" on public.attendances for select using (student_id in (select id from public.students where profile_id = auth.uid() or parent_id in (select id from public.parents where profile_id = auth.uid())) or public.is_management());
create policy "teachers manage grades" on public.grades for all using (public.is_teacher()) with check (public.is_teacher());
create policy "student parent read grades" on public.grades for select using (student_id in (select id from public.students where profile_id = auth.uid() or parent_id in (select id from public.parents where profile_id = auth.uid())) or public.is_management());
create policy "staff manage behavior" on public.behavior_notes for all using (public.is_teacher() or public.is_management()) with check (public.is_teacher() or public.is_management());
create policy "students read behavior" on public.behavior_notes for select using (student_id in (select id from public.students where profile_id = auth.uid() or parent_id in (select id from public.parents where profile_id = auth.uid())) or public.is_management());
create policy "teachers manage homeworks" on public.homeworks for all using (public.is_teacher() or public.is_management()) with check (public.is_teacher() or public.is_management());
create policy "students read homeworks" on public.homeworks for select using (class_id in (select class_id from public.students where profile_id = auth.uid()) or public.is_management());
create policy "students manage submissions" on public.homework_submissions for all using (student_id in (select id from public.students where profile_id = auth.uid()) or public.is_teacher() or public.is_management()) with check (student_id in (select id from public.students where profile_id = auth.uid()) or public.is_teacher() or public.is_management());
create policy "management manages settings" on public.school_settings for all using (public.is_management()) with check (public.is_management());
create policy "authenticated reads settings" on public.school_settings for select to authenticated using (true);
create policy "recipients read notifications" on public.notifications for select using (recipient_id = auth.uid());
create policy "management creates notifications" on public.notifications for insert with check (public.is_management());
create policy "recipients mark notifications" on public.notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "management manages installments" on public.installments for all using (public.is_management()) with check (public.is_management());
create policy "parent reads installments" on public.installments for select using (student_id in (select id from public.students where parent_id in (select id from public.parents where profile_id = auth.uid())));

insert into public.school_settings (id) values (true) on conflict (id) do nothing;
