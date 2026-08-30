import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  FileDown,
  Eraser,
  Copy,
  Save,
  LogOut,
  Trash2,
  Sparkles,
  Loader2,
  Brain,
  Power,
  SplitSquareVertical,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RecorderPanel, type RecorderHandle } from "@/components/recorder-panel";
import { BarraComandosVoz } from "@/components/barra-comandos-voz";
import { useReconhecimentoVoz } from "@/hooks/use-reconhecimento-voz";
import {
  COMANDOS_DESTRUTIVOS,
  extrairComando,
  interpretarComando,
  type Comando,
} from "@/lib/comandos-voz";

import { ListaAmostras } from "@/components/lista-amostras";
import { CampoAnalise } from "@/components/campo-analise";
import { ModeloDocumento } from "@/components/modelo-documento";
import type { TemplateDocx } from "@/lib/relatorio-docx";
import {
  type Amostra,
  type ResumoAmostra,
  novaAmostra,
  resumoVazio,
  separarAmostrasHeuristica,
  textoCompleto,
  contarPalavras,
} from "@/lib/amostras";
import {
  transcribeAudio,
  optimizeReport,
  splitSamples,
} from "@/lib/transcribe.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  getVocabularioPessoal,
  registarCorreccoes,
  type ContextoAprendizagem,
} from "@/lib/learning.functions";


export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Consultório — DermaVoz" },
      {
        name: "description",
        content:
          "Grave a voz, transcreva em português europeu e guarde os relatórios associados aos seus doentes, em privado.",
      },
      { property: "og:title", content: "Consultório — DermaVoz" },
      {
        property: "og:description",
        content:
          "Ditado clínico, transcrição automática e arquivo privado de relatórios por médico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppPage,
});


type Relatorio = {
  id: string;
  titulo: string;
  texto: string;
  created_at: string;
  paciente_id: string | null;
  amostras: unknown;
  fragmentos: number;
  blocos: number;
  seccionado: boolean;
  inclusao: "total" | "reserva";
  codigo_faturacao: "31057" | "31077";
};


type Termo = {
  id: string;
  termo: string;
  correcao_de: string | null;
  ocorrencias: number;
  origem: string;
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () =>
      reject(new Error("Falha ao ler o ficheiro de áudio."));

    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };

    reader.readAsDataURL(blob);
  });

function AppPage() {
  const navigate = useNavigate();

  const transcrever = useServerFn(transcribeAudio);
  const otimizar = useServerFn(optimizeReport);
  const separarIA = useServerFn(splitSamples);
  const carregarVocabulario = useServerFn(getVocabularioPessoal);
  const guardarCorreccoes = useServerFn(registarCorreccoes);

  const [aTranscrever, setATranscrever] = useState(false);
  const [aOtimizar, setAOtimizar] = useState(false);
  const [aSeparar, setASeparar] = useState(false);

  const [amostras, setAmostras] = useState<Amostra[]>(() => [
    novaAmostra(),
  ]);

  const [activaId, setActivaId] = useState<string | null>(null);

  const [numeroAnalise, setNumeroAnalise] = useState("");

  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);

  const [contexto, setContexto] =
    useState<ContextoAprendizagem | null>(null);

  const [termos, setTermos] = useState<Termo[]>([]);

  const [aprendizagem, setAprendizagem] = useState(true);

  const [textoOtimizado, setTextoOtimizado] =
    useState<string | null>(null);

  const amostraActiva =
    amostras.find((a) => a.id === activaId) ?? amostras[0]!;

  /** Amostra fixada como destino no momento em que a gravação arranca. */
  const alvoGravacaoRef = useRef<string | null>(null);
  const amostrasRef = useRef(amostras);
  amostrasRef.current = amostras;

  const texto = textoCompleto(amostras);


  const actualizarAmostra = (
    id: string,
    patch: Partial<Amostra>,
  ) =>
    setAmostras((lista) =>
      lista.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );

  const adicionarAmostra = () => {
    const nova = novaAmostra();
    setAmostras((lista) => [...lista, nova]);
    setActivaId(nova.id);
  };

  const removerAmostra = (id: string) =>
    setAmostras((lista) =>
      lista.length === 1
        ? lista
        : lista.filter((a) => a.id !== id),
    );

  const moverAmostra = (id: string, direccao: -1 | 1) =>
    setAmostras((lista) => {
      const i = lista.findIndex((a) => a.id === id);
      const j = i + direccao;

      if (i < 0 || j < 0 || j >= lista.length) return lista;

      const copia = [...lista];
      const [item] = copia.splice(i, 1);
      copia.splice(j, 0, item!);
      return copia;
    });


  const [template, setTemplate] =
    useState<TemplateDocx>("clinico");

  const [instituicao, setInstituicao] = useState("DermaVoz");

  const [servico, setServico] = useState(
    "Serviço de Dermatopatologia",
  );

  useEffect(() => {
    const guardado = localStorage.getItem("dermavoz:modelo-docx");

    if (!guardado) return;

    try {
      const p = JSON.parse(guardado) as {
        template?: TemplateDocx;
        instituicao?: string;
        servico?: string;
      };

      if (p.template) setTemplate(p.template);
      if (p.instituicao) setInstituicao(p.instituicao);
      if (p.servico) setServico(p.servico);
    } catch {
      // preferência inválida: ignora
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "dermavoz:modelo-docx",
      JSON.stringify({ template, instituicao, servico }),
    );
  }, [template, instituicao, servico]);

  const carregar = useCallback(async () => {
    const [r, t, m] = await Promise.all([
      supabase
        .from("relatorios_transcritos")
        .select(
          "id, titulo, texto, created_at, paciente_id, fragmentos, blocos, seccionado, inclusao, codigo_faturacao",
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("termos_aprendidos")
        .select(
          "id, termo, correcao_de, ocorrencias, origem",
        )
        .eq("activo", true)
        .order("ocorrencias", { ascending: false }),

      supabase.auth.getUser(),
    ]);


    if (r.data) {
      setRelatorios(r.data as Relatorio[]);
    }

    if (t.data) {
      setTermos(t.data);
    }

    if (m.data.user) {
      const perfil = await supabase
        .from("medicos")
        .select("aprendizagem_activa")
        .eq("id", m.data.user.id)
        .maybeSingle();

      setAprendizagem(
        perfil.data?.aprendizagem_activa !== false,
      );
    }
  }, []);

  const actualizarContexto = useCallback(async () => {
    try {
      setContexto(
        await carregarVocabulario({
          data: undefined,
        }),
      );
    } catch {
      setContexto(null);
    }
  }, [carregarVocabulario]);

  useEffect(() => {
    void carregar();
    void actualizarContexto();
  }, [carregar, actualizarContexto]);

  const alternarAprendizagem = async () => {
    const novaEstado = !aprendizagem;

    const { data: sessao } =
      await supabase.auth.getUser();

    if (!sessao.user) {
      toast.error(
        "Sessão expirada. Volte a iniciar sessão.",
      );
      return;
    }

    const { error } = await supabase
      .from("medicos")
      .update({
        aprendizagem_activa: novaEstado,
      })
      .eq("id", sessao.user.id);

    if (error) {
      toast.error(
        "Não foi possível alterar a aprendizagem.",
      );
      return;
    }

    setAprendizagem(novaEstado);

    if (!novaEstado) {
      setContexto({
        activa: false,
        pistas: "",
        correccoes: [],
        exemplos: [],
      });
    } else {
      await actualizarContexto();
    }

    toast.success(
      novaEstado
        ? "Vocabulário aprendido ativado."
        : "Vocabulário aprendido desligado.",
    );
  };

  const removerTermo = async (termo: Termo) => {
    const { error } = await supabase
      .from("termos_aprendidos")
      .update({ activo: false })
      .eq("id", termo.id);

    if (error) {
      toast.error(
        "Não foi possível remover o termo.",
      );
      return;
    }

    setTermos((lista) =>
      lista.filter(
        (item) => item.id !== termo.id,
      ),
    );

    await actualizarContexto();

    toast.success(
      "Termo removido do vocabulário.",
    );
  };

  const handleAudio = async (
    blob: Blob,
    format: string,
  ) => {
    setATranscrever(true);

    try {
      const audioBase64 =
        await blobToBase64(blob);

      const { data: sessionData } =
        await supabase.auth.getSession();

      const accessToken =
        sessionData.session?.access_token;

      if (!accessToken) {
        toast.error(
          "Sessão expirada. Volte a iniciar sessão.",
        );
        return;
      }

      const resultado = await transcrever({
        data: {
          audioBase64,
          format:
            format as
              | "wav"
              | "mp3"
              | "webm"
              | "m4a"
              | "ogg"
              | "aac"
              | "flac",
          accessToken,
          ...(contexto?.pistas
            ? {
                pistas: contexto.pistas,
              }
            : {}),
        },
      });

      if (!resultado.text) {
        toast.error(
          "Não foi possível obter texto deste áudio.",
        );
        return;
      }

      // A amostra fixada quando a gravação começou tem prioridade.
      const alvoId = alvoGravacaoRef.current ?? amostraActiva.id;
      alvoGravacaoRef.current = null;

      const destino =
        amostrasRef.current.find((a) => a.id === alvoId) ?? amostraActiva;

      const alvo = destino.id;

      actualizarAmostra(alvo, {
        texto: destino.texto
          ? `${destino.texto}\n\n${resultado.text}`
          : resultado.text,
      });

      setActivaId(alvo);


      toast.success(
        "Transcrição concluída.",
      );

      if (/\bamostra\b/i.test(resultado.text)) {
        void separarAmostras(alvo, resultado.text, true);
      }

    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Erro ao transcrever o áudio.",
      );
    } finally {
      setATranscrever(false);
    }
  };

  const separarAmostras = async (
    id: string,
    conteudo: string,
    automatico = false,
  ) => {
    if (!conteudo.trim()) {
      if (!automatico) {
        toast.error("Não há texto para separar.");
      }
      return;
    }

    setASeparar(true);

    try {
      let blocos: { titulo: string; texto: string }[] = [];

      try {
        const resultado = await separarIA({
          data: { texto: conteudo },
        });

        blocos = resultado.amostras;
      } catch {
        blocos = [];
      }

      if (blocos.length === 0) {
        blocos = separarAmostrasHeuristica(conteudo);
      }

      if (blocos.length <= 1) {
        if (!automatico) {
          toast.info(
            "Não foram detetadas várias amostras neste ditado.",
          );
        }
        return;
      }

      setAmostras((lista) => {
        const indice = lista.findIndex((a) => a.id === id);

        if (indice < 0) return lista;

        const base = lista[indice]!;

        const novas: Amostra[] = blocos.map((b, i) => ({
          id: i === 0 ? base.id : `${base.id}-${i}`,
          titulo: b.titulo || `Amostra ${i + 1}`,
          texto: b.texto,
          resumo:
            i === 0
              ? base.resumo
              : { ...resumoVazio() },
        }));

        return [
          ...lista.slice(0, indice),
          ...novas,
          ...lista.slice(indice + 1),
        ];
      });

      toast.success(
        `${blocos.length} amostras separadas. Reveja os títulos.`,
      );
    } finally {
      setASeparar(false);
    }
  };

  const otimizarTexto = async () => {
    if (!texto.trim()) {
      toast.error(
        "Não há texto para otimizar.",
      );
      return;
    }

    setAOtimizar(true);

    try {
      const revistas = await Promise.all(
        amostras.map(async (a) => {
          if (!a.texto.trim()) return a;

          const resultado = await otimizar({
            data: {
              texto: a.texto,

              exemplos:
                contexto?.exemplos ?? [],

              correccoes:
                contexto?.correccoes ?? [],
            },
          });

          return resultado.text
            ? { ...a, texto: resultado.text }
            : a;
        }),
      );

      setTextoOtimizado(textoCompleto(revistas));
      setAmostras(revistas);

      toast.success(
        "Relatório otimizado. Reveja as alterações.",
      );
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Erro ao otimizar o relatório.",
      );
    } finally {
      setAOtimizar(false);
    }
  };



  const guardar = async () => {
    if (!texto.trim()) {
      toast.error(
        "Não há texto para guardar.",
      );
      return;
    }

    const { data: sessao } =
      await supabase.auth.getUser();

    if (!sessao.user) {
      return;
    }

    const { error } =
      await supabase
        .from("relatorios_transcritos")
        .insert({
          medico_id: sessao.user.id,
          paciente_id: null,

          titulo:
            numeroAnalise.trim() ||
            `Relatório ${new Date().toLocaleDateString(
              "pt-PT",
            )}`,

          texto,
          amostras,
          fragmentos: amostraActiva.resumo.fragmentos,
          blocos: amostraActiva.resumo.blocos,
          seccionado: amostraActiva.resumo.seccionado,
          inclusao: amostraActiva.resumo.inclusao,
          codigo_faturacao:
            amostraActiva.resumo.codigoFaturacao,
        });


    if (error) {
      toast.error(
        "Não foi possível guardar o relatório.",
      );
      return;
    }

    if (
      aprendizagem &&
      textoOtimizado &&
      textoOtimizado !== texto
    ) {
      try {
        await guardarCorreccoes({
          data: {
            antes: textoOtimizado,
            depois: texto,
          },
        });
      } catch {
        // A aprendizagem é auxiliar:
        // uma falha aqui não impede o arquivo.
      }
    }

    toast.success(
      "Relatório guardado na sua conta.",
    );

    setTextoOtimizado(null);

    await carregar();
    await actualizarContexto();
  };

  const abrirRelatorio = (r: Relatorio) => {
    const guardadas = Array.isArray(r.amostras)
      ? (r.amostras as Amostra[]).filter(
          (a) => a && typeof a.texto === "string",
        )
      : [];

    const lista: Amostra[] =
      guardadas.length > 0
        ? guardadas.map((a) => ({
            id: a.id || novaAmostra().id,
            titulo: a.titulo ?? "",
            texto: a.texto ?? "",
            resumo: { ...resumoVazio(), ...(a.resumo ?? {}) },
          }))
        : [
            novaAmostra("", r.texto, {
              fragmentos: r.fragmentos ?? 0,
              blocos: r.blocos ?? 0,
              seccionado: r.seccionado ?? false,
              inclusao: r.inclusao ?? "total",
              codigoFaturacao: r.codigo_faturacao ?? "31057",
            }),
          ];

    setAmostras(lista);
    setActivaId(lista[0]!.id);
    setNumeroAnalise(r.titulo);


    setTextoOtimizado(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    toast.success(
      "Relatório carregado.",
    );
  };

  const apagar = async (
    id: string,
  ) => {
    const { error } =
      await supabase
        .from("relatorios_transcritos")
        .delete()
        .eq("id", id);

    if (error) {
      toast.error(
        "Não foi possível apagar.",
      );
      return;
    }

    setRelatorios((a) =>
      a.filter(
        (r) => r.id !== id,
      ),
    );
  };

  const exportar = async () => {
    if (!texto.trim()) {
      toast.error(
        "Não há texto para exportar.",
      );
      return;
    }

    try {
      const { gerarRelatorioDocx } = await import(
        "@/lib/relatorio-docx"
      );

      const usaveis = amostras.filter((a) => a.texto.trim());

      const blob = await gerarRelatorioDocx({
        numeroAnalise: numeroAnalise.trim(),
        template,
        instituicao: instituicao.trim() || "DermaVoz",
        servico:
          servico.trim() || "Serviço de Dermatopatologia",
        amostras: usaveis.map((a, i) => ({
          titulo: a.titulo.trim() || `Amostra ${i + 1}`,
          texto: a.texto.trim(),
          resumo: a.resumo,
        })),
      });


      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = `${
        numeroAnalise.trim() || "relatorio"
      }.docx`;

      a.click();

      URL.revokeObjectURL(url);
    } catch {
      toast.error(
        "Não foi possível gerar o documento Word.",
      );
    }
  };

  const copiar = async () => {
    if (!texto.trim()) {
      return;
    }

    await navigator.clipboard.writeText(
      texto,
    );

    toast.success(
      "Texto copiado.",
    );
  };

  const sair = async () => {
    await supabase.auth.signOut();

    navigate({
      to: "/auth",
    });
  };

  // ---------- COMANDOS POR VOZ ----------

  const recorderRef = useRef<RecorderHandle>(null);
  const [maosLivres, setMaosLivres] = useState(false);
  const [ajudaVoz, setAjudaVoz] = useState(false);
  const [aGravar, setAGravar] = useState(false);
  /** Suspende a escuta de comandos (microfone reservado ao gravador). */
  const [vozSuspensa, setVozSuspensa] = useState(false);
  const aGravarRef = useRef(false);
  aGravarRef.current = aGravar;


  const [pendente, setPendente] = useState<{
    comando: Comando;
    descricao: string;
  } | null>(null);

  const accoesRef = useRef({
    otimizarTexto,
    guardar,
    exportar,
    copiar,
    sair,
    separarAmostras,
    adicionarAmostra,
    removerAmostra,
    actualizarAmostra,
    setNumeroAnalise,
    setAmostras,
    setActivaId,
    amostras,
    amostraActiva,
  });
  accoesRef.current = {
    otimizarTexto,
    guardar,
    exportar,
    copiar,
    sair,
    separarAmostras,
    adicionarAmostra,
    removerAmostra,
    actualizarAmostra,
    setNumeroAnalise,
    setAmostras,
    setActivaId,
    amostras,
    amostraActiva,
  };

  const descreverComando = (c: Comando) => {
    switch (c.tipo) {
      case "apagar-amostra":
        return "Apagar a amostra activa";
      case "novo-relatorio":
        return "Limpar o relatório actual";
      case "sair":
        return "Terminar sessão";
      default:
        return "Confirmar acção";
    }
  };

  const executar = useCallback((c: Comando) => {
    const a = accoesRef.current;

    switch (c.tipo) {
      case "analise":
        a.setNumeroAnalise(c.valor);
        toast.success(`N.º da análise: ${c.valor}`);
        break;

      case "iniciar-gravacao": {
        // Fixa a amostra destino antes de arrancar, e só anuncia
        // "A gravar" quando o gravador arrancou mesmo.
        alvoGravacaoRef.current = a.amostraActiva.id;

        void (async () => {
          let ok = (await recorderRef.current?.iniciar()) ?? false;

          if (!ok) {
            // Microfone possivelmente ocupado pela escuta de comandos:
            // liberta-o e tenta uma segunda vez.
            setVozSuspensa(true);
            await new Promise((r) => window.setTimeout(r, 400));
            ok = (await recorderRef.current?.iniciar()) ?? false;
          }

          if (!ok) {
            alvoGravacaoRef.current = null;
            setVozSuspensa(false);
            toast.error(
              recorderRef.current?.erro() ??
                "Não foi possível iniciar a gravação.",
            );
            return;
          }

          toast.success("A gravar — diga \"App, parar\".");
        })();
        break;
      }

      case "parar-gravacao": {
        const parou = recorderRef.current?.parar() ?? false;
        setVozSuspensa(false);
        toast[parou ? "success" : "info"](
          parou ? "Gravação terminada." : "Não havia gravação em curso.",
        );
        break;
      }


      case "nova-amostra":
        a.adicionarAmostra();
        toast.success("Nova amostra criada.");
        break;

      case "ir-amostra": {
        const alvo = a.amostras[c.indice - 1];
        if (!alvo) {
          toast.error(`Não existe a amostra ${c.indice}.`);
          break;
        }
        a.setActivaId(alvo.id);
        toast.success(`Amostra ${c.indice} activa.`);
        break;
      }

      case "apagar-amostra":
        a.removerAmostra(a.amostraActiva.id);
        toast.success("Amostra removida.");
        break;

      case "resumo":
        a.actualizarAmostra(a.amostraActiva.id, {
          resumo: { ...a.amostraActiva.resumo, ...c.resumo },
        });
        toast.success("Resumo técnico actualizado.");
        break;

      case "separar":
        void a.separarAmostras(
          a.amostraActiva.id,
          a.amostraActiva.texto,
        );
        break;

      case "otimizar":
        void a.otimizarTexto();
        break;

      case "guardar":
        void a.guardar();
        break;

      case "exportar":
        void a.exportar();
        break;

      case "copiar":
        void a.copiar();
        break;

      case "novo-relatorio": {
        const nova = novaAmostra();
        a.setAmostras([nova]);
        a.setActivaId(nova.id);
        a.setNumeroAnalise("");
        toast.success("Relatório limpo.");
        break;
      }

      case "sair":
        void a.sair();
        break;

      default:
        break;
    }
  }, []);

  const tratarFrase = useCallback(
    ({ transcript, isFinal }: { transcript: string; isFinal: boolean }) => {
      if (!isFinal) return;

      const corpo = extrairComando(transcript);
      if (corpo === null) return; // ditado normal

      const comando = interpretarComando(corpo);
      if (!comando) {
        if (aGravarRef.current) return; // ditado em curso: ignorar ruído
        toast.error(`Comando não reconhecido: "${corpo}"`);
        return;
      }

      // Durante a gravação o microfone pertence ao ditado:
      // só se aceita parar.
      if (aGravarRef.current && comando.tipo !== "parar-gravacao") {
        return;
      }


      if (comando.tipo === "ajuda") {
        setAjudaVoz(true);
        return;
      }

      if (comando.tipo === "cancelar") {
        setPendente(null);
        toast.info("Acção cancelada.");
        return;
      }

      if (comando.tipo === "confirmar") {
        setPendente((p) => {
          if (!p) {
            toast.error("Não há nenhuma acção por confirmar.");
            return null;
          }
          executar(p.comando);
          return null;
        });
        return;
      }

      if (COMANDOS_DESTRUTIVOS.has(comando.tipo)) {
        setPendente({
          comando,
          descricao: descreverComando(comando),
        });
        toast.warning(`${descreverComando(comando)}? Diga "confirmar".`);
        return;
      }

      executar(comando);
    },
    [executar],
  );

  const {
    suportado: vozSuportada,
    aEscutar,
    ultima,
  } = useReconhecimentoVoz({
    activo: maosLivres,
    suspenso: vozSuspensa,
    onFrase: tratarFrase,
    onErro: (m) => {
      toast.error(m);
      setMaosLivres(false);
    },
  });


  const palavras = contarPalavras(texto);



  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
          <span className="flex size-10 items-center justify-center rounded-md bg-clinical text-clinical-foreground">
            <Mic className="size-5" />
          </span>

          <div>
            <h1 className="text-xl font-semibold text-primary-foreground">
              DermaVoz
            </h1>

            <p className="text-sm text-primary-foreground/75">
              Gravar voz e exportar texto · pt-PT
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="ml-auto gap-2"
            onClick={sair}
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">

          {/* COLUNA ESQUERDA */}

          <div className="space-y-6">

            <BarraComandosVoz
              activo={maosLivres}
              suportado={vozSuportada}
              aEscutar={aEscutar}
              ultima={ultima}
              pendente={pendente?.descricao ?? null}
              onAlternar={setMaosLivres}
              ajudaAberta={ajudaVoz}
              onAjudaChange={setAjudaVoz}
              aGravar={aGravar}
              vozSuspensa={vozSuspensa}
            />

            <RecorderPanel
              ref={recorderRef}
              disabled={aTranscrever}
              onAudio={handleAudio}
              onEstadoChange={tratarEstadoGravacao}
            />



            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={aSeparar || !amostraActiva.texto.trim()}
              onClick={() =>
                separarAmostras(
                  amostraActiva.id,
                  amostraActiva.texto,
                )
              }
            >
              {aSeparar ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SplitSquareVertical className="size-4" />
              )}
              Separar amostras do ditado
            </Button>


            <CampoAnalise
              valor={numeroAnalise}
              onChange={setNumeroAnalise}
            />

            <ModeloDocumento
              template={template}
              instituicao={instituicao}
              servico={servico}
              onTemplateChange={setTemplate}
              onInstituicaoChange={setInstituicao}
              onServicoChange={setServico}
            />

            {/* VOCABULÁRIO APRENDIDO */}

            <section className="panel space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-clinical/20 text-clinical">
                    <Brain className="size-5" />
                  </span>

                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Vocabulário aprendido
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Termos e correções recolhidos dos seus relatórios anteriores.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={alternarAprendizagem}
                >
                  <Power className="size-4" />
                  {aprendizagem
                    ? "Desligar"
                    : "Ligar"}
                </Button>
              </div>

              {aprendizagem ? (
                termos.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Ainda não foram aprendidos termos.
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      As correções dos seus relatórios serão aprendidas automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {termos.map((termo) => (
                      <div
                        key={termo.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {termo.termo}
                            </span>

                            <span className="shrink-0 text-xs text-muted-foreground">
                              {termo.ocorrencias}×
                            </span>
                          </div>

                          {termo.correcao_de && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {termo.correcao_de} → {termo.termo}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removerTermo(termo)
                          }
                          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                          aria-label={`Remover ${termo.termo}`}
                          title="Remover do vocabulário"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    A aprendizagem está desligada.
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Os termos existentes não serão usados enquanto estiver desligada.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* COLUNA DIREITA */}

          <div className="space-y-6">

            <section className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Amostras da análise
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Dite tudo seguido dizendo &quot;amostra&quot; antes de cada
                    uma, ou edite cada bloco aqui.
                  </p>
                </div>

                <span className="text-xs text-muted-foreground">
                  {palavras} palavras
                </span>
              </div>

              <ListaAmostras
                amostras={amostras}
                activaId={amostraActiva.id}
                onActivar={setActivaId}
                onTituloChange={(id, titulo) =>
                  actualizarAmostra(id, { titulo })
                }
                onTextoChange={(id, t) =>
                  actualizarAmostra(id, { texto: t })
                }
                onResumoChange={(id, resumo) =>
                  actualizarAmostra(id, { resumo })
                }
                onAdicionar={adicionarAmostra}
                onRemover={removerAmostra}
                onMover={moverAmostra}
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={otimizarTexto}
                  className="gap-2"
                  disabled={
                    aOtimizar ||
                    !texto.trim()
                  }
                >
                  {aOtimizar ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}

                  Otimizar Relatório com IA
                </Button>

                <Button
                  variant="outline"
                  onClick={guardar}
                  className="gap-2"
                >
                  <Save className="size-4" />
                  Guardar relatório
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={exportar}
                >
                  <FileDown className="size-4" />
                  Exportar Word (.docx)
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={copiar}
                  disabled={!texto}
                >
                  <Copy className="size-4" />
                  Copiar
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    const nova = novaAmostra();
                    setAmostras([nova]);
                    setActivaId(nova.id);
                  }}
                  disabled={!texto}
                >
                  <Eraser className="size-4" />
                  Limpar
                </Button>
              </div>
            </section>


            <section className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">
                Os meus relatórios
              </h2>

              <p className="text-sm text-muted-foreground">
                Visíveis apenas na sua conta.
              </p>

              <ul className="mt-4 space-y-2">
                {relatorios.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Ainda não guardou relatórios.
                  </li>
                )}

                {relatorios.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() =>
                        abrirRelatorio(r)
                      }
                    >
                      <span className="block truncate text-sm font-medium text-foreground">
                        {r.titulo}
                      </span>

                      <span className="block text-xs text-muted-foreground">
                        {new Date(
                          r.created_at,
                        ).toLocaleString(
                          "pt-PT",
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        apagar(r.id)
                      }
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Apagar relatório"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}