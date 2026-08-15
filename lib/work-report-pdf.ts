type ReportComplaint = {
  complaintNumber: string;
  createdAt: Date | string;
  category: string;
  department: string;
  priority: string;
  status: string;
  resolutionRemarks?: string;
  feedback?: { rating?: number; comment?: string; submittedAt?: Date | string };
};

type WorkReport = {
  title: string;
  periodLabel: string;
  preparedFor: string;
  complaints: ReportComplaint[];
};

const pageWidth = 595;
const pageHeight = 842;
const margin = 42;

function printable(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E]/g, "?")
    .trim();
}

function escapePdf(value: unknown) {
  return printable(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function dateLabel(value?: Date | string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function trimTo(value: unknown, length: number) {
  const text = printable(value) || "-";
  return text.length > length ? `${text.slice(0, Math.max(1, length - 3))}...` : text;
}

function wrap(value: unknown, maxCharacters: number) {
  const words = (printable(value) || "-").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= maxCharacters) line = `${line} ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

class PdfDocument {
  private pages: string[][] = [[]];
  private pageIndex = 0;
  private y = pageHeight - margin;

  private page() {
    return this.pages[this.pageIndex];
  }

  private add(command: string) {
    this.page().push(command);
  }

  private newPage() {
    this.pages.push([]);
    this.pageIndex += 1;
    this.y = pageHeight - margin;
  }

  private ensure(height: number) {
    if (this.y - height < margin) this.newPage();
  }

  text(value: unknown, x: number, y: number, size = 9, bold = false, color = "0 0 0") {
    this.add(`${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${escapePdf(value)}) Tj ET`);
  }

  line(x1: number, y1: number, x2: number, y2: number, color = "0.82 0.86 0.88", width = 0.6) {
    this.add(`${color} RG ${width} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
  }

  fill(x: number, y: number, width: number, height: number, color: string) {
    this.add(`${color} rg ${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)} re f`);
  }

  heading(value: string, size = 16) {
    this.ensure(size + 18);
    this.text(value, margin, this.y, size, true, "0.03 0.24 0.22");
    this.y -= size + 10;
  }

  paragraph(value: unknown, size = 9, maxCharacters = 95, color = "0.25 0.3 0.35") {
    const lines = wrap(value, maxCharacters);
    this.ensure(lines.length * (size + 4) + 5);
    for (const line of lines) {
      this.text(line, margin, this.y, size, false, color);
      this.y -= size + 4;
    }
    this.y -= 4;
  }

  metric(label: string, value: string | number, x: number, width: number) {
    const height = 48;
    this.fill(x, this.y - height + 8, width, height, "0.94 0.98 0.97");
    this.text(label.toUpperCase(), x + 8, this.y - 8, 6.5, true, "0.3 0.4 0.42");
    this.text(String(value), x + 8, this.y - 29, 16, true, "0.03 0.35 0.32");
  }

  metrics(values: { label: string; value: string | number }[]) {
    this.ensure(68);
    const gap = 8;
    const width = (pageWidth - margin * 2 - gap * (values.length - 1)) / values.length;
    values.forEach((value, index) => this.metric(value.label, value.value, margin + index * (width + gap), width));
    this.y -= 60;
  }

  tableHeader(columns: { label: string; width: number }[]) {
    this.ensure(24);
    const y = this.y - 16;
    this.fill(margin, y, pageWidth - margin * 2, 18, "0.03 0.38 0.35");
    let x = margin + 5;
    for (const column of columns) {
      this.text(column.label, x, y + 6, 6.3, true, "1 1 1");
      x += column.width;
    }
    this.y = y - 4;
  }

  tableRow(columns: { value: unknown; width: number; length: number }[], repeatedHeader?: { label: string; width: number }[]) {
    if (this.y - 16 < margin) {
      this.newPage();
      if (repeatedHeader) this.tableHeader(repeatedHeader);
    }
    let x = margin + 5;
    for (const column of columns) {
      this.text(trimTo(column.value, column.length), x, this.y, 6.5, false, "0.16 0.2 0.24");
      x += column.width;
    }
    this.line(margin, this.y - 5, pageWidth - margin, this.y - 5);
    this.y -= 14;
  }

  build() {
    const objects: string[] = [];
    const pageObjectIds = this.pages.map((_, index) => 5 + index * 2);
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${this.pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    this.pages.forEach((page, index) => {
      const pageId = pageObjectIds[index];
      const contentId = pageId + 1;
      const stream = page.join("\n");
      objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
      objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`;
    });

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    for (let index = 1; index < objects.length; index += 1) {
      offsets[index] = Buffer.byteLength(pdf, "ascii");
      pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
    }
    const startXref = Buffer.byteLength(pdf, "ascii");
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let index = 1; index < objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
    return Buffer.from(pdf, "ascii");
  }
}

export function createWorkReportPdf({ title, periodLabel, preparedFor, complaints }: WorkReport) {
  const document = new PdfDocument();
  const resolved = complaints.filter((complaint) => ["RESOLVED", "CLOSED"].includes(complaint.status)).length;
  const active = complaints.filter((complaint) => !["RESOLVED", "CLOSED", "REJECTED"].includes(complaint.status)).length;
  const feedback = complaints.filter((complaint) => complaint.feedback?.rating);
  const averageRating = feedback.length ? (feedback.reduce((sum, complaint) => sum + (complaint.feedback?.rating || 0), 0) / feedback.length).toFixed(1) : "-";

  document.heading("AI-based Municipal Grievance Portal", 20);
  document.heading(title, 14);
  document.paragraph(`Prepared for: ${preparedFor}  |  Complaint records created: ${periodLabel}`, 9, 100);
  document.paragraph(`Generated: ${dateLabel(new Date())}`, 8, 100, "0.4 0.45 0.5");
  document.metrics([
    { label: "Reports", value: complaints.length },
    { label: "Active", value: active },
    { label: "Resolved", value: resolved },
    { label: "Feedback", value: feedback.length ? `${averageRating}/5` : "-" },
  ]);

  document.heading("Complaint work register", 11);
  const columns = [
    { label: "REPORT", width: 82 },
    { label: "CREATED", width: 61 },
    { label: "CATEGORY", width: 92 },
    { label: "STATUS", width: 72 },
    { label: "PRIORITY", width: 55 },
    { label: "RATING", width: 48 },
    { label: "RESOLUTION NOTE", width: 101 },
  ];
  document.tableHeader(columns);
  complaints.forEach((complaint) => {
    document.tableRow([
      { value: complaint.complaintNumber, width: columns[0].width, length: 15 },
      { value: dateLabel(complaint.createdAt), width: columns[1].width, length: 13 },
      { value: complaint.category, width: columns[2].width, length: 21 },
      { value: complaint.status.replaceAll("_", " "), width: columns[3].width, length: 16 },
      { value: complaint.priority, width: columns[4].width, length: 10 },
      { value: complaint.feedback?.rating ? `${complaint.feedback.rating}/5` : "-", width: columns[5].width, length: 7 },
      { value: complaint.resolutionRemarks || "-", width: columns[6].width, length: 25 },
    ], columns);
  });
  if (!complaints.length) document.paragraph("No complaint records were created in the selected period.", 9);

  if (feedback.length) {
    document.heading("Citizen feedback", 11);
    feedback.forEach((complaint) => {
      document.paragraph(`${complaint.complaintNumber} - ${complaint.feedback?.rating}/5 - ${complaint.feedback?.comment || "No written feedback."}`, 8, 105);
    });
  }
  return document.build();
}
