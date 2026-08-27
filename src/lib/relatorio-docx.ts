import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

export type ResumoDocx = {
  fragmentos: number;
  blocos: number;
  seccionado: boolean;
  inclusao: "total" | "reserva";
  codigoFaturacao: string;
};

export type RelatorioDocx = {
  numeroAnalise: string;
  texto: string;
  resumo: ResumoDocx;
};

const linha = (rotulo: string, valor: string) =>
  new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${rotulo}: `, bold: true }),
      new TextRun(valor),
    ],
  });

export async function gerarRelatorioDocx({
  numeroAnalise,
  texto,
  resumo,
}: RelatorioDocx): Promise<Blob> {
  const paragrafos = texto
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(
      (l) =>
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun(l)],
        }),
    );

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: numeroAnalise || "Relatório",
                bold: true,
                size: 30,
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `Relatório clínico · ${new Date().toLocaleDateString("pt-PT")}`,
                color: "666666",
                size: 20,
              }),
            ],
          }),

          ...paragrafos,

          new Paragraph({
            spacing: { before: 360, after: 120 },
            children: [
              new TextRun({ text: "Resumo técnico", bold: true, size: 26 }),
            ],
          }),

          linha("N.º de fragmentos", String(resumo.fragmentos)),
          linha("N.º de blocos", String(resumo.blocos)),
          linha("Seccionado", resumo.seccionado ? "Sim" : "Não"),
          linha(
            "Inclusão",
            resumo.inclusao === "total" ? "Total" : "Com reserva",
          ),
          linha("Código de faturação", resumo.codigoFaturacao),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
