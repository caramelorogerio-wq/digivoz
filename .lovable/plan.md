# Quadro de introdução: número da análise + leitura de código

## O que muda

O painel "Doentes" (seleção de doente, nome, n.º de processo, botão adicionar) é substituído por um painel simples **"Análise"** com:

- Um campo único: **N.º da análise**
- Um botão **"Ler código"** que abre a câmara e lê código de barras ou QR code, preenchendo automaticamente o campo
- O número lido/escrito passa a ser o **título do relatório** (o campo "Título" separado deixa de ser necessário)

Tudo o resto — gravação, transcrição, otimização com IA, resumo técnico, vocabulário aprendido, exportação .txt — fica igual.

## Comportamento

- Ao ler um código, o valor é colocado no campo e mostra-se uma confirmação; a câmara fecha automaticamente.
- Se o navegador não der acesso à câmara, o campo continua editável manualmente e é mostrada a razão da falha (permissão, sem câmara, contexto não seguro).
- Ao guardar, o relatório fica com o título = n.º da análise. Sem número, usa-se a data como antes.
- Na lista de relatórios guardados, o número da análise aparece como título de cada item (já é o caso).

## Detalhes técnicos

- Adicionar `@zxing/browser` (leitura de QR + códigos de barras 1D via `BrowserMultiFormatReader`), carregado dinamicamente só no cliente para não quebrar o SSR.
- Novo componente `src/components/leitor-codigo.tsx`: campo de texto + botão que monta um `<video>` num diálogo, faz `decodeFromVideoDevice` com `facingMode: environment`, e para o stream ao fechar/ler.
- Em `src/routes/_authenticated/app.tsx`:
  - remover estados e UI de `pacientes`, `pacienteId`, `novoPaciente`, `novoProcesso`, `criarPaciente` e a query a `pacientes`;
  - substituir o estado `titulo` por `numeroAnalise` (usado como `titulo` no insert, `paciente_id` fica sempre `null`);
  - `abrirRelatorio` passa a preencher `numeroAnalise` a partir do título;
  - exportação .txt usa o número da análise como nome do ficheiro.
- Sem alterações à base de dados: as tabelas `pacientes` e a coluna `paciente_id` mantêm-se intactas, apenas deixam de ser usadas nesta interface.
