import { jsPDF } from "jspdf";

export interface StudentReportData {
  studentName: string;
  className: string;
  attendanceRate: string;
  grades: { subject: string; score: number; type: string }[];
  behaviorNotes: string[];
  schoolName: string;
}

export function generateStudentPDF(data: StudentReportData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Header
  doc.setFontSize(20);
  doc.text(data.schoolName || "مدرستي", 105, 20, { align: "center" });

  doc.setFontSize(14);
  doc.text("تقرير أداء الطالب الأسبوعي", 105, 30, { align: "center" });

  doc.setLineWidth(0.5);
  doc.line(15, 35, 195, 35);

  // Student Info
  doc.setFontSize(11);
  doc.text(`اسم الطالب: ${data.studentName}`, 190, 45, { align: "right" });
  doc.text(`الصف: ${data.className}`, 190, 52, { align: "right" });
  doc.text(`نسبة الحضور: ${data.attendanceRate}`, 190, 59, { align: "right" });

  // Grades Section
  doc.setFontSize(13);
  doc.text("الدرجات السلوكية والأكاديمية:", 190, 72, { align: "right" });

  let y = 80;
  data.grades.forEach((g) => {
    doc.setFontSize(10);
    doc.text(`${g.subject}: ${g.score} / 100 (${g.type})`, 185, y, { align: "right" });
    y += 7;
  });

  if (data.behaviorNotes.length > 0) {
    y += 5;
    doc.setFontSize(13);
    doc.text("ملاحظات المعلمين:", 190, y, { align: "right" });
    y += 8;
    data.behaviorNotes.forEach((note) => {
      doc.setFontSize(10);
      doc.text(`- ${note}`, 185, y, { align: "right" });
      y += 7;
    });
  }

  // Footer
  doc.setFontSize(9);
  doc.text("تم إنشاء هذا التقرير آلياً عبر نظام إدارة المدرسة", 105, 280, { align: "center" });

  doc.save(`تقرير_${data.studentName}.pdf`);
}
