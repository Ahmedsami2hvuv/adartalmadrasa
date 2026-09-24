/**
 * مكتبة معالجة وتنسيق أرقام الهواتف (خاصة الأرقام العراقية والدولية)
 * تدعم الكتابة بالأرقام العربية والإنجليزية وبكافة الصيغ:
 * +9647733921468 | 07733921468 | 7733921468 | +964 776 403 1859 | ٠٧٧٣٣٩٢١٤٦٨
 */

const ARABIC_INDIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const EASTERN_ARABIC_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function cleanPhoneDigits(raw: string): string {
  if (!raw) return "";
  let res = raw.trim();

  // تحويل الأرقام العربية والفارسية إلى أرقام إنجليزية
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(ARABIC_INDIC_DIGITS[i], "g"), i.toString());
    res = res.replace(new RegExp(EASTERN_ARABIC_DIGITS[i], "g"), i.toString());
  }

  // إزالة كل ما هو ليس رقماً
  return res.replace(/[^0-9]/g, "");
}

export interface ParsedPhone {
  raw: string;
  digitsOnly: string;
  whatsappNumber: string; // صيغة الرابط الدولي الصالح لواتساب بدون مسافات (مثال: 9647733921468)
  displayFormatted: string; // صيغة منسقة وأنيقة للعرض في الجداول
  isValid: boolean;
}

export function parseAndFormatPhone(raw: string): ParsedPhone {
  const digits = cleanPhoneDigits(raw);

  if (!digits || digits.length < 7) {
    return {
      raw,
      digitsOnly: digits,
      whatsappNumber: digits,
      displayFormatted: raw || "-",
      isValid: false,
    };
  }

  let international = digits;

  // إزالة أصفار البداية الدولية مثل 00964
  if (international.startsWith("00964")) {
    international = international.substring(2);
  }

  // إذا بدأ بـ 07 (الرقم العراقي المحلي المعتاد: 11 رقماً)
  if (international.startsWith("07") && international.length === 11) {
    international = "964" + international.substring(1);
  }
  // إذا بدأ بـ 7 مباشرة (10 أرقام)
  else if (international.startsWith("7") && international.length === 10) {
    international = "964" + international;
  }
  // إذا كتب 96407... (خطأ شائع بكتابة الصفر بعد المفتاح)
  else if (international.startsWith("96407") && international.length === 14) {
    international = "964" + international.substring(4);
  }

  // صياغة العرض الأنيق
  let display = international;
  if (international.startsWith("964") && international.length === 13) {
    // +964 773 392 1468
    const country = "+964";
    const op = international.substring(3, 6);
    const mid = international.substring(6, 9);
    const last = international.substring(9);
    display = `${country} ${op} ${mid} ${last}`;
  } else if (international.length === 11 && international.startsWith("07")) {
    display = `${international.substring(0, 4)} ${international.substring(4, 7)} ${international.substring(7)}`;
  }

  return {
    raw,
    digitsOnly: digits,
    whatsappNumber: international,
    displayFormatted: display,
    isValid: international.length >= 10,
  };
}
