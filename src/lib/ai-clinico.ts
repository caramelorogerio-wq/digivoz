export const mimeFor: Record<string, string> = {
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
export const VOCABULARIO =
  "Ditado clínico em português europeu de dermatopatologia. Terminologia frequente: exame macroscópico, biópsia punch, biópsia incisional, biópsia excisional, peça de excisão, fuso cutâneo, margens cirúrgicas, margem lateral, margem profunda, epiderme, derme papilar, derme reticular, hipoderme, tecido celular subcutâneo, acantose, hiperqueratose, paraqueratose, espongiose, acantólise, disqueratose, papilomatose, atipia citológica, mitoses, infiltrado inflamatório linfocitário, perivascular, liquenoide, granulomatoso, queratose seborreica, queratose actínica, carcinoma basocelular, carcinoma espinocelular, doença de Bowen, melanoma maligno, nevo melanocítico, nevo displásico, índice de Breslow, nível de Clark, ulceração, regressão, invasão perineural, invasão linfovascular, dermatofibroma, quisto epidérmico, molusco contagioso, verruga vulgar, psoríase, líquen plano, dermatite espongiótica, pênfigo, penfigoide bolhoso, lúpus eritematoso, imuno-histoquímica, HE, PAS, S100, Melan-A, HMB-45, Ki-67, formol tamponado, inclusão em parafina.";

export const PROMPT_OTIMIZACAO =
  "És um revisor de relatórios de dermatopatologia em Portugal. Recebes uma transcrição bruta de ditado e devolves o mesmo conteúdo corrigido: pontuação e maiúsculas correctas, parágrafos legíveis, correcção de erros de reconhecimento de voz, e terminologia dermatopatológica escrita segundo o português europeu padrão (pt-PT, sem grafia brasileira). Expande ditados de pontuação (por exemplo 'ponto final', 'vírgula', 'novo parágrafo') na pontuação respectiva. Abrevia unidades conforme a prática clínica: 'milímetros' → 'mm', 'centímetros' → 'cm'. Não inventes, não acrescentes, não removas informação clínica, não resumas e não uses markdown. Devolve apenas o texto revisto.";

export async function gatewayError(response: Response) {
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
