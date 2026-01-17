/**
 * Lista de cursos da UFLA
 * Por enquanto apenas Sistemas de Informação está 100% implementado
 */

export const cursos = [
  {
    id: "G014",
    nome: "Sistemas de Informação",
    tipo: "Bacharelado",
    totalSemestres: 8,
    icone: "fi-br-database",
    implementado: true
  },
  // Cursos futuros (ainda não implementados)
  { id: "G010", nome: "Ciência da Computação", tipo: "Bacharelado", totalSemestres: 8, icone: "fi-br-laptop-code", implementado: false },
  { id: "G063", nome: "Jogos Digitais", tipo: "Tecnológico", totalSemestres: 5, icone: "fi-br-gamepad", implementado: false },
  { id: "G064", nome: "Segurança Cibernética", tipo: "Tecnológico", totalSemestres: 5, icone: "fi-br-shield-check", implementado: false },
  { id: "G073", nome: "Inteligência Artificial", tipo: "Tecnológico", totalSemestres: 5, icone: "fi-br-brain", implementado: false },
];

// Matrizes curriculares por curso
export const matrizesPorCurso = {
  "G014": [ // Sistemas de Informação
    { id: "202301", nome: "2023/1", ano: 2023 },
    { id: "201502", nome: "2015/2", ano: 2015 },
    { id: "201302", nome: "2013/2", ano: 2013 },
    { id: "200902", nome: "2009/2", ano: 2009 },
  ],
  "G010": [ // Ciência da Computação
    { id: "202301", nome: "2023/1", ano: 2023 },
  ],
  "G063": [ // Jogos Digitais
    { id: "202301", nome: "2023/1", ano: 2023 },
  ],
  "G064": [ // Segurança Cibernética
    { id: "202301", nome: "2023/1", ano: 2023 },
  ],
  "G073": [ // Inteligência Artificial
    { id: "202301", nome: "2023/1", ano: 2023 },
  ],
};

// Função para obter curso por ID
export const getCursoById = (id) => {
  return cursos.find(c => c.id === id);
};

// Função para obter matrizes de um curso
export const getMatrizesByCurso = (cursoId) => {
  return matrizesPorCurso[cursoId] || [{ id: "202301", nome: "2023/1", ano: 2023 }];
};

// Função para filtrar cursos por tipo
export const getCursosPorTipo = (tipo) => {
  return cursos.filter(c => c.tipo === tipo);
};

// Função para buscar cursos por nome
export const buscarCursos = (termo) => {
  const termoLower = termo.toLowerCase();
  return cursos.filter(c =>
    c.nome.toLowerCase().includes(termoLower) ||
    c.id.toLowerCase().includes(termoLower)
  );
};

// Função para obter apenas cursos implementados
export const getCursosImplementados = () => {
  return cursos.filter(c => c.implementado);
};

// Tipos de curso disponíveis
export const tiposCurso = [
  "Bacharelado",
  "Licenciatura Plena",
  "Tecnológico"
];

