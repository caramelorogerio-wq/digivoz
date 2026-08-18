import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Stethoscope, FileDown, Eraser } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecorderPanel } from "@/components/recorder-panel";
import { transcribeAudio } from "@/lib/transcribe.functions";
import { exportReportPdf } from "@/lib/report-pdf";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PatoVoz — Transcrição de Relatórios de Anatomia Patológica" },
      {
        name: "description",
        content:
          "Ditado e transcrição automática de relatórios de autópsia e exames histológicos em português europeu, com edição clínica e exportação em PDF.",
      },
      { property: "og:title", content: "PatoVoz — Transcrição para Médicos Patologistas" },
      {
        property: "og:description",
        content:
          "Grave ou carregue ditados clínicos, obtenha relatórios estruturados em pt-PT e exporte em PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

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

function Index() {
  const transcrever = useServerFn(transcribeAudio);
  const [aTranscrever, setATranscrever] = useState(false);
  const [tipo, setTipo] = useState<"autopsia" | "histologico">("autopsia");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [doente, setDoente] = useState("");
  const [patologista, setPatologista] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [texto, setTexto] = useState("");

  const handleAudio = async (blob: Blob, format: string) => {
    setATranscrever(true);
    try {
      const audioBase64 = await blobToBase64(blob);
      const resultado = await transcrever({
        data: {
          audioBase64,
          format: format as "wav" | "mp3" | "webm" | "m4a" | "ogg" | "aac" | "flac",
          tipo,
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

  const exportar = () => {
    if (!texto.trim()) {
      toast.error("Não há texto para exportar.");
      return;
    }
    exportReportPdf({ tipo, numeroProcesso, doente, patologista, data, texto });
    toast.success("Relatório PDF gerado.");
  };

  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
          <span className="flex size-10 items-center justify-center rounded-md bg-clinical text-clinical-foreground">
            <Stethoscope className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-primary-foreground">PatoVoz</h1>
            <p className="text-sm text-primary-foreground/75">
              Transcrição de relatórios de anatomia patológica · pt-PT
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="panel mb-6 p-6">
          <h2 className="text-lg font-semibold text-foreground">Dados do exame</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de relatório</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="autopsia">Autópsia</SelectItem>
                  <SelectItem value="histologico">Exame histológico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="processo">N.º de processo</Label>
              <Input
                id="processo"
                value={numeroProcesso}
                onChange={(e) => setNumeroProcesso(e.target.value)}
                placeholder="AP-2026-0001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doente">Doente / Cadáver</Label>
              <Input
                id="doente"
                value={doente}
                onChange={(e) => setDoente(e.target.value)}
                placeholder="Iniciais ou identificação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="patologista">Médico patologista</Label>
              <Input
                id="patologista"
                value={patologista}
                onChange={(e) => setPatologista(e.target.value)}
                placeholder="Dr.(a) …"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <RecorderPanel disabled={aTranscrever} onAudio={handleAudio} />

          <section className="panel flex flex-col p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Editor do relatório</h2>
                <p className="text-sm text-muted-foreground">
                  Reveja e corrija a transcrição antes de exportar.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{palavras} palavras</span>
            </div>

            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O texto transcrito aparecerá aqui. Pode também escrever ou colar directamente."
              className="mt-4 min-h-[460px] flex-1 resize-none font-mono text-sm leading-relaxed"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={exportar} className="gap-2">
                <FileDown className="size-4" />
                Exportar como Relatório PDF
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setTexto("")}
                disabled={!texto}
              >
                <Eraser className="size-4" />
                Limpar texto
              </Button>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Conteúdo clínico confidencial. Reveja sempre a transcrição antes de validar o relatório.
      </footer>
    </div>
  );
}
