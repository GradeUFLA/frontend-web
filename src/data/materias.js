/**
 * Dados completos do curso de Sistemas de Informação (G014)
 * Matriz Curricular 2023/1
 */

// Helper para criar múltiplas turmas
const criarTurmas = (...turmasConfig) => {
  return turmasConfig.map((config, idx) => {
    const id = String.fromCharCode(65 + idx); // A, B, C...
    if (Array.isArray(config)) {
      return { id, horarios: config };
    }
    // allow passing an object like { horarios: [...], anp: true }
    if (config && typeof config === 'object' && Array.isArray(config.horarios)) {
      return { id, ...config };
    }
    // fallback
    return { id, horarios: [] };
  });
};

// ============================================
// MATÉRIAS OBRIGATÓRIAS POR MÓDULO (SEMESTRE)
// ============================================

const siMateriasPorSemestre = {
  // 1º MÓDULO
  1: [
    {
      codigo: "GAC124", nome: "Introdução aos Algoritmos", creditos: 6, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 8, fim: 10 }, { dia: 3, inicio: 8, fim: 10 }, { dia: 5, inicio: 8, fim: 10 }],
        [{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }, { dia: 5, inicio: 14, fim: 16 }],
        { horarios: [{ dia: 6, inicio: 9, fim: 11 }], anp: true }
      )
    },
    {
      codigo: "GAE325", nome: "Administração aplicada a Sistemas de Informação", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 8, fim: 10 }, { dia: 4, inicio: 8, fim: 10 }],
        [{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]
      )
    },
    {
      codigo: "GAT136", nome: "Introdução aos Sistemas Digitais", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 10, fim: 12 }, { dia: 3, inicio: 10, fim: 12 }]
      )
    },
    {
      codigo: "GCC241", nome: "Introdução a Computação", creditos: 2, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 5, inicio: 10, fim: 12 }]
      )
    },
    {
      codigo: "GMM126", nome: "Funções Elementares", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 10, fim: 12 }, { dia: 4, inicio: 10, fim: 12 }],
        [{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }],
        { horarios: [{ dia: 6, inicio: 9, fim: 11 }], anp: true }
      )
    },
  ],

  // 2º MÓDULO
  2: [
    {
      codigo: "GAC125", nome: "Introdução à Programação Orientada a Objetos", creditos: 4, preRequisitos: ["GAC124"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 8, fim: 10 }, { dia: 3, inicio: 8, fim: 10 }],
        [{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]
      )
    },
    {
      codigo: "GAE117", nome: "Administração Estratégica", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 8, fim: 10 }, { dia: 4, inicio: 8, fim: 10 }]
      )
    },
    {
      codigo: "GCC174", nome: "Sistemas de Informação", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 10, fim: 12 }, { dia: 3, inicio: 10, fim: 12 }]
      )
    },
    {
      codigo: "GES107", nome: "Estatística Aplicada", creditos: 4, preRequisitos: ["GMM126"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 10, fim: 12 }, { dia: 4, inicio: 10, fim: 12 }],
        [{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]
      )
    },
    {
      codigo: "GMM135", nome: "Matemática Discreta", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 5, inicio: 8, fim: 10 }, { dia: 5, inicio: 10, fim: 12 }]
      )
    },
  ],

  // 3º MÓDULO
  3: [
    {
      codigo: "GAC108", nome: "Estruturas de Dados", creditos: 6, preRequisitos: ["GAC125"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 8, fim: 10 }, { dia: 3, inicio: 8, fim: 10 }, { dia: 5, inicio: 8, fim: 10 }],
        [{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }, { dia: 5, inicio: 14, fim: 16 }]
      )
    },
    {
      codigo: "GAE108", nome: "Teoria Econômica", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 8, fim: 10 }, { dia: 4, inicio: 8, fim: 10 }]
      )
    },
    {
      codigo: "GCC194", nome: "Arquitetura de Computadores", creditos: 4, preRequisitos: ["GAT136", "GAC124"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 10, fim: 12 }, { dia: 3, inicio: 10, fim: 12 }]
      )
    },
    {
      codigo: "GCC263", nome: "Introdução a Sistemas de Banco de Dados", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 10, fim: 12 }, { dia: 4, inicio: 10, fim: 12 }],
        [{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]
      )
    },
    {
      codigo: "GCC265", nome: "Mentoria Acadêmica I", creditos: 2, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 5, inicio: 10, fim: 12 }]
      )
    },
    {
      codigo: "GGA133", nome: "Organizações, Sistemas e Métodos", creditos: 2, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 5, inicio: 14, fim: 16 }]
      )
    },
  ],

  // 4º MÓDULO
  4: [
    {
      codigo: "GCC116", nome: "Sistemas Operacionais", creditos: 4, preRequisitos: ["GCC194"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 8, fim: 10 }, { dia: 3, inicio: 8, fim: 10 }],
        [{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]
      )
    },
    {
      codigo: "GCC125", nome: "Redes de Computadores", creditos: 4, preRequisitos: ["GCC194"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 8, fim: 10 }, { dia: 4, inicio: 8, fim: 10 }]
      )
    },
    {
      codigo: "GCC176", nome: "Gestão de Tecnologia da Informação", creditos: 4, preRequisitos: ["GCC174", "GAE117"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 10, fim: 12 }, { dia: 3, inicio: 10, fim: 12 }]
      )
    },
    {
      codigo: "GCC188", nome: "Engenharia de Software", creditos: 4, preRequisitos: ["GCC263"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 10, fim: 12 }, { dia: 4, inicio: 10, fim: 12 }],
        [{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]
      )
    },
    {
      codigo: "GCC219", nome: "Interação Humano-Computador", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 5, inicio: 8, fim: 10 }, { dia: 5, inicio: 10, fim: 12 }]
      )
    },
  ],

  // 5º MÓDULO
  5: [
    {
      codigo: "GCC129", nome: "Sistemas Distribuídos", creditos: 4, preRequisitos: ["GCC116"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 8, fim: 10 }, { dia: 3, inicio: 8, fim: 10 }]
      )
    },
    {
      codigo: "GCC137", nome: "Empreendedorismo em Sistemas de Informação", creditos: 4, preRequisitos: ["GCC174"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 8, fim: 10 }, { dia: 4, inicio: 8, fim: 10 }]
      )
    },
    {
      codigo: "GCC175", nome: "Sistemas Gerenciadores de Banco de Dados", creditos: 4, preRequisitos: ["GCC263", "GAC108"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 10, fim: 12 }, { dia: 3, inicio: 10, fim: 12 }],
        [{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]
      )
    },
    {
      codigo: "GCC242", nome: "Segurança, Auditoria e Avaliação de Sistemas de Informação", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 10, fim: 12 }, { dia: 4, inicio: 10, fim: 12 }]
      )
    },
    {
      codigo: "GCC262", nome: "Grafos e suas Aplicações", creditos: 4, preRequisitos: ["GAC108"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 5, inicio: 8, fim: 10 }, { dia: 5, inicio: 10, fim: 12 }]
      )
    },
  ],

  // 6º MÓDULO
  6: [
    {
      codigo: "GAC116", nome: "Programação WEB", creditos: 4, preRequisitos: ["GCC125", "GCC188"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 8, fim: 10 }, { dia: 3, inicio: 8, fim: 10 }],
        [{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]
      )
    },
    {
      codigo: "GCC128", nome: "Inteligência Artificial", creditos: 4, preRequisitos: ["GAC108"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 8, fim: 10 }, { dia: 4, inicio: 8, fim: 10 }]
      )
    },
    {
      codigo: "GCC135", nome: "Gerência de Projetos de Software", creditos: 4, preRequisitos: ["GCC188"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 10, fim: 12 }, { dia: 3, inicio: 10, fim: 12 }]
      )
    },
    {
      codigo: "GCC244", nome: "Processos de Software", creditos: 4, preRequisitos: ["GCC188"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 10, fim: 12 }, { dia: 4, inicio: 10, fim: 12 }]
      )
    },
    {
      codigo: "GCC253", nome: "Complexidade e Projetos de Algoritmos", creditos: 4, preRequisitos: ["GMM135", "GMM126", "GCC262"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 5, inicio: 8, fim: 10 }, { dia: 5, inicio: 10, fim: 12 }]
      )
    },
  ],

  // 7º MÓDULO
  7: [
    {
      codigo: "GCC220", nome: "Metodologia de Pesquisa", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 8, fim: 10 }, { dia: 3, inicio: 8, fim: 10 }]
      )
    },
    {
      codigo: "GCC243", nome: "Qualidade de Software", creditos: 4, preRequisitos: ["GCC188"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 2, inicio: 8, fim: 10 }, { dia: 4, inicio: 8, fim: 10 }]
      )
    },
    {
      codigo: "GCC266", nome: "Mentoria Acadêmica II", creditos: 2, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 5, inicio: 8, fim: 10 }]
      )
    },
    {
      codigo: "GCC267", nome: "Projeto Integrador I", creditos: 4, preRequisitos: ["GCC188"], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 10, fim: 12 }, { dia: 3, inicio: 10, fim: 12 }]
      )
    },
  ],

  // 8º MÓDULO
  8: [
    {
      codigo: "GCC222", nome: "Ética, Computador e Sociedade", creditos: 4, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 1, inicio: 8, fim: 10 }, { dia: 3, inicio: 8, fim: 10 }]
      )
    },
    {
      codigo: "TCC1448", nome: "Estágio Supervisionado/TCC", creditos: 0, preRequisitos: [], tipo: "obrigatoria",
      turmas: criarTurmas(
        [{ dia: 5, inicio: 14, fim: 18 }]
      )
    },
  ],
};

// ============================================
// DISCIPLINAS ELETIVAS
// ============================================

const siEletivas = [
  // Subgrupo A: Computação
  { codigo: "GAC105", nome: "Programação Paralela e Concorrente", creditos: 4, preRequisitos: ["GCC116"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GAC106", nome: "Práticas de Programação Orientada a Objetos", creditos: 4, preRequisitos: ["GAC125"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GAC111", nome: "Técnicas de Programação Aplicada à Engenharia", creditos: 6, preRequisitos: ["GAC124"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }, { dia: 6, inicio: 8, fim: 10 }]) },
  { codigo: "GAC115", nome: "Estudos Avançados em Tecnologias Educacionais", creditos: 4, preRequisitos: ["GCC220"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 16 }, { dia: 5, inicio: 16, fim: 18 }]) },
  { codigo: "GAC126", nome: "Programação Aplicada com Suporte de IA", creditos: 4, preRequisitos: ["GAC124"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GAC127", nome: "Mineração de Dados", creditos: 4, preRequisitos: ["GCC175"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GCC108", nome: "Teoria da Computação", creditos: 4, preRequisitos: ["GCC122"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]) },
  { codigo: "GCC122", nome: "Linguagens Formais e Autômatos", creditos: 4, preRequisitos: ["GAC108"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GCC132", nome: "Modelagem e Implementação de Software", creditos: 4, preRequisitos: ["GCC188"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GCC140", nome: "Inteligência de Negócios", creditos: 4, preRequisitos: ["GCC263"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GCC141", nome: "Administração de Serviços de Redes de Computadores", creditos: 4, preRequisitos: ["GCC125"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 16 }, { dia: 5, inicio: 16, fim: 18 }]) },
  { codigo: "GCC144", nome: "Desenvolvimento de Aplicativos para Dispositivos Móveis", creditos: 4, preRequisitos: ["GCC125", "GCC188", "GCC263"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GCC147", nome: "Estudos Avançados em Engenharia de Software", creditos: 4, preRequisitos: ["GCC188"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GCC148", nome: "Gestão do Conhecimento Tecnologia e Inovação", creditos: 4, preRequisitos: ["GCC220"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 18 }]) },
  { codigo: "GCC158", nome: "Redes de Sensores Sem Fio", creditos: 4, preRequisitos: ["GCC125"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]) },
  { codigo: "GCC164", nome: "Software Livre e Empreendedorismo Cooperativo", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GCC180", nome: "Computação em Nuvem", creditos: 4, preRequisitos: ["GCC116", "GCC125"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GCC189", nome: "Informática na Educação", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 18 }]) },
  { codigo: "GCC190", nome: "Projet e Inst de Infra-estruturas de Redes de Computadores", creditos: 4, preRequisitos: ["GCC125"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GCC204", nome: "Recuperação da Informação", creditos: 4, preRequisitos: ["GAC108"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]) },
  { codigo: "GCC213", nome: "Estudos Avançados em Mineração Web e Aplicações", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GCC223", nome: "Acessibilidade em Sistemas Computacionais", creditos: 4, preRequisitos: ["GCC219"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 18 }]) },
  { codigo: "GCC225", nome: "Gestão do Conhecimento no Setor Público", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GCC226", nome: "Inovação Aberta", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GCC227", nome: "Manutenção e Evolução de Software", creditos: 4, preRequisitos: ["GCC188"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]) },
  { codigo: "GCC240", nome: "Governo Eletrônico", creditos: 4, preRequisitos: ["GCC174"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GCC252", nome: "Arquitetura de Software", creditos: 4, preRequisitos: ["GCC188"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 18 }]) },
  { codigo: "GCC255", nome: "Teste de Software", creditos: 4, preRequisitos: ["GCC188"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GCC259", nome: "Desenvolvimento de Software Livre", creditos: 4, preRequisitos: ["GCC188"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GCC268", nome: "Introdução a Deep Learning", creditos: 4, preRequisitos: ["GES107", "GMM135"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]) },
  { codigo: "GCC269", nome: "Fundamentos de Sistemas Multimídia", creditos: 4, preRequisitos: ["GCC125"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GCC270", nome: "Devops na Prática", creditos: 4, preRequisitos: ["GCC188"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 18 }]) },
  { codigo: "GCC271", nome: "Internet das Coisas: Fundamentos e Aplicações", creditos: 4, preRequisitos: ["GCC125"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GCC272", nome: "Aplicações de Processamento Digital de Áudio Profissional", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GCC273", nome: "Big-data: Processamento de Dados Massivos", creditos: 4, preRequisitos: ["GCC175", "GCC116", "GCC125"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]) },
  { codigo: "GCC274", nome: "Aplicações de Redes Neurais Artificiais", creditos: 4, preRequisitos: ["GMM135", "GES107", "GAC108"], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GMM102", nome: "Geometria Analítica e Álgebra Linear", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 5, inicio: 8, fim: 10 }, { dia: 5, inicio: 10, fim: 12 }]) },
  { codigo: "GMM104", nome: "Cálculo I", creditos: 6, preRequisitos: [], tipo: "eletiva", subgrupo: "A", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }, { dia: 5, inicio: 14, fim: 16 }]) },

  // Subgrupo B: Administração, Economia e Ciências Humanas
  { codigo: "GAE114", nome: "Métodos Quantitativos", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GAE115", nome: "Gestão de Custos", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GAE120", nome: "Marketing", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GAE121", nome: "Administração de Recursos Humanos II", creditos: 3, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 17 }]) },
  { codigo: "GAE128", nome: "Sistemas de Informações Gerenciais", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]) },
  { codigo: "GAE140", nome: "Pesquisa Operacional", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GAE142", nome: "Planejamento Empresarial", creditos: 2, preRequisitos: ["GAE325"], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 16, fim: 18 }]) },
  { codigo: "GAE155", nome: "Consultoria Empresarial", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 18, fim: 20 }]) },
  { codigo: "GAE156", nome: "Mudança e Inovação Organizacional", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 3, inicio: 18, fim: 20 }]) },
  { codigo: "GAE168", nome: "Empreendedorismo", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 18, fim: 20 }]) },
  { codigo: "GAE207", nome: "Sistema de Informação para o Setor Público", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GAE225", nome: "Gestão e Desenvolvimento de Pessoas no Setor Público", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GAE237", nome: "Estratégias Empresariais na Era Digital", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 16 }]) },
  { codigo: "GAE287", nome: "Inovação e Competitividade", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 16, fim: 18 }]) },
  { codigo: "GAE324", nome: "Comportamento Humano nas Organizações", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GAE349", nome: "Marketing Digital", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]) },
  { codigo: "GAP101", nome: "Contabilidade Geral", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GAP103", nome: "Mercado de Capitais", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 18, fim: 20 }]) },
  { codigo: "GAP105", nome: "Redes de Cooperação", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 3, inicio: 18, fim: 20 }]) },
  { codigo: "GAP106", nome: "Macroeconomia", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 16 }, { dia: 5, inicio: 16, fim: 18 }]) },
  { codigo: "GAP108", nome: "Teoria das Finanças Públicas", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GAP110", nome: "Relações Internacionais", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GAP115", nome: "Economia Brasileira Contemporânea", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GAP121", nome: "Licitação, Contrato e Convênios", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 18, fim: 20 }]) },
  { codigo: "GAP122", nome: "Governança na Administração Pública", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 18, fim: 20 }]) },
  { codigo: "GAP130", nome: "Estratégia no Setor Público", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 3, inicio: 14, fim: 16 }, { dia: 5, inicio: 14, fim: 16 }]) },
  { codigo: "GAP133", nome: "Sociologia das Organizações do Trabalho", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 3, inicio: 18, fim: 20 }]) },
  { codigo: "GAP142", nome: "Métodos Quantitativos Aplicados à Gestão Pública", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 18, fim: 20 }]) },
  { codigo: "GAP148", nome: "Ação Coletiva", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GAP154", nome: "Marketing Público", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 16 }]) },
  { codigo: "GCH102", nome: "Introdução à Filosofia", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GCH104", nome: "Sociologia", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GCH110", nome: "Psicologia", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 16, fim: 18 }]) },
  { codigo: "GCH268", nome: "Ética", creditos: 5, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 17 }]) },
  { codigo: "GCH272", nome: "Lógica: História e Fundamentos", creditos: 5, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 14, fim: 16 }, { dia: 3, inicio: 14, fim: 17 }]) },
  { codigo: "GDE124", nome: "Língua Brasileira de Sinais (libras)", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 16 }]) },
  { codigo: "GDE165", nome: "História e Culturas Afro-Brasileiras e Indígenas", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 16, fim: 18 }]) },
  { codigo: "GDI166", nome: "Legislação e Direito Ambiental", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 16, fim: 18 }, { dia: 4, inicio: 16, fim: 18 }]) },
  { codigo: "GDI169", nome: "Direito Administrativo", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 16, fim: 18 }, { dia: 3, inicio: 16, fim: 18 }]) },
  { codigo: "GDI201", nome: "Direito Internacional dos Direitos Humanos", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 18, fim: 20 }]) },
  { codigo: "GDI256", nome: "Desenvolvimento Sustentável", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 1, inicio: 18, fim: 20 }]) },
  { codigo: "GEL102", nome: "Leitura e Produção de Textos I", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 3, inicio: 18, fim: 20 }]) },
  { codigo: "GEL178", nome: "Habilidades em Língua Inglesa I", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 18, fim: 20 }]) },
  { codigo: "GEL179", nome: "Habilidades em Língua Inglesa II", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 4, inicio: 18, fim: 20 }]) },
  { codigo: "GEL231", nome: "Língua Inglesa em Contexto Acadêmico para Proficiência QCE A2", creditos: 4, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 2, inicio: 14, fim: 16 }, { dia: 4, inicio: 14, fim: 16 }]) },
  { codigo: "GNU191", nome: "Saúde e cuidados na primeira infância", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 14, fim: 16 }]) },
  { codigo: "GNU192", nome: "Saúde e cuidados da mulher no pós parto", creditos: 2, preRequisitos: [], tipo: "eletiva", subgrupo: "B", turmas: criarTurmas([{ dia: 5, inicio: 16, fim: 18 }]) },
];

// ============================================
// EXPORTAÇÕES
// ============================================

export const dadosPorCurso = {
  "G014": {
    materiasPorSemestre: siMateriasPorSemestre,
    eletivas: siEletivas
  },
  // Alias para compatibilidade
  "si": {
    materiasPorSemestre: siMateriasPorSemestre,
    eletivas: siEletivas
  },
};

export const getMateriasPorSemestre = (cursoId) => {
  return dadosPorCurso[cursoId]?.materiasPorSemestre || siMateriasPorSemestre;
};

export const getEletivas = (cursoId) => {
  return dadosPorCurso[cursoId]?.eletivas || siEletivas;
};

export const verificarPreRequisitos = (materia, materiasAprovadas) => {
  if (!materia.preRequisitos || materia.preRequisitos.length === 0) {
    return { cumprido: true, faltando: [] };
  }
  const faltando = materia.preRequisitos.filter(pr => !materiasAprovadas.includes(pr));
  return { cumprido: faltando.length === 0, faltando };
};

export const getNomeMateria = (codigo) => {
  // Busca nas obrigatórias
  for (const semestre of Object.values(siMateriasPorSemestre)) {
    const materia = semestre.find(m => m.codigo === codigo);
    if (materia) return materia.nome;
  }
  // Busca nas eletivas
  const eletiva = siEletivas.find(e => e.codigo === codigo);
  if (eletiva) return eletiva.nome;

  return codigo;
};

// Para compatibilidade com código antigo
export const materiasPorSemestre = siMateriasPorSemestre;
export const eletivas = siEletivas;

