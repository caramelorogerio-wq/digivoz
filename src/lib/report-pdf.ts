import { jsPDF } from "jspdf";

export type ReportMeta = {
  tipo: "autopsia" | "histologico";
  numeroProcesso: string;
  doente: string;
  patologista: string;
  data: string;
  texto: string;
};

const TITULOS: Record<ReportMeta["tipo"], string> = {
  autopsia: "RELATÓRIO DE AUTÓPSIA",
  histologico: "RELATÓRIO DE EXAME HISTOLÓGICO",
};

const isHeading = (line: string) =>
  /^[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ0-9 .,'()/-]{4,}:?$/.test(line.trim()) && line.trim().length < 60;

export function exportReportPdf(meta: ReportMeta) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const maxWidth = width - margin * 2;
  let y = margin;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > height - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFillColor(20, 74, 130);
  doc.rect(0, 0, width, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(TITULOS[meta.tipo], margin, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Serviço de Anatomia Patológica", margin, 64);
  y = 122;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  const linhas: Array<[string, string]> = [
    ["N.º de processo", meta.numeroProcesso || "—"],
    ["Doente / Cadáver", meta.doente || "—"],
    ["Médico patologista", meta.patologista || "—"],
    ["Data", meta.data || "—"],
  ];
  linhas.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 130, y);
    y += 16;
  });

  y += 8;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, width - margin, y);
  y += 24;

  doc.setFontSize(11);
  meta.texto.split(/\r?\n/).forEach((raw) => {
    const line = raw.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();
    if (!line) {
      y += 10;
      return;
    }
    const heading = isHeading(line);
    doc.setFont("helvetica", heading ? "bold" : "normal");
    if (heading) y += 8;
    const wrapped = doc.splitTextToSize(line, maxWidth) as string[];
    wrapped.forEach((w) => {
      newPageIfNeeded(18);
      doc.text(w, margin, y);
      y += 16;
    });
  });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 145);
    doc.text(
      `Documento clínico confidencial · Página ${i} de ${total}`,
      margin,
      height - 28,
    );
  }

  const nome = `${meta.tipo === "autopsia" ? "autopsia" : "histologico"}-${
    meta.numeroProcesso || "relatorio"
  }.pdf`;
  doc.save(nome.replace(/\s+/g, "-").toLowerCase());
}
