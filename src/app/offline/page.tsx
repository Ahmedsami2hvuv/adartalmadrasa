import Link from "next/link";

export default function OfflinePage() {
  return <main className="flex min-h-screen items-center justify-center p-6 text-center"><div><div className="mb-4 text-6xl">📡</div><h1 className="text-2xl font-bold">لا يوجد اتصال بالإنترنت</h1><p className="mt-3 text-muted-foreground">يمكنك متابعة البيانات المحفوظة مؤقتاً، وسنزامن التغييرات عند عودة الاتصال.</p><Link href="/dashboard" className="mt-6 inline-block text-primary underline">العودة للوحة التحكم</Link></div></main>;
}
