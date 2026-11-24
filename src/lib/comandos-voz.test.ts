import { describe, expect, it } from "vitest";

import {
  interpretarComandoEmContexto,
  interpretarRespostaResumo,
  sugerirComandos,
} from "./comandos-voz";

describe("ordens directas fora da gravação", () => {
  it.each([
    ["Gravar", { tipo: "iniciar-gravacao" }],
    ["Iniciar gravação", { tipo: "iniciar-gravacao" }],
    ["Análise DMP 3457", { tipo: "analise", valor: "DMP3457" }],
    ["Análise C26H1234", { tipo: "analise", valor: "C26H1234" }],
    ["Análise cê vinte e seis agá doze trinta e quatro", { tipo: "analise", valor: "C26H1234" }],
    ["Nova amostra", { tipo: "nova-amostra" }],
    ["Próxima amostra", { tipo: "nova-amostra" }],
    ["Resumo técnico", { tipo: "resumo-guiado" }],
    ["3 fragmentos", { tipo: "resumo", resumo: { fragmentos: 3 } }],
    ["inclusão total", { tipo: "resumo", resumo: { inclusao: "total" } }],
    ["Otimizar", { tipo: "otimizar" }],
    ["Exportar", { tipo: "exportar" }],
    ["Descarregar", { tipo: "exportar" }],
    ["Copiar", { tipo: "copiar" }],
    ["Nova análise", { tipo: "nova-analise", valor: "" }],
    ["Nova análise C26H4321", { tipo: "nova-analise", valor: "C26H4321" }],
    ["confirmar", { tipo: "confirmar" }],
    ["cancelar", { tipo: "cancelar" }],
    ["ajuda", { tipo: "ajuda" }],
  ])("reconhece %s sem palavra prévia", (frase, comando) => {
    expect(interpretarComandoEmContexto(frase as string, false)).toEqual(comando);
  });

  it.each(["App, exportar", "Comando, nova amostra", "Ditar, otimizar", "Ditado, copiar", "DermaVoz, gravar"])(
    "não interpreta o comando indirecto %s", (frase) => {
      expect(interpretarComandoEmContexto(frase, false)).toBeNull();
    },
  );
});

describe("protecção do texto durante a gravação", () => {
  it.each(["Parar", "Terminar", "Fim de ditado", "Fim de ditado."])(
    "permite apenas a paragem %s", (frase) => {
      expect(interpretarComandoEmContexto(frase, true)).toEqual({ tipo: "parar-gravacao" });
    },
  );

  it.each([
    "gravar", "análise DMP 3457", "nova amostra", "próxima amostra",
    "resumo técnico", "3 fragmentos", "inclusão total", "otimizar",
    "exportar", "descarregar", "copiar", "nova análise", "confirmar",
    "cancelar", "ajuda", "sair", "App, parar", "Comando, terminar",
    "Fragmento fusiforme de pele com três fragmentos e inclusão total",
    "É necessário parar a dissecção junto à margem",
    "A peça apresenta um ponto no fim de ditado do relatório",
  ])("ignora %s", (frase) => {
    expect(interpretarComandoEmContexto(frase, true)).toBeNull();
  });
});

describe("resumo guiado e recuperação silenciosa", () => {
  it("mantém as respostas directas campo a campo", () => {
    expect(interpretarRespostaResumo("fragmentos", "três")).toEqual({ tipo: "valor", resumo: { fragmentos: 3 } });
    expect(interpretarRespostaResumo("inclusao", "inclusão total")).toEqual({ tipo: "valor", resumo: { inclusao: "total" } });
  });

  it("não sugere comandos para uma descrição clínica sem semelhança", () => {
    expect(sugerirComandos("Fragmento fusiforme de pele com 27 por 10 por 8 milímetros")).toEqual([]);
  });

  it("propõe uma aproximação em vez de a interpretar como ordem", () => {
    expect(interpretarComandoEmContexto("exportr", false)).toBeNull();
    expect(sugerirComandos("exportr")[0]?.comando).toEqual({ tipo: "exportar" });
  });
});