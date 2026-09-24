"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, X, Check, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScannerModal({ onScan, onClose }: QRScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.warn("Camera access failed or unavailable:", err);
      setHasCamera(false);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-white">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">مسح رمز الحضور QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {hasCamera ? (
            <div className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden bg-black border-2 border-dashed border-blue-500 flex items-center justify-center mb-4">
              <video
                ref={videoRef}
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-4 border-blue-500/40 pointer-events-none rounded-2xl m-6 animate-pulse" />
              <div className="absolute bottom-3 text-center text-xs bg-black/60 px-3 py-1 rounded-full text-slate-300">
                وجه الكاميرا نحو باركود الطالب
              </div>
            </div>
          ) : (
            <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>الكاميرا غير متاحة حالياً، يمكنك إدخال كود الطالب أو بطاقته يدوياً أدناه لتسجيل الحضور فوراً.</span>
            </div>
          )}

          {/* محاكاة سريعة لكود الطالب للمعاينة والتجربة المباشرة */}
          <div className="w-full mb-4">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              إدخال رمز الطالب (يدوياً أو بواسطة الماسح الضوئي):
            </label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="مثال: STU-2025-01"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <Button type="submit" variant="default" className="bg-blue-600 hover:bg-blue-500">
                <Check className="w-4 h-4 ml-1" />
                تأكيد
              </Button>
            </form>
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex justify-end">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
}
