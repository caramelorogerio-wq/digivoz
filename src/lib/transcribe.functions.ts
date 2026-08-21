import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { mimeFor, VOCABULARIO, PROMPT_OTIMIZACAO, gatewayError } from "./ai-clinico";

const inputSchema = z.object({
  audioBase64: z.string().min(10),
  format: z.enum(["wav", "mp3", "webm", "m4a", "ogg", "aac", "flac"]),
  pistas: z.string().max(1200).optional(),
});

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
    form.append(
      "prompt",
      data.pistas
        ? `${VOCABULARIO} Termos usados frequentemente por este médico: ${data.pistas}.`
        : VOCABULARIO,
    );

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
