# Plano de ataque — review completo do frontend

## Objetivo

Este documento transforma o review técnico do frontend em um plano de execução ordenado.

O objetivo é aumentar a confiabilidade, acessibilidade, desempenho, segurança e manutenibilidade sem alterar silenciosamente as regras acadêmicas nem redesenhar a interface.

Repositório:

```text
/home/fernandoscarabeli/Área de trabalho/Faculdade/GradeUFLA/frontend-web
```

O scraper não faz parte deste plano. Não editar nem executar o scraper durante essas etapas. O arquivo `public/data/subjects.csv` é uma alteração legítima do usuário e deve ser preservado.

## Baseline inicial

Estado verificado em 21/07/2026:

- Build de produção compilando.
- ESLint passando.
- 18 testes passando.
- `Calendar.jsx` reduzido para componente de composição.
- Sidebar, board, exportador, cards, modal de pré-requisitos e drag extraídos.
- CSV principal com aproximadamente 6,3 MB e 16 mil linhas.
- Bundle principal JavaScript com aproximadamente 149 KB gzip.
- CSS com aproximadamente 222 KB gzip, principalmente por importar todo o Flaticon.
- `npm audit --omit=dev` reportando 49 vulnerabilidades: 2 críticas, 21 altas, 16 moderadas e 10 baixas. A maior parte está na cadeia de desenvolvimento do `react-scripts`, não no JavaScript estático entregue ao navegador.

## Status de execução

Atualizado em 22/07/2026.

Neste documento, `Concluído` indica implementação finalizada com testes automatizados, ESLint e build aprovados. As validações manuais e auditorias especializadas pendentes são registradas separadamente.

### Concluído

- FE-01 e FE-02: carga singleton dos CSVs, cache busting, validação, estados explícitos, erro visível e retry.
- FE-03: finalização idempotente do drag, incluindo bubbling e cancelamento por touch.
- FE-04: confirmações de pré-requisito mínimo persistidas pelo histórico.
- FE-05: filtros com somente início, somente fim, sobreposição completa e intervalo inválido.
- FE-06: dropdown substituído por combobox válido, sem elementos interativos aninhados e com navegação por teclado.
- FE-07: dialogs com semântica, foco inicial, focus trap, Escape e retorno do foco; stepper, tabela e botões de ícone também corrigidos.
- FE-08: regras de dias, horas, conflitos, ANP, seleção e créditos centralizadas no domínio e adotadas pelo App, modal e drag.
- FE-09: fluxos integrados do App e E2E em Chromium desktop/mobile, incluindo CSV real, teclado, modal, ANP, conflitos, créditos e PNG.
- FE-10 a FE-13: ocupação indexada, ghost sem render por pixel, busca de nomes em `Map`, componentes memorizados, animações pausáveis/reduced motion e CSS seletivo de ícones.
- FE-14: CRA substituído por Vite/Vitest, dependências separadas e dependências diretas sem uso removidas.
- FE-15: README, metadados acadêmicos, Netlify e pipeline do GitHub Actions atualizados.

### Cobertura atual

- 19 arquivos e 56 testes Vitest passando.
- 11 cenários Playwright passando: 6 em Chromium desktop `1440x1000` e 5 em Chromium mobile `390x844`; o cenário de drag é ignorado no mobile por projeto.
- Build Vite de produção compilando, com JavaScript principal de 145,90 KB gzip e CSS de 8,96 KB gzip.
- ESLint passando.
- `npm audit` e `npm audit --omit=dev` reportando 0 vulnerabilidades.
- Pipeline versionado com lint, Vitest, build e Playwright.
- Validação manual completa com zoom de 200% e leitor de tela continua pendente; reduced motion está coberto em navegador real pelo Playwright.

### Próximo passo

**Validação externa e manual.** Após o push, acompanhar a primeira execução do GitHub Actions e o deploy no Netlify; concluir também a verificação manual com zoom de 200% e leitor de tela.

## Fórmula de ataque

Toda correção deve seguir este ciclo:

1. Reproduzir ou demonstrar o problema atual.
2. Criar um teste que falhe pelo motivo correto.
3. Fazer a menor correção capaz de resolver o problema.
4. Rodar os testes diretamente relacionados.
5. Rodar a suíte completa, ESLint e build.
6. Fazer validação manual em desktop e mobile quando houver mudança de interação.
7. Registrar no PR o comportamento anterior, o novo comportamento e os riscos.

Regra prática:

```text
Evidência -> teste vermelho -> correção pequena -> teste verde -> validação integrada
```

Não misturar em um mesmo PR:

- correção funcional e redesign;
- migração de toolchain e alteração de regras acadêmicas;
- otimização de desempenho e mudança visual extensa;
- atualização do CSV e refatoração do loader.

## Prioridades

### P0 — confiabilidade funcional

Problemas capazes de gerar comportamento incorreto, operação duplicada ou fluxo quebrado. Devem ser resolvidos antes de otimizações e migrações.

### P1 — acessibilidade, arquitetura e cobertura

Problemas que dificultam o uso, aumentam o risco de regressão ou impedem evolução segura.

### P2 — desempenho, dependências e operação

Melhorias importantes para produção, mas que devem ser feitas sobre uma base funcional estabilizada.

## Matriz dos problemas

| ID | Prioridade | Status | Problema | Impacto principal |
| --- | --- | --- | --- | --- |
| FE-01 | P0 | Concluído | CSV carregado e processado repetidamente | Lentidão, memória e condições de corrida |
| FE-02 | P0 | Concluído | Falha do CSV é escondida | Wizard vazio sem explicação ou retry |
| FE-03 | P0 | Concluído | Drop pode ser finalizado por dois listeners | Inclusão, remoção ou toast duplicado |
| FE-04 | P0 | Concluído | Confirmação mínima do histórico não é persistida | Pré-requisito volta a bloquear depois |
| FE-05 | P0 | Concluído | Filtro ignora hora inicial ou final isolada | Resultado diferente do filtro exibido |
| FE-06 | P1 | Concluído | Input dentro de button nos dropdowns | HTML inválido e falhas de teclado |
| FE-07 | P1 | Concluído | Modais sem gestão de foco e semântica | Barreiras para teclado e leitor de tela |
| FE-08 | P1 | Concluído | Regras de conflito/ANP duplicadas | Divergência e regressão futura |
| FE-09 | P1 | Concluído | Cobertura concentrada no Calendar | Fluxos centrais sem proteção |
| FE-10 | P2 | Concluído | Drag recalcula a árvore inteira a cada movimento | Travamento em dispositivos modestos |
| FE-11 | P2 | Concluído | Busca de nomes percorre todo o dataset | Custo repetido para cards e modais |
| FE-12 | P2 | Concluído | Flaticon completo no CSS | CSS de aproximadamente 1,2 MB bruto |
| FE-13 | P2 | Concluído | Animações ignoram reduced motion | Acessibilidade e consumo de bateria |
| FE-14 | P2 | Concluído | Toolchain com vulnerabilidades | Risco no ambiente de desenvolvimento/build |
| FE-15 | P2 | Concluído | README e deploy desatualizados | Operação e onboarding incorretos |

## Etapa 1 — estabilizar o carregamento dos dados [CONCLUÍDA]

### Problema

O carregamento do CSV é iniciado:

- automaticamente na importação de `src/data/index.js`;
- no clique inicial em `App.jsx`;
- ao montar `SetupWizard.jsx`.

`ensureCsvLoaded` cria uma nova operação a cada chamada. O CSV grande pode ser buscado do cache HTTP, mas ainda é lido, parseado e indexado novamente.

Erros são capturados e transformados em `null`. O fluxo continua e mostra seletores vazios.

### Ataque

1. Criar testes para chamadas concorrentes de `ensureCsvLoaded`.
2. Criar uma `Promise` singleton para o carregamento.
3. Guardar estado explícito: `idle`, `loading`, `success` e `error`.
4. Fazer todas as chamadas receberem a mesma `Promise` enquanto estiver carregando.
5. Retornar os dados já carregados sem novo parse.
6. Não esconder exceções do fluxo de UI.
7. Mostrar erro, botão de tentar novamente e estado de carregamento no início/wizard.
8. Impedir cliques repetidos enquanto o carregamento estiver ativo.
9. Adicionar estratégia de versão/cache para `subjects.csv`.

### Critérios de aceite

- Três chamadas concorrentes resultam em um único fetch e um único parse.
- Chamadas posteriores reutilizam os dados carregados.
- Falha de rede ou CSV inválido apresenta mensagem clara.
- O usuário consegue tentar novamente.
- O wizard nunca mostra dropdown vazio como se fosse um estado válido.
- Erros do PapaParse são inspecionados e linhas inválidas não são aceitas silenciosamente.

## Etapa 2 — tornar o drag idempotente [CONCLUÍDA]

### Problema

O encerramento do drag pode ser chamado pelo `onMouseUp` do `Calendar` e pelo listener global registrado em `document`. O mesmo evento pode executar o drop duas vezes antes que a limpeza de estado e listeners seja concluída.

### Ataque

1. Criar um teste de integração montando um componente real com o hook.
2. Disparar um `mouseup` DOM que percorra o bubbling normal.
3. Confirmar que o callback atual pode ser chamado mais de uma vez.
4. Escolher um único proprietário para a finalização do drag ou usar uma trava por `ref`.
5. Fazer `resetDrag` idempotente.
6. Cobrir mouse, touchend, touchcancel e mouseleave.

### Critérios de aceite

- Cada gesto chama no máximo um `onAddMateria` ou um `onRemoveMateria`.
- Remoção em cascata gera apenas uma sequência de toasts.
- Soltar fora das áreas mantém a matéria original.
- Troca de turma continua sem duplicar créditos.
- Todos os listeners globais são removidos ao finalizar ou desmontar.

## Etapa 3 — corrigir histórico e filtros [CONCLUÍDA]

### FE-04: confirmação mínima

O App envia `onConfirmMinimo` para `Historico`, mas o componente não recebe nem chama o callback depois do `window.confirm`.

Ataque:

1. Criar teste para uma disciplina com pré-requisito mínimo pendente.
2. Confirmar a pergunta.
3. Exigir que cada código confirmado seja persistido por `onConfirmMinimo`.
4. Preferir substituir `window.confirm` pelo modal acessível criado na etapa de acessibilidade.

### FE-05: filtro parcial de horas

Atualmente o intervalo só é aplicado se início e fim estiverem preenchidos.

Semântica recomendada:

- somente início: mostrar turmas que ainda estejam ocorrendo depois do início escolhido;
- somente fim: mostrar turmas que comecem antes do fim escolhido;
- ambos: mostrar qualquer sobreposição com o intervalo;
- intervalo inválido, com fim menor ou igual ao início: bloquear ou mostrar erro.

### Critérios de aceite

- Confirmações feitas no histórico continuam válidas no Calendar e no download.
- Filtro somente com início funciona.
- Filtro somente com fim funciona.
- Intervalo completo preserva a regra de sobreposição.
- ANP e créditos não regridem.

## Etapa 4 — acessibilidade estrutural [CONCLUÍDA]

### Dropdown

Substituir o input dentro do button por uma implementação de combobox válida.

Requisitos:

- `role="combobox"`;
- `aria-expanded`;
- `aria-controls`;
- lista com `role="listbox"`;
- itens com `role="option"`;
- `aria-activedescendant` ou foco controlado;
- setas, Enter, Escape, Home e End;
- label acessível;
- foco visível;
- nenhum elemento interativo dentro de outro elemento interativo.

### Modais

Aplicar ao `MateriaModal`, `PrerequisiteModal` e card Sobre:

- `role="dialog"`;
- `aria-modal="true"`;
- `aria-labelledby` e, quando necessário, `aria-describedby`;
- foco inicial previsível;
- foco preso dentro do modal;
- Escape fecha;
- foco volta ao elemento que abriu o modal;
- botão de fechar com nome acessível;
- impedir interação com o conteúdo ao fundo.

### Calendário e stepper

- Tornar indicadores clicáveis do stepper operáveis por teclado ou usar buttons.
- Adicionar `scope="col"` e `scope="row"` na tabela.
- Fornecer nomes acessíveis aos botões somente com ícone.
- Manter caminho por modal para adicionar, trocar e remover sem depender do drag.
- Revisar o texto de aproximadamente `0.5rem` nas células mobile.

### Critérios de aceite

- Fluxo completo utilizável apenas com teclado.
- Nenhum input dentro de button.
- Escape fecha dropdowns e modais.
- Foco não escapa do modal.
- Testes automatizados de teclado passam.
- Auditoria com axe não apresenta violações críticas ou sérias nas telas principais.

## Etapa 5 — centralizar regras acadêmicas [CONCLUÍDA]

### Problema tratado

Conflitos, normalização de dias, horas, ANP e limite de créditos estavam distribuídos entre `App.jsx`, `MateriaModal.jsx`, `calendarUtils.js` e `useCalendarDrag.js`.

### Execução

1. Semântica congelada com testes puros em `src/domain/gradeRules.test.js`.
2. Funções compartilhadas implementadas em `src/domain/gradeRules.js`.
3. `App.jsx`, `MateriaModal.jsx`, `Calendar.jsx` e `useCalendarDrag.js` migrados para o domínio.
4. `calendarUtils.js` passou a apenas reexportar/adaptar utilitários do domínio usados pela apresentação.
5. Exportação ganhou teste específico para o bloqueio por correquisito pendente.

API implementada:

```js
normalizarDia(valor)
normalizarHora(valor)
horariosConflitam(horarioA, horarioB)
verificarConflitoMateria(materia, grade, { ignorarCodigo })
calcularTotalCreditos(grade)
calcularTotalAposSelecao(grade, materia)
isTurmaSelecionavel(turma)
isAnpOnly(turma)
findNextAnpHour(grade, { ignorarCodigo })
```

Casos obrigatórios validados:

- [x] ANP sem horário é selecionável.
- [x] Turma normal sem horário não é selecionável.
- [x] ANP híbrida conflita nos encontros presenciais.
- [x] Troca da própria turma ignora a ocupação anterior.
- [x] Limite de 32 créditos não soma a mesma disciplina duas vezes.
- [x] Correquisito pode ser incluído provisoriamente.
- [x] Download permanece bloqueado enquanto o correquisito estiver pendente.
- [x] Lotação dos espaços ANP apresenta erro em vez de sobrepor reservas.

Validação da etapa:

- 17 suítes e 49 testes passando;
- ESLint passando;
- build de produção compilando;
- JavaScript principal com aproximadamente 150 KB gzip;
- nenhuma alteração no scraper ou em `public/data/subjects.csv` durante a etapa.

## Etapa 6 — ampliar a cobertura [CONCLUÍDA]

### Testes unitários

- [x] Parser e validação do CSV.
- [x] Singleton de carregamento.
- [x] Regras de conflitos e ANP.
- [x] Filtros parciais e completos.
- [x] Persistência das confirmações.

### Testes de integração

- [x] Fluxo completo `Hero -> Setup -> Histórico -> Montagem`.
- [x] Erro e retry do CSV exercitados pelo fluxo completo do App.
- [x] Troca e remoção pelo modal em conjunto com o App.
- [x] Drop real com bubbling.
- [x] Navegação voltar/avançar.
- [x] Bloqueio do PNG por correquisito no hook de exportação.

### E2E

Playwright configurado com os seguintes cenários:

- [x] Chromium desktop `1440x1000`;
- [x] Chromium mobile `390x844`;
- [x] fluxo completo de Sistemas de Informação, matriz 2023;
- [x] turma normal, ANP, ANP híbrida, conflito e limite de créditos;
- [x] exportação PNG;
- [x] navegação somente por teclado.

Validação da etapa em 22/07/2026:

- 18 suítes e 53 testes Jest passando;
- 8 testes E2E Playwright passando em desktop e mobile;
- smoke test executado contra o CSV real de Sistemas de Informação, matriz `2023/01`;
- ESLint e build de produção passando;
- CSS principal com 222,01 KB gzip e JavaScript principal com 150 KB gzip.

## Etapa 7 — desempenho [CONCLUÍDA]

Executar somente depois de estabilizar regras e testes.

### Ações

1. [x] Criar `Map<codigo, nome>` durante o carregamento.
2. [x] Criar mapa de ocupação `dia/hora -> materias` quando a grade mudar.
3. [x] Memorizar `CalendarBoard` e `CalendarSidebar`.
4. [x] Evitar reagrupar todas as eletivas durante movimento do mouse.
5. [x] Mover o ghost por `transform` e `requestAnimationFrame`, sem render React a cada pixel.
6. [x] Pausar partículas quando a aba estiver oculta.
7. [x] Respeitar `prefers-reduced-motion`.
8. [x] Substituir o CSS completo do Flaticon por declarações apenas dos ícones usados.
9. [x] Medir o build e executar Lighthouse; o teste do hook demonstra que movimento do ghost não cria novo render React.

### Metas iniciais

- Um único parse do CSV por carregamento da página.
- Movimento do drag sem renders completos por evento de ponteiro.
- CSS substancialmente abaixo dos atuais 222 KB gzip.
- Nenhuma animação contínua em reduced motion.
- Sem long tasks perceptíveis ao abrir eletivas ou iniciar o drag.

Validação da etapa em 22/07/2026:

- CSS principal reduzido de 222,01 KB para 9,07 KB gzip (redução de aproximadamente 96%);
- JavaScript principal em 150,53 KB gzip;
- movimento do ghost coberto por teste que verifica `requestAnimationFrame` sem novo render do hook;
- Lighthouse no build local: performance 61, acessibilidade 100 e boas práticas 100;
- FCP 1,1 s, LCP 3,8 s, CLS 0,02 e TBT 2.400 ms no servidor local sem compressão;
- o payload e o TBT do carregamento inicial continuam dominados pelo CSV real de aproximadamente 6,3 MB;
- 19 suítes/56 testes Jest e 10 testes E2E desktop/mobile passando.

## Etapa 8 — dependências e toolchain [CONCLUÍDA]

### Problema

Ferramentas de teste e build estão em `dependencies`, portanto `npm audit --omit=dev` trata toda a cadeia do CRA como produção.

`react-scripts` concentra a maioria das vulnerabilidades. `ajv@8.17.1` é dependência direta, vulnerável e não possui importação no `src`.

### Ataque

1. [x] Remover `react-scripts`, `ajv` e `web-vitals` da lista de dependências diretas.
2. [x] Separar runtime de desenvolvimento.
3. [x] Substituir CRA/Jest por Vite/Vitest.
4. [x] Migrar o entrypoint, HTML, setup dos testes e variáveis `REACT_APP_*` para `VITE_*`.
5. [x] Validar build, assets públicos, imports CSS, variáveis de ambiente e configuração do Netlify.
6. [x] Rodar auditoria novamente e documentar o resultado.

Não executar `npm audit fix --force` sem revisar o plano de atualização.

### Critérios de aceite

- Dependências de teste/build em `devDependencies`.
- Nenhuma dependência direta sem uso conhecido.
- Servidor de desenvolvimento e build sem vulnerabilidades críticas conhecidas ou com exceção documentada.
- Netlify compilando com o novo toolchain.
- Testes, ESLint e build executados em CI.

Validação da etapa em 22/07/2026:

- `npm ls --depth=0` sem dependências diretas ausentes ou inválidas;
- `npm audit` e `npm audit --omit=dev` com 0 vulnerabilidades;
- 19 arquivos/56 testes Vitest, ESLint e build Vite passando;
- 11 cenários Playwright passando e 1 ignorado no mobile por não haver drag nesse fluxo;
- artefatos produzidos em `dist/`, com assets públicos e fonte de ícones resolvidos pelo Vite.

## Etapa 9 — operação e documentação [CONCLUÍDA]

### Ações

- [x] Atualizar README para o estado real do projeto.
- [x] Remover menções à exportação `.ics` enquanto ela não existir.
- [x] Corrigir caminhos dos CSVs para `public/data`.
- [x] Documentar formato e validação dos CSVs.
- [x] Criar scripts `lint`, `test:ci` e `e2e`.
- [x] Remover `CI=false` do Netlify depois de eliminar warnings.
- [x] Criar pipeline com testes, lint, build e E2E.
- [x] Adicionar cabeçalhos de segurança e políticas de cache no Netlify.
- [x] Mover data, hora e período letivo para variáveis de configuração.
- [x] Documentar procedimento de cache busting do CSV.

O funcionamento remoto da pipeline e do deploy deve ser observado após o primeiro push desta etapa.

## Ordem recomendada de PRs

### PR 1 — dados confiáveis [CONCLUÍDO]

- FE-01 e FE-02.
- Singleton do CSV.
- Erro, retry e loading.
- Testes do loader.

### PR 2 — bugs funcionais [CONCLUÍDO]

- FE-03, FE-04 e FE-05.
- Drop idempotente.
- Confirmação do histórico.
- Filtros parciais.

### PR 3 — acessibilidade dos controles [CONCLUÍDO]

- FE-06 e FE-07.
- Combobox.
- Modais.
- Stepper e botões de ícone.

### PR 4 — domínio compartilhado [CONCLUÍDO]

- FE-08.
- Centralização de conflito, ANP, dias, horas e créditos.
- Testes puros antes da migração.

### PR 5 — integração e E2E [CONCLUÍDO]

- FE-09.
- App, CSV, modal, navegação, desktop e mobile.

### PR 6 — desempenho [CONCLUÍDO]

- FE-10, FE-11, FE-12 e FE-13.
- Medidas antes/depois anexadas ao PR.

### PR 7 — toolchain e produção [CONCLUÍDO]

- FE-14 e FE-15.
- Dependências, Vite, CI, Netlify e documentação.

## Validação obrigatória em todos os PRs

```bash
npm run test:ci
npm run lint
npm run build
npm run e2e
git diff --check
git status --short
```

Quando o PR alterar dependências:

```bash
npm audit
npm ls --depth=0
```

Quando alterar UI ou interação:

- validar desktop `1440x1000`;
- validar mobile `390x844`;
- testar somente com teclado;
- testar zoom de 200%;
- testar reduced motion;
- conferir console do navegador;
- fazer recarregamento forçado ao validar o CSV.

## Definition of Done final

O plano pode ser considerado concluído quando:

- o CSV é carregado e parseado uma única vez;
- falhas de dados possuem mensagem e retry;
- cada drag executa uma única operação;
- confirmações acadêmicas persistem durante o fluxo;
- filtros refletem exatamente o estado exibido;
- fluxos principais funcionam com mouse, touch e teclado;
- modais e dropdowns possuem semântica acessível;
- regras acadêmicas possuem uma única fonte de verdade;
- testes unitários, integração e E2E cobrem os fluxos críticos;
- build, lint e testes rodam automaticamente em CI;
- dependências críticas estão corrigidas ou formalmente justificadas;
- README e deploy descrevem o sistema real;
- scraper e CSV do usuário continuam preservados.

## Restrições

- Não alterar regras acadêmicas sem teste e aprovação explícita.
- Não redesenhar o Calendar durante correções P0.
- Não reformatar nem substituir `public/data/subjects.csv`.
- Não editar nem executar o scraper.
- Não atualizar todas as dependências no mesmo PR das correções funcionais.
- Não remover os limites de memória e limpeza do exportador PNG.
