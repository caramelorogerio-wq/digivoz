# Corrigir "App, iniciar gravação" no modo mãos livres

## Problema relatado

Com o modo mãos livres ligado, ao dizer "App, iniciar gravação" o ditado não acaba no campo da amostra: só aparece na barra de comandos (linha "Ouvido: …").

## Diagnóstico (por confirmar no primeiro passo)

O painel de comandos e o gravador pedem o microfone em paralelo: o reconhecimento do navegador está em escuta contínua e o `MediaRecorder` é aberto com um segundo `getUserMedia`. No Edge/Chrome isto costuma resultar em o gravador não arrancar (ou arrancar sem áudio útil), enquanto o reconhecimento continua a mostrar tudo o que é dito na barra de comandos. Hoje nada disto é visível: o comando mostra logo "A gravar…" mesmo quando o gravador falha.

Primeiro passo da implementação: reproduzir no browser com o modo mãos livres ligado e confirmar se o `MediaRecorder` chega mesmo ao estado "recording" e se produz áudio.

## O que vai ser feito

1. **Comando honesto**: "App, iniciar gravação" passa a esperar pelo arranque real do gravador. Só mostra "A gravar…" quando o gravador está mesmo activo; se falhar, mostra o motivo em vez de uma mensagem de sucesso falsa.
2. **Um único microfone**: o gravador passa a ser a origem do áudio durante a gravação. O reconhecimento de comandos é suspenso enquanto se grava e retomado ao parar, evitando o conflito de microfone.
3. **Parar por voz continua a funcionar**: durante a gravação fica activa uma escuta mínima só para "App, parar" / "App, terminar", que é desligada assim que a gravação termina (retomando os comandos completos).
4. **Estado visível**: a barra de comandos mostra claramente "A gravar — diga 'App, parar'" enquanto grava, para o médico perceber onde está o áudio.
5. **Texto na amostra certa**: confirmar que a transcrição resultante entra sempre na amostra activa no momento em que a gravação começou, mesmo que a amostra activa mude entretanto.

## Notas técnicas

- `src/components/recorder-panel.tsx`: `iniciar()`/`parar()` expostos por ref passam a devolver `Promise<boolean>` com o resultado real do arranque; erros de `getUserMedia` propagam mensagem.
- `src/hooks/use-reconhecimento-voz.ts`: acrescentar uma pausa/retoma controlada (`suspenso`) sem destruir o hook, para libertar o microfone durante a gravação.
- `src/routes/_authenticated/app.tsx`: o caso `iniciar-gravacao` aguarda o arranque, suspende os comandos e guarda o id da amostra alvo; `parar-gravacao` retoma a escuta.
- `src/components/barra-comandos-voz.tsx`: novo estado visual de gravação (apenas apresentação).

Sem alterações à base de dados, à transcrição por IA nem à exportação Word.
