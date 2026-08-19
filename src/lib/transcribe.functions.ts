import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  audioBase64: z.string().min(10),
  format: z.enum(["wav", "mp3", "webm", "m4a", "ogg", "aac", "flac"]),
});

const PROMPT =
  "Transcreve integralmente o áudio em português europeu (pt-PT), palavra por palavra, com pontuação correcta e terminologia médica/dermatológica correctamente grafada. Não resumas, não reorganizes, não acrescentes títulos, secções, comentários ou markdown. Devolve apenas o texto transcrito.";

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("O serviço de transcrição não está configurado.");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcreve este áudio." },
              {
                type: "input_audio",
                input_audio: { data: data.audioBase64, format: data.format },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      let message = body;
      try {
        message = JSON.parse(body)?.error?.message ?? body;
      } catch {
        /* texto simples */
      }
      if (response.status === 429) {
        throw new Error("Demasiados pedidos em curto espaço de tempo. Tente novamente dentro de momentos.");
      }
      if (response.status === 402) {
        throw new Error(message || "Créditos de IA esgotados. Adicione créditos para continuar a transcrever.");
      }
      throw new Error(message || "Falha na transcrição do áudio.");
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { text };
  });
