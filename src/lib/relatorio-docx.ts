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

export type AmostraDocx = {
  titulo: string;
  texto: string;
  resumo: ResumoDocx;
};

export type RelatorioDocx = {
  numeroAnalise: string;
  /** Amostras da análise. Cada uma gera uma secção própria. */
  amostras?: AmostraDocx[];
  /** Compatibilidade: relatório de amostra única. */
  texto?: string;
  resumo?: ResumoDocx;
  template?: TemplateDocx;
  instituicao?: string;
  servico?: string;
  medico?: string;
};


const linha = (rotulo: string, valor: string) =>
  new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${rotulo}: `, bold: true, font: "Century Gothic", size: 20 }),
      new TextRun({ text: valor, font: "Century Gothic", size: 20 }),
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
    children: [new TextRun({ text: "", font: "Century Gothic", size: 20 })],
  });

const rodapePaginas = (nota: string) =>
  new Footer({
    children: [
      new Paragraph({
        tabStops: [
          { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
        ],
        children: [
          new TextRun({ text: nota, size: 18, color: "666666", font: "Century Gothic" }),
          new TextRun({ text: "\tPágina ", size: 18, color: "666666", font: "Century Gothic" }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 18,
            color: "666666",
            font: "Century Gothic",
          }),
          new TextRun({ text: " de ", size: 18, color: "666666", font: "Century Gothic" }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 18,
            color: "666666",
            font: "Century Gothic",
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

  const lista: AmostraDocx[] =
    amostras && amostras.length > 0
      ? amostras
      : [
          {
            titulo: "",
            texto: texto ?? "",
            resumo: resumo ?? {
              fragmentos: 0,
              blocos: 0,
              seccionado: false,
              inclusao: "total",
              codigoFaturacao: "31057",
            },
          },
        ];

  const varias = lista.length > 1;

  const corpoAmostra = (
    amostra: AmostraDocx,
    indice: number,
  ): Paragraph[] => {
    const paragrafos: Paragraph[] = [];

    if (varias || amostra.titulo.trim()) {
      paragrafos.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: indice === 0 ? 120 : 360, after: 120 },
          children: [
            new TextRun({
              text:
                amostra.titulo.trim() || `Amostra ${indice + 1}`,
              bold: true,
              size: 24,
              color: "1F4E79",
              font: "Century Gothic",
            }),
          ],
        }),
      );
    }

    paragrafos.push(
      ...amostra.texto
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map(
          (l) =>
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
              children: [
                new TextRun({ text: l, font: "Century Gothic", size: 20 }),
              ],
            }),
        ),
    );

    paragrafos.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: varias ? "Resumo técnico da amostra" : "Resumo técnico",
            bold: true,
            size: varias ? 22 : 26,
            font: "Century Gothic",
          }),
        ],
      }),
      ...(varias ? [] : [linha("N.º da análise", titulo)]),
      linha("N.º de fragmentos", String(amostra.resumo.fragmentos)),
      linha("N.º de blocos", String(amostra.resumo.blocos)),
      linha("Seccionado", amostra.resumo.seccionado ? "Sim" : "Não"),
      linha(
        "Inclusão",
        amostra.resumo.inclusao === "total" ? "Total" : "Com reserva",
      ),
      linha("Código de faturação", amostra.resumo.codigoFaturacao),
    );

    return paragrafos;
  };


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
            font: "Century Gothic",
          }),
          new TextRun({
            text: `\t${servico}`,
            size: 18,
            color: "666666",
            font: "Century Gothic",
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
            font: "Century Gothic",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: servico, size: 18, color: "666666", font: "Century Gothic" }),
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
        document: { run: { font: "Century Gothic", size: 20 } },
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
              new TextRun({ text: titulo, bold: true, size: 30, font: "Century Gothic" }),
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
                font: "Century Gothic",
              }),
            ],
          }),

          ...paragrafos,

          new Paragraph({
            spacing: { before: 360, after: 120 },
            children: [
              new TextRun({ text: "Resumo técnico", bold: true, size: 26, font: "Century Gothic" }),
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
