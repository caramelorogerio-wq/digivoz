import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";

export type ResumoDocx = {
  fragmentos: number;
  blocos: number;
  seccionado: boolean;
  inclusao: "total" | "reserva";
  codigoFaturacao: string;
};

export type TemplateDocx = "clinico" | "simples" | "carta";

export const TEMPLATES: {
  valor: TemplateDocx;
  nome: string;
  descricao: string;
}[] = [
  {
    valor: "clinico",
    nome: "Clínico",
    descricao:
      "Cabeçalho com serviço, linha separadora e rodapé com paginação.",
  },
  {
    valor: "simples",
    nome: "Simples",
    descricao: "Sem cabeçalho nem rodapé, apenas título e texto.",
  },
  {
    valor: "carta",
    nome: "Carta",
    descricao:
      "Cabeçalho centrado com instituição e rodapé com confidencialidade.",
  },
];

export type RelatorioDocx = {
  numeroAnalise: string;
  texto: string;
  resumo: ResumoDocx;
  template?: TemplateDocx;
  instituicao?: string;
  servico?: string;
  medico?: string;
};

const linha = (rotulo: string, valor: string) =>
  new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${rotulo}: `, bold: true }),
      new TextRun(valor),
    ],
  });

const separador = () =>
  new Paragraph({
    spacing: { after: 120 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
        color: "1F4E79",
        space: 1,
      },
    },
    children: [new TextRun("")],
  });

const rodapePaginas = (nota: string) =>
  new Footer({
    children: [
      new Paragraph({
        tabStops: [
          { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
        ],
        children: [
          new TextRun({ text: nota, size: 18, color: "666666" }),
          new TextRun({ text: "\tPágina ", size: 18, color: "666666" }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 18,
            color: "666666",
          }),
          new TextRun({ text: " de ", size: 18, color: "666666" }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 18,
            color: "666666",
          }),
        ],
      }),
    ],
  });

export async function gerarRelatorioDocx({
  numeroAnalise,
  texto,
  resumo,
  template = "clinico",
  instituicao = "DermaVoz",
  servico = "Serviço de Dermatopatologia",
  medico,
}: RelatorioDocx): Promise<Blob> {
  const titulo = numeroAnalise || "Relatório";
  const data = new Date().toLocaleDateString("pt-PT");

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

  const cabecalhoClinico = new Header({
    children: [
      new Paragraph({
        tabStops: [
          { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
        ],
        children: [
          new TextRun({
            text: instituicao,
            bold: true,
            size: 20,
            color: "1F4E79",
          }),
          new TextRun({
            text: `\t${servico}`,
            size: 18,
            color: "666666",
          }),
        ],
      }),
      separador(),
    ],
  });

  const cabecalhoCarta = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: instituicao.toUpperCase(),
            bold: true,
            size: 22,
            color: "1F4E79",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: servico, size: 18, color: "666666" }),
        ],
      }),
      separador(),
    ],
  });

  const headers =
    template === "clinico"
      ? { default: cabecalhoClinico }
      : template === "carta"
        ? { default: cabecalhoCarta }
        : undefined;

  const footers =
    template === "clinico"
      ? {
          default: rodapePaginas(
            `${titulo} · ${data}${medico ? ` · ${medico}` : ""}`,
          ),
        }
      : template === "carta"
        ? {
            default: rodapePaginas(
              "Documento clínico confidencial",
            ),
          }
        : undefined;

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
              top: template === "simples" ? 1134 : 1418,
              right: 1134,
              bottom: template === "simples" ? 1134 : 1418,
              left: 1134,
            },
          },
        },
        ...(headers ? { headers } : {}),
        ...(footers ? { footers } : {}),
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment:
              template === "carta"
                ? AlignmentType.CENTER
                : AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({ text: titulo, bold: true, size: 30 }),
            ],
          }),

          new Paragraph({
            alignment:
              template === "carta"
                ? AlignmentType.CENTER
                : AlignmentType.LEFT,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `Relatório clínico · ${data}`,
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

          linha("N.º da análise", titulo),
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
