/**
 * Reconhecimento de comandos de voz em pt-PT para o fluxo do DermaVoz.
 *
 * Cada frase captada pelo navegador é normalizada (sem acentos, sem
 * pontuação) e comparada com os padrões abaixo. Só as frases iniciadas pela
 * palavra de activação ("App") são tratadas como comando — tudo o resto
 * é ditado normal e é ignorado por este módulo.
 */

export type ResumoComando = {
  fragmentos?: number;
  blocos?: number;
  seccionado?: boolean;
  inclusao?: "total" | "reserva";
  codigoFaturacao?: "31057" | "31077";
};

export type Comando =
  | { tipo: "analise"; valor: string }
  | { tipo: "iniciar-gravacao" }
  | { tipo: "parar-gravacao" }
  | { tipo: "nova-amostra" }
  | { tipo: "ir-amostra"; indice: number }
  | { tipo: "apagar-amostra" }
  | { tipo: "resumo"; resumo: ResumoComando }
  | { tipo: "separar" }
  | { tipo: "otimizar" }
  | { tipo: "guardar" }
  | { tipo: "exportar" }
  | { tipo: "copiar" }
  | { tipo: "novo-relatorio" }
  | { tipo: "sair" }
  | { tipo: "ajuda" }
  | { tipo: "confirmar" }
  | { tipo: "cancelar" };

/** Acções que só executam depois de um "confirmar". */
export const COMANDOS_DESTRUTIVOS: ReadonlySet<Comando["tipo"]> = new Set([
  "apagar-amostra",
  "novo-relatorio",
  "sair",
]);

export const PALAVRA_ACTIVACAO = "App";

const NUMEROS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  meia: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
  dezasseis: 16,
  dezesseis: 16,
  dezassete: 17,
  dezessete: 17,
  dezoito: 18,
  dezanove: 19,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  trezentos: 300,
  quatrocentos: 400,
  quinhentos: 500,
  seiscentos: 600,
  setecentos: 700,
  oitocentos: 800,
  novecentos: 900,
  mil: 1000,
};


const LETRAS_DITADAS: Record<string, string> = {
  alfa: "A",
  bravo: "B",
  charlie: "C",
  delta: "D",
  eco: "E",
  echo: "E",
  foxtrot: "F",
  golf: "G",
  hotel: "H",
  india: "I",
  juliet: "J",
  kilo: "K",
  lima: "L",
  mike: "M",
  november: "N",
  oscar: "O",
  papa: "P",
  quebec: "Q",
  romeu: "R",
  romeo: "R",
  sierra: "S",
  tango: "T",
  uniform: "U",
  victor: "V",
  whiskey: "W",
  xray: "X",
  yankee: "Y",
  zulu: "Z",
};

export const normalizar = (frase: string) =>
  frase
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const VARIANTES_ACTIVACAO = [
  "app",
  "ap",
  "apo",
  "apps",
  "dermavoz",
  "derma voz",
  "derma vos",
  "dermavos",
  "dermabos",
  "derma boz",
];

/** Devolve o texto do comando quando a frase começa pela palavra de activação. */
export function extrairComando(frase: string): string | null {
  const n = normalizar(frase);
  for (const v of VARIANTES_ACTIVACAO) {
    if (n === v) return "";
    if (n.startsWith(`${v} `)) return n.slice(v.length + 1).trim();
  }
  return null;
}

const numeroDe = (palavra: string | undefined): number | undefined => {
  if (!palavra) return undefined;
  if (/^\d+$/.test(palavra)) return Number(palavra);
  return NUMEROS[palavra];
};

/** "c dois seis h zero zero" → "C26H00" (leitura soletrada do código de barras). */
function juntarCodigo(texto: string): string {
  const partes = texto.split(" ").filter(Boolean);
  let saida = "";

  for (const p of partes) {
    if (/^\d+$/.test(p)) {
      saida += p;
      continue;
    }
    if (p in NUMEROS) {
      saida += String(NUMEROS[p]);
      continue;
    }
    if (p in LETRAS_DITADAS) {
      saida += LETRAS_DITADAS[p];
      continue;
    }
    saida += p.toUpperCase();
  }
  return saida;
}

function lerResumo(texto: string): ResumoComando | null {
  const resumo: ResumoComando = {};

  const frag = texto.match(/(\d+|[a-z]+)\s+fragmentos?/);
  const fragN = numeroDe(frag?.[1]);
  if (fragN !== undefined) resumo.fragmentos = fragN;

  const blo = texto.match(/(\d+|[a-z]+)\s+blocos?/);
  const bloN = numeroDe(blo?.[1]);
  if (bloN !== undefined) resumo.blocos = bloN;

  if (/nao seccionado/.test(texto)) resumo.seccionado = false;
  else if (/seccionado/.test(texto)) resumo.seccionado = true;

  if (/inclusao total|total/.test(texto)) resumo.inclusao = "total";
  if (/reserva/.test(texto)) resumo.inclusao = "reserva";

  if (/31057|31 057/.test(texto)) resumo.codigoFaturacao = "31057";
  if (/31077|31 077/.test(texto)) resumo.codigoFaturacao = "31077";

  return Object.keys(resumo).length > 0 ? resumo : null;
}

/**
 * Interpreta o texto que vem depois da palavra de activação.
 * Devolve `null` quando nenhum comando é reconhecido.
 */
export function interpretarComando(texto: string): Comando | null {
  const t = normalizar(texto);
  if (!t) return null;

  if (/^(confirmar|confirmo|sim|confirma)$/.test(t)) return { tipo: "confirmar" };
  if (/^(cancelar|cancela|nao|anular)$/.test(t)) return { tipo: "cancelar" };

  if (/^(ajuda|que comandos|comandos|lista de comandos)$/.test(t))
    return { tipo: "ajuda" };

  const analise = t.match(
    /^(?:numero (?:da )?analise|n(?:umero)? analise|analise)\s+(.+)$/,
  );
  if (analise?.[1]) {
    const valor = juntarCodigo(analise[1]);
    if (valor) return { tipo: "analise", valor };
  }

  if (/^(iniciar|comecar|come[cç]a|inicia|gravar|grava)( gravacao| a gravar)?$/.test(t))
    return { tipo: "iniciar-gravacao" };

  if (/^(parar|para|terminar|termina|stop)( gravacao| de gravar| a gravacao)?$/.test(t))
    return { tipo: "parar-gravacao" };

  if (/^(nova amostra|adicionar amostra|proxima amostra)$/.test(t))
    return { tipo: "nova-amostra" };

  const irAmostra = t.match(/^(?:ir para |abrir |seleccionar |selecionar )?amostra (\d+|[a-z]+)$/);
  const indice = numeroDe(irAmostra?.[1]);
  if (indice !== undefined && indice >= 1)
    return { tipo: "ir-amostra", indice };

  if (/^(apagar|remover|eliminar) (a )?amostra$/.test(t))
    return { tipo: "apagar-amostra" };

  if (/^(separar amostras|separar|dividir amostras)$/.test(t))
    return { tipo: "separar" };

  if (/^(otimizar|optimizar|otimiza|otimizar relatorio|otimizar com ia|optimizar com ia)$/.test(t))
    return { tipo: "otimizar" };

  if (/^(guardar|guarda|gravar relatorio|guardar relatorio)$/.test(t))
    return { tipo: "guardar" };

  if (/^(exportar|exporta|exportar word|exportar documento|exportar para word)$/.test(t))
    return { tipo: "exportar" };

  if (/^(copiar|copia|copiar texto)$/.test(t)) return { tipo: "copiar" };

  if (/^(novo relatorio|limpar|limpa|apagar tudo)$/.test(t))
    return { tipo: "novo-relatorio" };

  if (/^(terminar sessao|sair|fechar sessao|logout)$/.test(t))
    return { tipo: "sair" };

  if (/^resumo tecnico\b/.test(t) || /\b(fragmentos?|blocos?)\b/.test(t)) {
    const resumo = lerResumo(t);
    if (resumo) return { tipo: "resumo", resumo };
  }

  return null;
}

/** Lista mostrada no diálogo de ajuda. */
export const LISTA_COMANDOS: { dizer: string; faz: string }[] = [
  { dizer: "App, análise C26H0000", faz: "Preenche o n.º da análise" },
  { dizer: "App, iniciar gravação", faz: "Começa a gravar" },
  { dizer: "App, parar", faz: "Pára e transcreve" },
  { dizer: "App, nova amostra", faz: "Cria uma amostra" },
  { dizer: "App, amostra dois", faz: "Muda para essa amostra" },
  { dizer: "App, apagar amostra", faz: "Remove a amostra activa (confirmar)" },
  { dizer: "App, separar amostras", faz: "Separa o ditado em amostras" },
  {
    dizer: "App, resumo técnico 3 fragmentos 2 blocos seccionado total",
    faz: "Preenche o resumo técnico",
  },
  { dizer: "App, otimizar", faz: "Otimiza o relatório com IA" },
  { dizer: "App, guardar", faz: "Guarda o relatório" },
  { dizer: "App, exportar", faz: "Gera o ficheiro Word" },
  { dizer: "App, copiar", faz: "Copia o texto" },
  { dizer: "App, novo relatório", faz: "Limpa tudo (confirmar)" },
  { dizer: "App, terminar sessão", faz: "Sai da conta (confirmar)" },
  { dizer: "App, ajuda", faz: "Mostra esta lista" },
];
