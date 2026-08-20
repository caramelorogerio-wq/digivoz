import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  audioBase64: z.string().min(10),
  format: z.enum(["wav", "mp3", "webm", "m4a", "ogg", "aac", "flac"]),
});

const mimeFor: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  webm: "audio/webm",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
};

// Vocabulário enviado ao modelo de reconhecimento de voz para melhorar a
// grafia de terminologia dermatopatológica frequente em ditado clínico.
const VOCABULARIO =
  "Ditado clínico em português europeu de dermatopatologia. Terminologia frequente: exame macroscópico, biópsia punch, biópsia incisional, biópsia excisional, peça de excisão, fuso cutâneo, margens cirúrgicas, margem lateral, margem profunda, epiderme, derme papilar, derme reticular, hipoderme, tecido celular subcutâneo, acantose, hiperqueratose, paraqueratose, espongiose, acantólise, disqueratose, papilomatose, atipia citológica, mitoses, infiltrado inflamatório linfocitário, perivascular, liquenoide, granulomatoso, queratose seborreica, queratose actínica, carcinoma basocelular, carcinoma espinocelular, doença de Bowen, melanoma maligno, nevo melanocítico, nevo displásico, índice de Breslow, nível de Clark, ulceração, regressão, invasão perineural, invasão linfovascular, dermatofibroma, quisto epidérmico, molusco contagioso, verruga vulgar, psoríase, líquen plano, dermatite espongiótica, pênfigo, penfigoide bolhoso, lúpus eritematoso, imuno-histoquímica, HE, PAS, S100, Melan-A, HMB-45, Ki-67, formol tamponado, inclusão em parafina.";

const PROMPT_OTIMIZACAO =
  "És um revisor de relatórios de dermatopatologia em Portugal. Recebes uma transcrição bruta de ditado e devolves o mesmo conteúdo corrigido: pontuação e maiúsculas correctas, parágrafos legíveis, correcção de erros de reconhecimento de voz, e terminologia dermatopatológica escrita segundo o português europeu padrão (pt-PT, sem grafia brasileira). Expande ditados de pontuação (por exemplo 'ponto final', 'vírgula', 'novo parágrafo') na pontuação respectiva. Não inventes, não acrescentes, não removas informação clínica, não resumas e não uses markdown. Devolve apenas o texto revisto.";

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("O serviço de transcrição não está configurado.");
    }

    const bytes = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeFor[data.format] ?? "audio/webm" });

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", blob, `gravacao.${data.format}`);
    form.append("language", "pt");
    form.append("prompt", VOCABULARIO);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      throw new Error(await gatewayError(response));
    }

    const json = (await response.json()) as { text?: string };
    return { text: (json.text ?? "").trim() };
  });

export const optimizeReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ texto: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("O serviço de IA não está configurado.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: `${PROMPT_OTIMIZACAO}\n\n${VOCABULARIO}` },
          { role: "user", content: data.texto },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(await gatewayError(response));
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return { text: json.choices?.[0]?.message?.content?.trim() ?? "" };
  });

async function gatewayError(response: Response) {
  const body = await response.text();
  let message = body;
  try {
    message = JSON.parse(body)?.error?.message ?? body;
  } catch {
    /* texto simples */
  }
  if (response.status === 429) {
    return "Demasiados pedidos em curto espaço de tempo. Tente novamente dentro de momentos.";
  }
  if (response.status === 402) {
    return message || "Créditos de IA esgotados. Adicione créditos para continuar.";
  }
  return message || "Falha no pedido de IA.";
}
