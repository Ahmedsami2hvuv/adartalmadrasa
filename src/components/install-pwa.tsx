"use client";

import React, { useEffect, useState } from "react";
import { Download, CheckCircle, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPWA({ variant = "button" }: { variant?: "button" | "banner" | "badge" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // التحقق هل التطبيق يعمل في وضع التثبيت المستقل standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // التحقق من أجهزة iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        alert("لتثبيت التطبيق على آيفون:\n1. اضغط على زر المشاركة (Share) في الأسفل.\n2. اختر 'إضافة إلى الصفحة الرئيسية' (Add to Home Screen).");
      } else {
        alert("يمكنك تثبيت التطبيق من قائمة خيارات المتصفح (⋮) -> 'تثبيت التطبيق' أو 'إضافة إلى الشاشة الرئيسية'.");
      }
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
        <CheckCircle className="w-4 h-4" />
        <span>التطبيق مُثبت</span>
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  if (variant === "banner") {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-base">تثبيت تطبيق مدرستي على هاتفك</h4>
            <p className="text-xs text-blue-100">استمتع بتجربة أسرع بدون شريط المتصفح وتصفح جدولك بدون إنترنت</p>
          </div>
        </div>
        <button
          onClick={handleInstallClick}
          className="w-full sm:w-auto px-5 py-2.5 bg-white text-blue-700 font-bold text-sm rounded-xl shadow hover:bg-blue-50 transition flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>تثبيت الآن مجاناً</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 active:scale-95 transition"
      title="تثبيت التطبيق على جهازك"
    >
      <Download className="w-4 h-4" />
      <span>تحميل التطبيق</span>
    </button>
  );
}
