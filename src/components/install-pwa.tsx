"use client";

import { Download, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
    const onBeforeInstall = (event: Event) => { event.preventDefault(); setDeferredPrompt(event as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBeforeInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed) return <span className="inline-flex items-center gap-2 text-sm text-emerald-700"><Check size={16} /> التطبيق مثبت</span>;
  if (!deferredPrompt) return null;
  return <Button onClick={async () => { await deferredPrompt.prompt(); const result = await deferredPrompt.userChoice; if (result.outcome === "accepted") setDeferredPrompt(null); }}><Download size={16} className="ml-2" /> تثبيت التطبيق</Button>;
}
