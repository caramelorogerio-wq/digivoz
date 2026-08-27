# Sanitizar o nome do ficheiro Word exportado

## Problema

Ao exportar para Word, o nome do ficheiro não fica com o título da análise. O código atual em `src/routes/_authenticated/app.tsx` (linha 587-589) faz:

```js
a.download = `${numeroAnalise.trim() || "relatorio"}.docx`;
```

Se o número da análise contiver caracteres inválidos para nomes de ficheiro — o mais comum é `/` (ex.: `24/12345`, típico em números de análises laboratoriais) — o browser interpreta o `/` como separador de caminho e o nome do ficheiro fica truncado ou incorreto.

## Solução

Sanitizar `numeroAnalise` antes de o usar como nome de ficheiro, substituindo os caracteres inválidos (`/ \ : * ? " < > |`) por `_` (sublinhado).

### Alteração concreta

Em `src/routes/_authenticated/app.tsx`, dentro de `exportar`, substituir:

```js
a.download = `${
  numeroAnalise.trim() || "relatorio"
}.docx`;
```

por:

```js
const nome = (numeroAnalise.trim() || "relatorio")
  .replace(/[/\\:*?"<>|]/g, "_");
a.download = `${nome}.docx`;
```

Não há outras alterações — a UI, os templates, o conteúdo do documento e o restante comportamento mantêm-se idênticos.
