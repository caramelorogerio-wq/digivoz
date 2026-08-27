import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  Mic,
  FileDown,
  Eraser,
  Copy,
  Save,
  LogOut,
  UserPlus,
  Trash2,
  Sparkles,
  Loader2,
  Brain,
  Power,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecorderPanel } from "@/components/recorder-panel";
import { ResumoTecnico } from "@/components/resumo-tecnico";
import {
  transcribeAudio,
  optimizeReport,
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

type Paciente = {
  id: string;
  nome: string;
  numero_processo: string | null;
};

type Relatorio = {
  id: string;
  titulo: string;
  texto: string;
  created_at: string;
  paciente_id: string | null;
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
  const carregarVocabulario = useServerFn(getVocabularioPessoal);
  const guardarCorreccoes = useServerFn(registarCorreccoes);

  const [aTranscrever, setATranscrever] = useState(false);
  const [aOtimizar, setAOtimizar] = useState(false);

  const [texto, setTexto] = useState("");
  const [titulo, setTitulo] = useState("");

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState("");

  const [novoPaciente, setNovoPaciente] = useState("");
  const [novoProcesso, setNovoProcesso] = useState("");

  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);

  const [contexto, setContexto] =
    useState<ContextoAprendizagem | null>(null);

  const [termos, setTermos] = useState<Termo[]>([]);

  const [aprendizagem, setAprendizagem] = useState(true);

  const [textoOtimizado, setTextoOtimizado] =
    useState<string | null>(null);

  const [fragmentos, setFragmentos] = useState(0);
  const [blocos, setBlocos] = useState(0);

  const [seccionado, setSeccionado] = useState(false);

  const [inclusao, setInclusao] =
    useState<"total" | "reserva">("total");

  const [codigoFaturacao, setCodigoFaturacao] =
    useState<"31057" | "31077">("31057");

  const carregar = useCallback(async () => {
    const [p, r, t, m] = await Promise.all([
      supabase
        .from("pacientes")
        .select("id, nome, numero_processo")
        .order("nome"),

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

    if (p.data) {
      setPacientes(p.data);
    }

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

      setTexto((atual) =>
        atual
          ? `${atual}\n\n${resultado.text}`
          : resultado.text,
      );

      toast.success(
        "Transcrição concluída.",
      );
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

  const otimizarTexto = async () => {
    if (!texto.trim()) {
      toast.error(
        "Não há texto para otimizar.",
      );
      return;
    }

    setAOtimizar(true);

    try {
      const resultado = await otimizar({
        data: {
          texto,

          exemplos:
            contexto?.exemplos ?? [],

          correccoes:
            contexto?.correccoes ?? [],
        },
      });

      if (!resultado.text) {
        toast.error(
          "A IA não devolveu texto revisto.",
        );
        return;
      }

      setTextoOtimizado(resultado.text);
      setTexto(resultado.text);

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

  const criarPaciente = async () => {
    if (!novoPaciente.trim()) {
      return;
    }

    const { data: sessao } =
      await supabase.auth.getUser();

    if (!sessao.user) {
      return;
    }

    const { data, error } =
      await supabase
        .from("pacientes")
        .insert({
          medico_id: sessao.user.id,
          nome: novoPaciente.trim(),
          numero_processo:
            novoProcesso.trim() || null,
        })
        .select(
          "id, nome, numero_processo",
        )
        .single();

    if (error || !data) {
      toast.error(
        "Não foi possível criar o doente.",
      );
      return;
    }

    setPacientes((a) => [
      ...a,
      data,
    ]);

    setPacienteId(data.id);
    setNovoPaciente("");
    setNovoProcesso("");

    toast.success(
      "Doente adicionado.",
    );
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
          paciente_id:
            pacienteId || null,

          titulo:
            titulo.trim() ||
            `Relatório ${new Date().toLocaleDateString(
              "pt-PT",
            )}`,

          texto,
          fragmentos,
          blocos,
          seccionado,
          inclusao,
          codigo_faturacao:
            codigoFaturacao,
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

    setTitulo("");
    setTextoOtimizado(null);

    await carregar();
    await actualizarContexto();
  };

  const abrirRelatorio = (r: Relatorio) => {
    setTexto(r.texto);
    setTitulo(r.titulo);

    setPacienteId(
      r.paciente_id ?? "",
    );

    setFragmentos(
      r.fragmentos ?? 0,
    );

    setBlocos(
      r.blocos ?? 0,
    );

    setSeccionado(
      r.seccionado ?? false,
    );

    setInclusao(
      r.inclusao ?? "total",
    );

    setCodigoFaturacao(
      r.codigo_faturacao ?? "31057",
    );

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

      const blob = await gerarRelatorioDocx({
        numeroAnalise: numeroAnalise.trim(),
        texto: texto.trim(),
        resumo: {
          fragmentos,
          blocos,
          seccionado,
          inclusao,
          codigoFaturacao,
        },
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

  const palavras = texto.trim()
    ? texto
        .trim()
        .split(/\s+/)
        .length
    : 0;

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

            <RecorderPanel
              disabled={aTranscrever}
              onAudio={handleAudio}
            />

            <ResumoTecnico
              fragmentos={fragmentos}
              blocos={blocos}
              seccionado={seccionado}
              inclusao={inclusao}
              codigoFaturacao={
                codigoFaturacao
              }
              onFragmentosChange={
                setFragmentos
              }
              onBlocosChange={
                setBlocos
              }
              onSeccionadoChange={
                setSeccionado
              }
              onInclusaoChange={
                setInclusao
              }
              onCodigoFaturacaoChange={
                setCodigoFaturacao
              }
            />

            <CampoAnalise
              valor={numeroAnalise}
              onChange={setNumeroAnalise}
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

            <section className="panel flex flex-col p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Texto transcrito
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Reveja e corrija antes de guardar ou exportar.
                  </p>
                </div>

                <span className="text-xs text-muted-foreground">
                  {palavras} palavras
                </span>
              </div>


              <Textarea
                value={texto}
                onChange={(e) =>
                  setTexto(
                    e.target.value,
                  )
                }
                placeholder="O texto transcrito aparecerá aqui."
                className="mt-4 min-h-[360px] flex-1 resize-none text-sm leading-relaxed"
              />

              <div className="mt-4 flex flex-wrap gap-3">
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
                  onClick={() =>
                    setTexto("")
                  }
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