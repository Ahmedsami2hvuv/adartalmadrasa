import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام إدارة المدرسة الذكية - المنظومة التعليمية السحابية المتكاملة",
  description: "نظام متكامل لإدارة المدارس والصفوف والدرجات والغيابات مع دعم كامل لتطبيق الويب التقدمي PWA وبوت التيليجرام.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "مدرستي",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen font-sans antialiased bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-800">
        {children}
      </body>
    </html>
  );
}
