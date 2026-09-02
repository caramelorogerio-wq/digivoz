# Correcção do layout do resumo técnico

## Observação confirmada no código

- No componente `src/components/resumo-tecnico.tsx`, os campos **N.º de fragmentos** e **N.º de blocos** estão sempre numa grelha de 2 colunas (`grid grid-cols-2`).
- Na exportação Word (`src/lib/relatorio-docx.ts`), a função `tabelaResumo()` também coloca estes dois campos lado a lado numa mesma linha da tabela.

## Interpretação da tua mensagem

Parece-me que estás a referir-te ao **documento Word exportado**: quando há várias amostras, o número dos blocos (que agora é um intervalo contínuo, ex. "4 a 5") fica na mesma linha do número de fragmentos, e isso só te parece correcto quando o relatório tem apenas uma amostra.

## Plano de correcção

1. **Manter o layout lado-a-lado para relatórios de amostra única** — continua a fazer sentido e ocupa menos espaço.
2. **Empilhar os campos verticalmente no resumo técnico de cada amostra quando o relatório tem várias amostras** — cada campo (fragmentos, blocos, seccionado, inclusão) fica numa linha própria, dando mais destaque ao intervalo contínuo de blocos.
3. **Aplicar a mesma lógica ao componente UI `ResumoTecnico` em modo compacto** (usado nas amostras dentro de `ListaAmostras`), para a interface espelhar o documento exportado.

## Pergunta de confirmação

Queres que eu corrija:
- **A)** O documento Word exportado.
- **B)** A interface na app (o quadro cinzento dentro de cada amostra).
- **C)** Ambos.

Assim que confirmares, implemento a alteração apenas no(s) ficheiro(s) necessário(s).
