# Melhorias possíveis na DermaVoz

A app está funcionalmente completa e alinhada com o teu fluxo clínico. Abaixo estão melhorias opcionais que podem aumentar a segurança, a velocidade ou a conveniência no dia-a-dia, sem alterar o fluxo de ditado actual.

## Opções de melhoria (escolhe as que quiseres)

### 1. Pesquisa e organização dos relatórios guardados
**Problema:** Já tens 96 relatórios. A lista actual é linear e pode tornar-se difícil de navegar à medida que cresce.
**Melhoria:** Adicionar uma caixa de pesquisa por título/número de análise, ordenação (mais recente / mais antigo) e paginação ou "carregar mais".

### 2. Rascunho local com auto-guardar
**Problema:** Se o browser fechar ou a rede falhar antes de clicares "Guardar relatório", perdes o texto ditado.
**Melhoria:** Guardar o estado actual (amostras, número da análise, resumo técnico) automaticamente no `localStorage` a cada poucos segundos, e recuperá-lo ao abrir a app.

### 3. Desfazer após otimização com IA
**Problema:** O botão "Otimizar Relatório com IA" substitui o texto original. Se o resultado não for o esperado, não há forma rápida de voltar atrás.
**Melhoria:** Guardar uma cópia do texto antes de otimizar e mostrar um botão "Desfazer otimização" durante essa sessão.

### 4. Atalhos de teclado para acções frequentes
**Problema:** Algumas acções só são acessíveis por clique ou por voz.
**Melhoria:** Adicionar atalhos como `Ctrl/Cmd + S` para guardar, `Ctrl/Cmd + E` para exportar Word, `Ctrl/Cmd + Shift + N` para nova amostra, e mostrá-los num pequeno modal de ajuda.

### 5. Confirmação antes de apagar um relatório
**Problema:** O ícone do caixote apaga o relatório imediatamente sem confirmação.
**Melhoria:** Adicionar um `alert-dialog` de confirmação antes de eliminar.

### 6. Pré-visualização simples do documento Word
**Problema:** Só sabes como ficou o documento depois de o exportar e abrir.
**Melhoria:** Mostrar um modal com uma pré-visualização em texto simples do cabeçalho, amostras e resumo técnico antes de descarregar.

### 7. Duplicar amostra ou relatório
**Problema:** Quando várias amostras partilham o mesmo resumo técnico ou texto base, é trabalhoso copiar manualmente.
**Melhoria:** Adicionar um botão "Duplicar amostra" e, na lista de relatórios, uma opção "Duplicar relatório".

### 8. Estatísticas simples no painel
**Problema:** Não há visibilidade sobre volume de trabalho.
**Melhoria:** Mostrar pequenos números no topo: relatórios esta semana, total de palavras ditadas, amostras médias por relatório.

### 9. Melhorias de layout em mobile
**Problema:** A vista actual usa duas colunas (`lg:grid-cols-[380px_1fr]`). Em ecrãs pequenos empilha tudo, mas a coluna da esquerda fica muito longa antes de chegar às amostras.
**Melhoria:** Em mobile, colapsar a coluna da esquerda num acordeão ou separadores, colocando as amostras e acções no topo.

## Recomendação inicial

Se quiseres começar por algo pequeno e de alto impacto, sugiro as opções **1 (pesquisa)**, **2 (rascunho local)** e **5 (confirmação ao apagar)**, porque resolvem fricção real sem mudar o comportamento do ditado.

Diz-me quais destas opções te interessam, ou se preferes que eu explore outra direcção (por exemplo, integração com outro sistema, mais comandos de voz, ou estatísticas mais detalhadas).
