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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecorderPanel } from "@/components/recorder-panel";
import { transcribeAudio, optimizeReport } from "@/lib/transcribe.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Consultório — DermaVoz" },
      {
        name: "description",
        content:
          "Grave a voz, transcreva em português europeu e guarde os relatórios associados aos seus doentes, em privado.",
      },
      { property: "og:title", content: "Consultório DermaVoz" },
      {
        property: "og:description",
        content: "Ditado clínico, transcrição automática e arquivo privado de relatórios por médico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppPage,
});

type Paciente = { id: string; nome: string; numero_processo: string | null };
type Relatorio = {
  id: string;
  titulo: string;
  texto: string;
  created_at: string;
  paciente_id: string | null;
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o ficheiro de áudio."));
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

  const [aTranscrever, setATranscrever] = useState(false);
  const [aOtimizar, setAOtimizar] = useState(false);
  const [texto, setTexto] = useState("");
  const [titulo, setTitulo] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState("");
  const [novoPaciente, setNovoPaciente] = useState("");
  const [novoProcesso, setNovoProcesso] = useState("");
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);

  const carregar = useCallback(async () => {
    const [p, r] = await Promise.all([
      supabase.from("pacientes").select("id, nome, numero_processo").order("nome"),
      supabase
        .from("relatorios_transcritos")
        .select("id, titulo, texto, created_at, paciente_id")
        .order("created_at", { ascending: false }),
    ]);
    if (p.data) setPacientes(p.data);
    if (r.data) setRelatorios(r.data);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleAudio = async (blob: Blob, format: string) => {
    setATranscrever(true);
    try {
      const audioBase64 = await blobToBase64(blob);
      const resultado = await transcrever({
        data: {
          audioBase64,
          format: format as "wav" | "mp3" | "webm" | "m4a" | "ogg" | "aac" | "flac",
        },
      });
      if (!resultado.text) {
        toast.error("Não foi possível obter texto deste áudio.");
        return;
      }
      setTexto((atual) => (atual ? `${atual}\n\n${resultado.text}` : resultado.text));
      toast.success("Transcrição concluída.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao transcrever o áudio.");
    } finally {
      setATranscrever(false);
    }
  };

  const otimizarTexto = async () => {
    if (!texto.trim()) {
      toast.error("Não há texto para otimizar.");
      return;
    }
    setAOtimizar(true);
    try {
      const resultado = await otimizar({ data: { texto } });
      if (!resultado.text) {
        toast.error("A IA não devolveu texto revisto.");
        return;
      }
      setTexto(resultado.text);
      toast.success("Relatório otimizado. Reveja as alterações.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao otimizar o relatório.");
    } finally {
      setAOtimizar(false);
    }
  };

  const criarPaciente = async () => {
    if (!novoPaciente.trim()) return;
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao.user) return;
    const { data, error } = await supabase
      .from("pacientes")
      .insert({
        medico_id: sessao.user.id,
        nome: novoPaciente.trim(),
        numero_processo: novoProcesso.trim() || null,
      })
      .select("id, nome, numero_processo")
      .single();
    if (error || !data) {
      toast.error("Não foi possível criar o doente.");
      return;
    }
    setPacientes((a) => [...a, data]);
    setPacienteId(data.id);
    setNovoPaciente("");
    setNovoProcesso("");
    toast.success("Doente adicionado.");
  };

  const guardar = async () => {
    if (!texto.trim()) {
      toast.error("Não há texto para guardar.");
      return;
    }
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao.user) return;
    const { error } = await supabase.from("relatorios_transcritos").insert({
      medico_id: sessao.user.id,
      paciente_id: pacienteId || null,
      titulo: titulo.trim() || `Relatório ${new Date().toLocaleDateString("pt-PT")}`,
      texto,
    });
    if (error) {
      toast.error("Não foi possível guardar o relatório.");
      return;
    }
    toast.success("Relatório guardado na sua conta.");
    setTitulo("");
    void carregar();
  };

  const apagar = async (id: string) => {
    const { error } = await supabase.from("relatorios_transcritos").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível apagar.");
      return;
    }
    setRelatorios((a) => a.filter((r) => r.id !== id));
  };

  const exportar = () => {
    if (!texto.trim()) {
      toast.error("Não há texto para exportar.");
      return;
    }
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titulo.trim() || "transcricao"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copiar = async () => {
    if (!texto.trim()) return;
    await navigator.clipboard.writeText(texto);
    toast.success("Texto copiado.");
  };

  const sair = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
          <span className="flex size-10 items-center justify-center rounded-md bg-clinical text-clinical-foreground">
            <Mic className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-primary-foreground">DermaVoz</h1>
            <p className="text-sm text-primary-foreground/75">Gravar voz e exportar texto · pt-PT</p>
          </div>
          <Button variant="secondary" size="sm" className="ml-auto gap-2" onClick={sair}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <RecorderPanel disabled={aTranscrever} onAudio={handleAudio} />

            <section className="panel space-y-3 p-6">
              <h2 className="text-lg font-semibold text-foreground">Doentes</h2>
              <div className="space-y-2">
                <Label htmlFor="paciente">Associar a um doente</Label>
                <select
                  id="paciente"
                  value={pacienteId}
                  onChange={(e) => setPacienteId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sem doente associado</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                      {p.numero_processo ? ` · ${p.numero_processo}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={novoPaciente}
                  onChange={(e) => setNovoPaciente(e.target.value)}
                  placeholder="Nome do novo doente"
                />
                <Input
                  value={novoProcesso}
                  onChange={(e) => setNovoProcesso(e.target.value)}
                  placeholder="N.º de processo"
                />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={criarPaciente}>
                <UserPlus className="size-4" />
                Adicionar doente
              </Button>
            </section>
          </div>

          <div className="space-y-6">
            <section className="panel flex flex-col p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Texto transcrito</h2>
                  <p className="text-sm text-muted-foreground">
                    Reveja e corrija antes de guardar ou exportar.
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{palavras} palavras</span>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="titulo">Título do relatório</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Biópsia dorso — 19/08"
                />
              </div>

              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="O texto transcrito aparecerá aqui."
                className="mt-4 min-h-[360px] flex-1 resize-none text-sm leading-relaxed"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  onClick={otimizarTexto}
                  className="gap-2"
                  disabled={aOtimizar || !texto.trim()}
                >
                  {aOtimizar ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Otimizar Relatório com IA
                </Button>
                <Button variant="outline" onClick={guardar} className="gap-2">
                  <Save className="size-4" />
                  Guardar relatório
                </Button>
                <Button variant="outline" className="gap-2" onClick={exportar}>
                  <FileDown className="size-4" />
                  Exportar .txt
                </Button>
                <Button variant="outline" className="gap-2" onClick={copiar} disabled={!texto}>
                  <Copy className="size-4" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setTexto("")}
                  disabled={!texto}
                >
                  <Eraser className="size-4" />
                  Limpar
                </Button>
              </div>
            </section>

            <section className="panel p-6">
              <h2 className="text-lg font-semibold text-foreground">Os meus relatórios</h2>
              <p className="text-sm text-muted-foreground">
                Visíveis apenas na sua conta.
              </p>
              <ul className="mt-4 space-y-2">
                {relatorios.length === 0 && (
                  <li className="text-sm text-muted-foreground">Ainda não guardou relatórios.</li>
                )}
                {relatorios.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setTexto(r.texto);
                        setTitulo(r.titulo);
                        setPacienteId(r.paciente_id ?? "");
                      }}
                    >
                      <span className="block truncate text-sm font-medium text-foreground">
                        {r.titulo}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("pt-PT")}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => apagar(r.id)}
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
