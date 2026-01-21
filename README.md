# GradeUFLA — Montador de Grade Horária (Frontend)

Descrição rápida

GradeUFLA é a interface frontend (React) de um montador de grade horária para cursos da UFLA. O projeto é implementado com Create React App e usa dados locais (CSV) para popular cursos, matrizes, disciplinas e horários.

Status atual

- Frontend em React (sem backend nesta versão; dados são carregados por CSVs no diretório `data/`).
- Drag & drop para montar a grade, ver conflitos de horário, exportação para .ics (Google Calendar).

Pré-requisitos

- Node.js (versão LTS recomendada) e npm instalados.
- Windows / macOS / Linux — comandos apresentados usam PowerShell/Bash conforme apropriado.

Instalação

1. Instale dependências:

```bash
npm install
```

2. Inicie em modo desenvolvimento:

```bash
npm start
```

A aplicação abrirá em `http://localhost:3000` por padrão.

Scripts úteis

- `npm start` — servidor de desenvolvimento com hot-reload.
- `npm run build` — gera versão otimizada em `build/`.
- `npm test` — roda testes (se houver).
- `npm run eject` — ejetar configurações CRA (não recomendado sem necessidade).

Estrutura principal do projeto

- `public/` — arquivos estáticos (index.html, manifest, favicon, logos).
- `src/` — código-fonte React
  - `components/` — componentes reutilizáveis (Calendar, CursoSelector, Stepper, etc.)
  - `data/` — loaders/CSV e utilitários para popular o app (ex: `csvLoader.js`, `cursos.js`, `materias.js` gerados a partir dos CSVs)
  - `App.jsx`, `index.js` — entrada da aplicação
  - `styles/` — CSS global
- `data/` (raiz) — CSVs de amostra usados para popular a aplicação em tempo de execução (ex: `courses.csv`, `subjects.csv`)

Dados (CSV)

A versão atual carrega dados locais via um `csvLoader` dentro de `src/data/`.
Arquivos CSV esperados (exemplo):

- `courses.csv` — cursos
- `matrizes.csv` — matrizes por curso (opcional)
- `subjects.csv` — disciplinas (código, nome, créditos, tipo, subgrupo, pré-requisitos, turmas/horários em JSON)

Formato mínimo (exemplo de colunas para `subjects.csv`):

- course_code (ex: G014)
- matrix (ex: 2023/01)
- semester (número)
- code (ex: GAC124)
- name
- credits
- type (obrigatoria|eletiva)
- subgroup (string)
- preRequisites (JSON array de códigos)
- turmas (JSON array: cada turma com id, horarios: [{ dia, inicio, fim, anp? }])

Observação: existem loaders no diretório `src/data` para transformar os CSVs em estruturas usadas pelo app. Mantenha o JSON nas colunas `turmas` e `preRequisitos` bem formatados.

Build / Deploy (Netlify)

- Para deploy manual: gere o build com `npm run build` e faça drag & drop da pasta `build/` no painel do Netlify.
- Nota importante: Netlify define `CI=true`, e Create React App trata warnings do ESLint como erros na build. Se o build falhar na Netlify com mensagens de lint (ex: `no-unused-vars`), corrija os arquivos apontados ou defina a variável de ambiente `CI=false` (não recomendado). Recomendação: corrija os avisos de lint antes do deploy.

Problemas comuns e debug rápido

- App não inicia / erro de compilação:
  - Verifique mensagens no terminal; arquivos com `SyntaxError` costumam indicar erro de sintaxe JS/JSX (vírgula, parênteses, chaves sobrando).
  - Use `npm start` e abra o devtools/console para ver erros em runtime.

- Dados CSV não sendo carregados:
  - Confirme que os arquivos CSV existem em `data/` (raiz) e que as colunas JSON estão escapadas corretamente.
  - Cheque `src/data/csvLoader.js` para ver os nomes esperados das colunas.

- ESLint warnings travando build no Netlify:
  - Corrija variáveis não utilizadas ou comente com `// eslint-disable-next-line no-unused-vars` quando intencional.

Funcionalidades importantes (onde estão)

- `src/components/Calendar/` — componente principal da grade horária, drag/drop, preview, export .ics.
- `src/components/CursoSelector/` — seleção de curso e matriz.
- `src/components/Stepper/` — assistente de configuração (wizard de seleção de curso/matriz/semestre).
- `src/data/` — loaders e modelos de dados (ponto central para ajustar entrada CSV).

Contribuindo / fluxo de trabalho Git

- Branches: use `feat/`, `fix/`, `hotfix/` conforme convenções.
- Commits: siga o padrão `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.

Exportação de calendário

- O app oferece um botão para gerar um arquivo `.ics` com os horários do calendário. O arquivo é baixado e a página de import do Google Calendar é aberta para que o usuário importe manualmente.

Próximos passos recomendados

- Padronizar os CSVs de entrada e adicionar scripts de validação para garantir dados consistentes.
- Adicionar testes unitários para as transformações de dados (`src/data/*`).
- Refatorar alguns componentes grandes (Calendar, SetupWizard) em unidades menores para facilitar testes.

Contato / repositório remoto

- Repositório recomendado: `git@github.com:oF0kus/GradeUFLA.git` (ver README original para remote atual).

---

Se quiser, eu posso:
- Validar e adaptar os `csv` de amostra para um formato definitivo (gerar templates CSV). 
- Corrigir warns/lints que impedem o build no Netlify.
- Fazer um README em inglês também.

Diga qual desses itens deseja agora que eu execute.
