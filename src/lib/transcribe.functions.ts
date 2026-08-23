import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  mimeFor,
  VOCABULARIO,
  PROMPT_OTIMIZACAO,
  gatewayError,
} from "./ai-clinico";

const inputSchema = z.object({
  audioBase64: z.string().min(10),
  format: z.enum(["wav", "mp3", "webm", "m4a", "ogg", "aac", "flac"]),
  pistas: z.string().max(1200).optional(),
});

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const request = getRequest();
    const authorization = request.headers.get("authorization");

    if (!authorization?.toLowerCase().startsWith("bearer ")) {
      throw new Error("Sessão não encontrada.");
    }

    const apiUrl =
      process.env["VITE_LOVABLE_API_URL"] ??
      "https://digivoz.lovable.app";

    const response = await fetch(`${apiUrl}/api/transcrever`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audioBase64: data.audioBase64,
        format: data.format,
      }),
    });

    const json = (await response.json()) as {
      text?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(
        json.error ?? `Erro na transcrição (${response.status}).`,
      );
    }

    return {
      text: (json.text ?? "").trim(),
    };
  });

export const optimizeReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        texto: z.string().min(1),
        exemplos: z.array(z.string()).max(3).optional(),
        correccoes: z
          .array(z.object({ de: z.string(), para: z.string() }))
          .max(40)
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];

    if (!apiKey) {
      throw new Error("O serviço de IA não está configurado.");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.7-flash",
          messages: [
            {
              role: "system",
              content: [
                PROMPT_OTIMIZACAO,
                VOCABULARIO,
                data.correccoes?.length
                  ? `Correcções que este médico costuma fazer (aplica-as quando o contexto o justificar): ${data.correccoes
                      .map((c) => `"${c.de}" → "${c.para}"`)
                      .join("; ")}.`
                  : "",
                data.exemplos?.length
                  ? `Exemplos de relatórios anteriores deste médico, apenas como referência de estilo, pontuação e abreviaturas. Não copies conteúdo clínico destes exemplos:\n\n${data.exemplos.join(
                      "\n\n---\n\n",
                    )}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
            {
              role: "user",
              content: data.texto,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(await gatewayError(response));
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    return {
      text: json.choices?.[0]?.message?.content?.trim() ?? "",
    };
  });