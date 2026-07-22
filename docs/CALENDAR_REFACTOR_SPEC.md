# Spec de continuidade — refatoração do Calendar

## Objetivo

Continuar a refatoração do `Calendar.jsx` sem alterar aparência, regras acadêmicas ou comportamento de desktop/mobile. O componente tinha 2021 linhas e atualmente possui 1418. A meta é deixá-lo como componente de composição, idealmente entre 400 e 600 linhas.

Repositório:

```text
/home/fernandoscarabeli/Área de trabalho/Faculdade/GradeUFLA/frontend-web
```

O scraper fica em outro projeto (`dadosMVP`) e não faz parte desta refatoração. Não editar nem executar o bot durante este trabalho.

## Estado atual

Já foram extraídos:

- `src/components/Calendar/CalendarBoard.jsx`: título, tabela, popup das turmas, legenda e rodapé.
- `src/components/Calendar/SubjectCard.jsx`: cartão de disciplina e apresentação de pré-requisitos.
- `src/components/Calendar/PrerequisiteModal.jsx`: confirmação de pré-requisitos.
- `src/components/Calendar/useCalendarExport.js`: geração e download do PNG.
- `src/components/Calendar/calendarUtils.js`: dias, horários, cores, créditos e espaços ANP.

Testes adicionados:

- `src/components/Calendar/CalendarBoard.test.jsx`
- `src/components/Calendar/calendarUtils.test.js`
- `src/domain/gradeRules.test.js`

Última validação antes da troca final do CSV:

- 9 testes passando.
- ESLint passando.
- Build de produção passando.
- Apenas o aviso conhecido de `caniuse-lite/Browserslist` desatualizado.

O novo `public/data/subjects.csv` foi colocado pelo usuário depois da execução do scraper. Ele é uma alteração legítima do usuário e não deve ser revertido ou reformatado.

## Correções funcionais já implementadas

Estas regras não podem regredir durante a refatoração:

1. Correquisitos do mesmo módulo não são ignorados.
2. É permitido adicionar a primeira disciplina de um par de correquisitos provisoriamente.
3. O download do PNG é bloqueado enquanto houver correquisito pendente.
4. Correquisito é considerado satisfeito se estiver aprovado, confirmado como já cursado ou presente na grade.
5. Turma normal sem horário não pode ser selecionada e aparece como `Horário não informado`.
6. Turma ANP sem horário continua válida.
7. Trocar a turma da mesma disciplina não soma os créditos duas vezes.
8. Turmas ANP híbridas respeitam conflitos nos horários presenciais.
9. Remover pelo modal usa a mesma cascata de correquisitos que a remoção pelo calendário.
10. Disciplina sem turmas mostra zero turmas.
11. O título é `Minha Grade`.
12. O rodapé usa o rótulo `Período letivo 2026/1`, e não `Matriz 2026/1`.

## Exportação do PNG

O exportador atual foi testado em Chromium real com viewport desktop `1440x1000` e móvel `390x844`.

Comportamento obrigatório:

- Capturar uma cópia invisível da grade; nunca redimensionar o DOM visível.
- Produzir o mesmo layout no desktop e no celular.
- Usar altura dinâmica, sem corte ou espaço vazio fixo.
- Gerar até 2400 pixels de largura (`scale` máximo 2).
- Respeitar o limite de 16 milhões de pixels para evitar estouro de memória móvel.
- Ocultar controles de interação na imagem.
- Impedir exportações simultâneas.
- Sempre remover o host temporário e revogar o `ObjectURL`.

Não devolver a implementação antiga que forçava uma imagem fixa de `1600x2338` e alterava o calendário visível.

## Trabalho restante

### 1. Extrair a barra lateral

Criar `CalendarSidebar.jsx` para conter:

- Cabeçalho e total de créditos.
- Instruções desktop/mobile.
- Filtro de dia, horário, ANP e créditos.
- Lista de obrigatórias.
- Lista de pendentes.
- Busca e agrupamento de eletivas.
- Busca e agrupamento de matérias futuras.

Preferência arquitetural:

- Mover para a sidebar os estados exclusivamente visuais: `mostrarEletivas`, `eletivasQuery`, `mostrarFuturas`, `futurasQuery` e `filtroHorario`.
- Extrair a função de filtragem para uma função pura testável ou mantê-la privada na sidebar.
- Manter todas as classes CSS atuais para evitar mudança visual.
- Continuar usando `SubjectCard` para renderizar cada disciplina.

### 2. Extrair o sistema de arraste

Criar `useCalendarDrag.js`. Esse é o trecho de maior risco e deve ser feito somente depois de criar testes mínimos das regras usadas pelo arraste.

O hook deve concentrar:

- `draggingMateria`
- `dragPosition`
- `isDragging`
- `selectedTurmaIndex`
- `draggingFromCalendar`
- listeners globais de mouse e touch
- início do arraste pela sidebar
- início do arraste pela grade
- hover das células
- resolução da turma pela célula
- preview das turmas
- soltura, realocação e remoção
- limpeza do estado do arraste

Entradas esperadas do hook:

- matérias disponíveis e matérias na grade
- aprovadas e pré-requisitos confirmados
- callbacks `onAddMateria` e `onRemoveMateria`
- limite de créditos
- função de toast
- referência da tabela

Saídas esperadas:

- estados necessários para renderização do ghost/popup/preview
- handlers usados pelo `Calendar`, `CalendarBoard` e `SubjectCard`
- funções de consulta das células e conflitos

Não alterar silenciosamente a semântica do drag-and-drop durante a extração.

### 3. Centralizar conflitos em uma etapa posterior

Existem verificações de horário parecidas em:

- `src/App.jsx`
- `src/components/Calendar/Calendar.jsx`
- `src/components/Modal/MateriaModal.jsx`

O ideal futuro é uma regra pura compartilhada, mas não misturar essa mudança com a extração mecânica do hook. Primeiro preservar comportamento; depois centralizar com testes específicos.

### 4. Componente final

Ao terminar, `Calendar.jsx` deve principalmente:

- receber propriedades;
- compor `CalendarSidebar`, `CalendarBoard`, ghost e modal;
- conectar hooks e callbacks;
- não conter centenas de linhas de JSX ou regras duplicadas.

## Critérios de aceitação

- `Calendar.jsx` preferencialmente com no máximo 600 linhas.
- Nenhuma mudança visual intencional.
- Desktop e mobile continuam funcionais.
- Adicionar, trocar e remover turmas funciona.
- Arrastar da sidebar para a grade funciona.
- Arrastar da grade para a sidebar remove.
- Conflitos e limite de 32 créditos continuam bloqueando corretamente.
- ANP e ANP híbrida continuam funcionando.
- Correquisitos continuam com inclusão provisória e bloqueio no download.
- PNG continua com qualidade alta e sem piscar a tela.
- Nenhuma alteração no scraper.

## Testes que ainda devem ser adicionados

- `SubjectCard`: pré-requisito forte bloqueia.
- `SubjectCard`: correquisito pendente avisa, mas não bloqueia a inclusão.
- Filtro: dia/hora, ANP e créditos.
- Drag: seleção da turma correspondente à célula.
- Drag: conflito impede inclusão.
- Drag: remoção ao soltar na sidebar.
- Drag: troca de turma não duplica créditos.

## Comandos de validação

O projeto não possui script `npm run lint`. Usar o executável local:

```bash
cd "/home/fernandoscarabeli/Área de trabalho/Faculdade/GradeUFLA/frontend-web"
npm test -- --watchAll=false
./node_modules/.bin/eslint src
npm run build
```

Também executar:

```bash
git diff --check -- src
git status --short
```

Não apagar nem reverter alterações não relacionadas. Em especial, preservar `public/data/subjects.csv`.

## Validação do CSV novo

Antes de considerar a versão pronta para publicação:

1. Abrir Sistemas de Informação, matriz 2023, eletivas.
2. Confirmar que DevOps não oferece horários no período letivo `2026/1`.
3. Conferir algumas disciplinas que realmente existem em `2026/1`.
4. Testar uma disciplina de outro curso quando ela fizer parte das opções permitidas ao aluno.
5. Atualizar a data/hora fixa do rodapé para a data real da coleta.
6. Fazer recarregamento forçado no navegador para evitar CSV antigo em cache.

## Observações para o próximo chat

- Começar lendo esta spec e o `git diff`; não refazer o que já foi extraído.
- O worktree está intencionalmente sujo e contém mudanças do usuário.
- Não usar `git reset`, `git checkout --` ou qualquer comando destrutivo.
- Trabalhar em etapas pequenas e rodar testes após cada extração.
- Não fazer redesign nesta tarefa.
