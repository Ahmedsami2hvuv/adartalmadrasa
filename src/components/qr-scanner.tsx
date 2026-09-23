"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Camera, RefreshCw } from "lucide-react";

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onClose?: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        try {
          scanner.clear();
        } catch (e) {
          console.error("Scanner clear error", e);
        }
      },
      (errorMessage) => {
        // Error decoding, usually safe to ignore during scanning
      }
    );

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.error("Cleanup error", e);
        }
      }
    };
  }, [onScan]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-lg border">
      <div className="flex items-center justify-between w-full mb-3">
        <h3 className="font-bold flex items-center gap-2 text-base">
          <Camera className="w-5 h-5 text-primary" />
          مسح رمز كيو آر (QR Code) للطالب
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-md text-slate-600 font-medium"
          >
            إغلاق الكاميرا
          </button>
        )}
      </div>

      <div id="reader" className="w-full max-w-sm rounded-lg overflow-hidden border"></div>
      
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      <p className="text-xs text-slate-500 mt-2 text-center">
        وجه كاميرا الهاتف نحو بطاقة/رمز الطالب لتسجيل الحضور فورياً
      </p>
    </div>
  );
}
