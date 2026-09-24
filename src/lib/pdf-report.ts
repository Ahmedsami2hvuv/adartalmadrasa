export interface StudentReportData {
  studentName: string;
  className: string;
  academicYear: string;
  schoolName: string;
  date: string;
  attendanceRate: number;
  totalAbsences: number;
  grades: {
    subject: string;
    daily: number;
    monthly: number;
    final: number;
    total: number;
  }[];
  behaviorNotes: {
    date: string;
    note: string;
    type: "positive" | "negative" | "neutral";
  }[];
  installmentsStatus: string;
}

export function printStudentReport(data: StudentReportData) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("يرجى السماح بالنوافذ المنبثقة لطباعة التقرير أو تنزيله كـ PDF");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>التقرير الأكاديمي - ${data.studentName}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 20px;
          background: #ffffff;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .school-title {
          font-size: 24px;
          font-weight: bold;
          color: #1e3a8a;
          margin: 0 0 5px 0;
        }
        .report-subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 25px;
        }
        .info-item {
          font-size: 13px;
        }
        .info-item strong {
          color: #0f172a;
        }
        h3 {
          font-size: 16px;
          color: #1e3a8a;
          border-right: 4px solid #2563eb;
          padding-right: 8px;
          margin: 20px 0 10px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          text-align: right;
        }
        th {
          background-color: #f1f5f9;
          font-weight: 600;
          color: #334155;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }
        .badge-positive { background-color: #dcfce7; color: #15803d; }
        .badge-negative { background-color: #fee2e2; color: #b91c1c; }
        .badge-neutral { background-color: #f1f5f9; color: #475569; }
        .footer {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          padding-top: 20px;
          border-top: 1px dashed #cbd5e1;
          font-size: 12px;
          color: #64748b;
        }
        .signature-box {
          text-align: center;
          width: 180px;
        }
        .signature-line {
          border-bottom: 1px solid #94a3b8;
          height: 40px;
          margin-top: 10px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: left;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
          طباعة / حفظ بتنسيق PDF
        </button>
      </div>

      <div class="header">
        <h1 class="school-title">${data.schoolName}</h1>
        <p class="report-subtitle">بطاقة المستوى الأكاديمي والتقرير الدوري الشامل للعام الدراسي ${data.academicYear}</p>
      </div>

      <div class="info-grid">
        <div class="info-item"><strong>اسم الطالب:</strong> ${data.studentName}</div>
        <div class="info-item"><strong>الصف والشعبة:</strong> ${data.className}</div>
        <div class="info-item"><strong>تاريخ إصدار التقرير:</strong> ${data.date}</div>
        <div class="info-item"><strong>نسبة الحضور العام:</strong> ${data.attendanceRate}% (${data.totalAbsences} غيابات)</div>
        <div class="info-item"><strong>حالة الأقساط:</strong> ${data.installmentsStatus}</div>
      </div>

      <h3>كشف الدرجات والتقييمات</h3>
      <table>
        <thead>
          <tr>
            <th>المادة الدراسية</th>
            <th>التقييم اليومي (20)</th>
            <th>الامتحان الشهري (30)</th>
            <th>الامتحان النهائي (50)</th>
            <th>المجموع النهائي (100)</th>
            <th>التقدير</th>
          </tr>
        </thead>
        <tbody>
          ${data.grades
            .map((g) => {
              const total = g.daily + g.monthly + g.final;
              let gradeText = "ممتاز";
              if (total < 50) gradeText = "راسب";
              else if (total < 60) gradeText = "مقبول";
              else if (total < 75) gradeText = "متوسط";
              else if (total < 90) gradeText = "جيد جداً";

              return `
              <tr>
                <td><strong>${g.subject}</strong></td>
                <td>${g.daily}</td>
                <td>${g.monthly}</td>
                <td>${g.final}</td>
                <td><strong>${total}</strong></td>
                <td>${gradeText}</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>

      <h3>الملاحظات السلوكية والتوجيهات</h3>
      ${
        data.behaviorNotes.length > 0
          ? `
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>نوع الملاحظة</th>
              <th>نص الملاحظة</th>
            </tr>
          </thead>
          <tbody>
            ${data.behaviorNotes
              .map(
                (n) => `
              <tr>
                <td>${n.date}</td>
                <td><span class="badge badge-${n.type}">${
                  n.type === "positive"
                    ? "إيجابي"
                    : n.type === "negative"
                    ? "تنبيه"
                    : "إرشادي"
                }</span></td>
                <td>${n.note}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `
          : `<p style="font-size: 12px; color: #64748b;">لا توجد أي ملاحظات سلبية مسجلة. سلوك الطالب ممتاز.</p>`
      }

      <div class="footer">
        <div class="signature-box">
          <div>توقيع المرشد التربوي</div>
          <div class="signature-line"></div>
        </div>
        <div class="signature-box">
          <div>توقيع مدير المدرسة والختم</div>
          <div class="signature-line"></div>
        </div>
      </div>

      <script>
        window.onload = function() {
          // فتح نافذة الطباعة تلقائياً
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
