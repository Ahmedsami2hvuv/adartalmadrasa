# إدارة المدرسة

منصة إدارة مدرسية عربية مبنية على Next.js 14 App Router وTypeScript وTailwind CSS وSupabase.

## التشغيل المحلي

1. انسخ `.env.example` إلى `.env.local` وأضف مفاتيح مشروع Supabase.
2. شغّل migration الموجودة في `supabase/migrations` عبر Supabase CLI أو SQL Editor.
3. ثبّت الحزم وشغّل التطبيق:

```bash
npm install
npm run dev
```

## النشر

اربط المستودع مع Vercel وأضف متغيري البيئة `NEXT_PUBLIC_SUPABASE_URL` و`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
في الإنتاج يتم تسجيل Service Worker تلقائياً عبر `next-pwa`. ملفات البيانات الأساسية قابلة للتخزين المؤقت للعمل عند انقطاع الاتصال، وتوجد صفحة `/offline`.

## الأمان

تتم إدارة كلمات المرور بواسطة Supabase Auth. لا تُخزّن كلمات المرور أو مفاتيح الخدمة في `profiles` أو في الواجهة. طبّق migration قبل استخدام اللوحات؛ فهي تنشئ العلاقات وRLS والسياسات حسب الأدوار.

### دخول المدير والمعاون

واجهة الدخول تستخدم اسم المستخدم وكلمة المرور فقط. داخلياً يحوّل التطبيق اسم المستخدم إلى بريد تقني غير ظاهر للمستخدم:

- المدير: `director`
- المعاون: `vice`

عند إنشاء حسابات الإدارة في Supabase Auth استخدم:

- `director@login.adartalmadrasa.local`
- `vice@login.adartalmadrasa.local`

ثم حدّد الدور في `profiles` إلى `director` أو `vice_director`.