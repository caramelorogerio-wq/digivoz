import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Mic, FileDown, Eraser, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RecorderPanel } from "@/components/recorder-panel";
import { transcribeAudio } from "@/lib/transcribe.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DermaVoz — Gravar voz e exportar como texto" },
      {
        name: "description",
        content:
          "Grave a sua voz ou carregue um ficheiro áudio, obtenha a transcrição em português europeu e exporte-a como ficheiro de texto.",
      },
      { property: "og:title", content: "DermaVoz — Voz para texto em pt-PT" },
      {
        property: "og:description",
        content:
          "Gravação de voz com transcrição automática em português europeu e exportação em ficheiro de texto.",
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
  const [texto, setTexto] = useState("");

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

  const exportar = () => {
    if (!texto.trim()) {
      toast.error("Não há texto para exportar.");
      return;
    }
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcricao-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ficheiro de texto exportado.");
  };

  const copiar = async () => {
    if (!texto.trim()) return;
    await navigator.clipboard.writeText(texto);
    toast.success("Texto copiado.");
  };

  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <span className="flex size-10 items-center justify-center rounded-md bg-clinical text-clinical-foreground">
            <Mic className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-primary-foreground">DermaVoz</h1>
            <p className="text-sm text-primary-foreground/75">
              Gravar voz e exportar como texto · pt-PT
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <RecorderPanel disabled={aTranscrever} onAudio={handleAudio} />

          <section className="panel flex flex-col p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Texto transcrito</h2>
                <p className="text-sm text-muted-foreground">
                  Reveja e corrija o texto antes de exportar.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{palavras} palavras</span>
            </div>

            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O texto transcrito aparecerá aqui. Pode também escrever ou colar directamente."
              className="mt-4 min-h-[420px] flex-1 resize-none text-sm leading-relaxed"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={exportar} className="gap-2">
                <FileDown className="size-4" />
                Exportar como texto (.txt)
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
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Reveja sempre a transcrição antes de a utilizar.
      </footer>
    </div>
  );
}
