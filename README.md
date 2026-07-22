# GradeUFLA — Montador de Grade Horária

Frontend do GradeUFLA para selecionar curso, matriz e semestre, revisar o histórico acadêmico e montar uma grade sem conflitos de horário. A aplicação funciona sem backend: cursos, disciplinas, pré-requisitos e turmas são carregados de CSVs versionados no próprio deploy.

## Funcionalidades

- fluxo guiado de curso, matriz e semestre;
- histórico de disciplinas aprovadas;
- montagem por drag and drop no desktop e por modal no mobile;
- validação de pré-requisitos, correquisitos, conflitos, ANP e limite de 32 créditos;
- filtros por dia, horário, modalidade e créditos;
- exportação da grade em PNG;
- navegação por teclado, dialogs acessíveis e suporte a reduced motion.

## Requisitos

- Node.js `20.19.0` ou superior dentro da linha 20, ou Node `22.12.0+`;
- npm compatível com a versão instalada do Node.

O projeto usa React 19, Vite 8, Vitest 4 e Playwright.

## Desenvolvimento

```bash
npm ci
npm start
```

O servidor abre em `http://127.0.0.1:3000`.

Scripts disponíveis:

```bash
npm start          # servidor Vite
npm run build      # build de produção em dist/
npm run preview    # serve o build localmente
npm run lint       # ESLint
npm test           # Vitest em watch mode
npm run test:ci    # Vitest em execução única
npm run e2e        # Playwright desktop e mobile
npm run e2e:install
```

## Dados acadêmicos

Os arquivos consumidos em produção ficam em:

```text
public/data/courses.csv
public/data/subjects.csv
```

### `courses.csv`

Colunas obrigatórias:

| Coluna | Descrição | Exemplo |
| --- | --- | --- |
| `curso_id` | Identificador do curso | `G014` |
| `nome` | Nome do curso | `Sistemas de Informação` |
| `matriz` | Ano e período da matriz | `2023/01` |

O mesmo curso pode aparecer uma vez para cada matriz disponível.

### `subjects.csv`

Colunas principais:

| Coluna | Descrição |
| --- | --- |
| `curso` | Identificador correspondente ao curso |
| `matriz` | Matriz curricular |
| `semestre` | Módulo recomendado |
| `codigo` | Código único da disciplina |
| `nome` | Nome da disciplina |
| `creditos` | Quantidade de créditos |
| `tipo` | `obrigatoria` ou `eletiva` |
| `subgrupo` | Agrupamento opcional de eletivas |
| `preRequisitos` | Texto com grupos `Forte`, `Minimo` e `Co-requisito` |
| `turmas` | Array JSON com `id`, `horarios` e flag `anp` |

Exemplo simplificado de `turmas`:

```json
[
  {
    "id": "A",
    "horarios": [{ "dia": 2, "inicio": 8, "fim": 10 }],
    "anp": false
  }
]
```

O loader rejeita respostas HTTP inválidas, erros do PapaParse, campos obrigatórios ausentes e JSON inválido em `turmas`.

## Versão dos dados

As configurações públicas estão documentadas em `.env.example`:

```text
VITE_CSV_VERSION=2026-07-18
VITE_DATA_UPDATED_AT="22/07/26 - 11:00"
VITE_ACADEMIC_TERM=2026/1
```

Ao publicar um CSV novo:

1. substitua somente o arquivo correspondente em `public/data`;
2. atualize `VITE_CSV_VERSION` para invalidar caches antigos;
3. atualize `VITE_DATA_UPDATED_AT` e, quando necessário, `VITE_ACADEMIC_TERM`;
4. execute os testes e faça um recarregamento forçado no navegador.

Variáveis prefixadas com `VITE_` são públicas e não devem conter segredos.

## Validação

```bash
npm run lint
npm run test:ci
npm run build
npm run e2e
npm audit
```

A cobertura inclui regras acadêmicas, carregamento e retry dos CSVs, fluxo completo do App, dialogs, drag, exportação PNG e E2E em Chromium desktop `1440x1000` e mobile `390x844`.

## Deploy no Netlify

O arquivo `netlify.toml` configura:

- comando `npm run build`;
- publicação do diretório `dist`;
- fallback de SPA para `index.html`;
- headers de segurança;
- cache longo para assets com hash e cache controlado para CSVs.

O deploy não depende de `CI=false`. Pull requests e pushes na `main` também executam lint, Vitest, build e Playwright por GitHub Actions.

## Estrutura

```text
src/App.jsx                 fluxo e estado principal
src/components/             interface e interações
src/data/                   carregamento e indexação dos CSVs
src/domain/gradeRules.js    fonte única das regras acadêmicas
src/hooks/                  hooks compartilhados
e2e/                       testes Playwright e fixtures
public/data/                dados acadêmicos publicados
docs/                       especificações e plano de revisão
```

O scraper pertence a outro projeto e não deve ser executado a partir deste repositório.
