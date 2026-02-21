import { forwardRef, useState, useRef, useEffect } from 'react';
import {
  verificarPreRequisitosDetalhada,
  getNomeMateria
} from '../../data';
import './Calendar.css';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CORES_MATERIAS = [
  '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8',
  '#00b894', '#74b9ff', '#ffeaa7', '#81ecec',
  '#6c5ce7', '#00cec9', '#55a3ff', '#fdcb6e'
];

// Cores para diferenciar as turmas durante a seleção
const CORES_TURMAS = [
  '#00F0B5', // Tropical Mint
  '#3185FC', // Azure Blue
  '#F9DC5C', // Royal Gold
  '#a29bfe', // Purple
  '#fd79a8', // Pink
  '#00cec9'  // Turquoise
];

// Gera horários de 7h até 23h
const gerarHorarios = (start = 7, end = 23) => {
  const horarios = [];
  for (let h = start; h <= end; h++) {
    horarios.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return horarios;
};

// Constantes
const SATURDAY_INDEX = 6;
const ANP_START_HOUR = 9;


// Parse hora de string ou número
const parseHour = (val) => {
  if (val == null) return NaN;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const match = val.match(/^(\d{1,2})[:.]?(\d{0,2})/);
    if (match) return Number(match[1]);
    const n = Number(val);
    return Number.isNaN(n) ? NaN : n;
  }
  return NaN;
};

// Verifica se turma é ANP pela tag anp
const isAnpTurma = (turma) => {
  if (!turma) return false;
  return turma.anp === true;
};

// Encontra próximo horário ANP disponível
const findNextAnpHour = (materiasNoCalendario) => {
  const usedHours = new Set();
  for (const m of Object.values(materiasNoCalendario || {})) {
    if (m.anp && m.anpHour != null) {
      usedHours.add(Number(m.anpHour));
    }
  }
  for (let hour = ANP_START_HOUR; hour <= 22; hour++) {
    if (!usedHours.has(hour)) return hour;
  }
  return null;
};

const Calendar = forwardRef(({
  semestreAtual,
  materiasAprovadas,
  materiasPorSemestre,
  eletivas,
  materiasNoCalendario,
  onAddMateria,
  onRemoveMateria,
  onMateriaClick,
  onVoltar,
  onShowToast,
  onToggleAprovada,
  materiasMinimoConfirmadas = [],
  onConfirmMinimo
}, ref) => {
  const [mostrarEletivas, setMostrarEletivas] = useState(false);
  const [eletivasQuery, setEletivasQuery] = useState('');
  const [futurasQuery, setFuturasQuery] = useState('');
  const [mostrarFuturas, setMostrarFuturas] = useState(false);
  const [filtroHorario, setFiltroHorario] = useState({ ativo: false, dia: null, horaInicio: null, horaFim: null, isAnp: false, creditos: null });
  const [shakeErrorMateria, setShakeErrorMateria] = useState(null); // Para animação de erro
  // Credit limits
  const CREDIT_WARN = 25;
  const CREDIT_MAX = 32;
  const [draggingMateria, setDraggingMateria] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTurmaIndex, setSelectedTurmaIndex] = useState(null);
  const [draggingFromCalendar, setDraggingFromCalendar] = useState(false); // Nova flag para saber se está arrastando do calendário
  const [minimoModal, setMinimoModal] = useState({
    open: false,
    prereqs: [], // array de pré-requisitos (pode ser múltiplos)
    parent: null, // código da matéria que quer adicionar
    tipo: null // 'minimo', 'forte' ou 'coreq'
  });

  const calendarTableRef = useRef(null);
  const wrapperRef = useRef(null);
  const handledDropRef = useRef(false);

  // Detecta se está em dispositivo mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1000);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Registra eventos globais de mouse/touch para o drag
  useEffect(() => {
    const handleGlobalMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();

      // Suporte para touch e mouse
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      setDragPosition({ x: clientX, y: clientY });
    };

    const handleGlobalUp = (e) => {
      if (isDragging) {
        handleMouseUp(e);
      }
    };

    if (isDragging) {
      // Mouse events
      document.addEventListener('mousemove', handleGlobalMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalUp);

      // Touch events para mobile
      document.addEventListener('touchmove', handleGlobalMove, { passive: false });
      document.addEventListener('touchend', handleGlobalUp);
      document.addEventListener('touchcancel', handleGlobalUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalUp);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('touchend', handleGlobalUp);
      document.removeEventListener('touchcancel', handleGlobalUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  // Robust toast trigger: use parent's onShowToast if provided, otherwise dispatch an event
  const triggerToast = (message, level = 'info') => {
    if (typeof onShowToast === 'function') {
      try {
        onShowToast(message, level);
        return;
      } catch (e) {
        // fall through to fallback
        // eslint-disable-next-line no-console
        console.warn('onShowToast handler threw an error, using fallback:', e);
      }
    }

    try {
      const ev = new CustomEvent('gradeufla-toast', { detail: { message, level } });
      window.dispatchEvent(ev);
    } catch (e) {
      // last resort: console
      // eslint-disable-next-line no-console
      console.log(`[toast:${level}]`, message);
    }
  };

  // helper: calculate total credits currently in calendar
  const calcTotalCreditos = () => Object.values(materiasNoCalendario || {}).reduce((acc, m) => acc + (m.creditos || 0), 0);

  // generate hours from 07:00 to 23:00
  const horarios = gerarHorarios(7, 23);
  const baseHour = 7; // used to compute numeric hour from index

  // Download (screenshot) handler: captures the calendar title + table and downloads PNG
  const handleDownloadPNG = async () => {
    const node = wrapperRef.current;
    if (!node) {
      triggerToast('Área do calendário não disponível para captura.', 'error');
      return;
    }

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;

      // Tamanho fixo da imagem final: 1600x2338 pixels
      const FIXED_WIDTH = 1600;
      const FIXED_HEIGHT = 2338;

      // Salvar estilos originais
      const originalWidth = node.style.width;
      const originalMinWidth = node.style.minWidth;
      const originalHeight = node.style.height;
      const originalMinHeight = node.style.minHeight;

      // Forçar dimensões fixas para captura
      node.style.width = `${FIXED_WIDTH / 2}px`;
      node.style.minWidth = `${FIXED_WIDTH / 2}px`;
      node.style.height = 'auto';
      node.style.minHeight = 'auto';

      // Adicionar classe de captura
      node.classList.add('capturing');

      // Aguardar renderização com a classe de captura
      await new Promise(resolve => setTimeout(resolve, 200));

      // Capturar o elemento com dimensões fixas
      const canvas = await html2canvas(node, {
        backgroundColor: '#121216',
        scale: 2, // 800 * 2 = 1600 de largura
        useCORS: true,
        allowTaint: false,
        logging: false,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
        width: FIXED_WIDTH / 2,
        height: FIXED_HEIGHT / 2,
        windowWidth: FIXED_WIDTH / 2,
        windowHeight: FIXED_HEIGHT / 2,
      });

      // Remover classe de captura e restaurar estilos
      node.classList.remove('capturing');
      node.style.width = originalWidth;
      node.style.minWidth = originalMinWidth;
      node.style.height = originalHeight;
      node.style.minHeight = originalMinHeight;

      // Download PNG
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `grade-${semestreAtual}semestre.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      triggerToast('Grade baixada com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao gerar imagem do calendário', err);
      if (node) {
        node.classList.remove('capturing');
        node.style.width = '';
        node.style.minWidth = '';
        node.style.height = '';
        node.style.minHeight = '';
      }
      triggerToast('Erro ao gerar imagem. Tente novamente.', 'error');
    }
  };
  // The CSV uses 1 = Domingo, 2 = Segunda, ..., 7 = Sábado (as in your example).
  // Map that to 0..6 by shifting -1 (n-1 mod 7).
  // normalize dia numbers coming from CSV / data sources
  // We accept:
  // - 0..6 (0=Dom, 6=Sáb) -> keep
  // - 1..7 with convention 1=Dom ... 7=Sáb -> map to 0..6 via (n-1) mod 7
  // - strings (e.g., 'Dom','Seg') -> map by matching DIAS_SEMANA
  const normalizeDia = (d) => {
    if (d == null) return d;
    const n = Number(d);
    if (!Number.isNaN(n)) {
      if (n >= 0 && n <= 6) return n;
      if (n >= 1 && n <= 7) {
        // mapping B: shift by -1 (1->0, 2->1, ..., 7->6)
        return ((n + 6) % 7 + 7) % 7;
      }
      return n;
    }
    // try string names (case-insensitive, first 3 letters)
    const s = String(d).toLowerCase().slice(0,3);
    const idx = DIAS_SEMANA.findIndex(x => x.toLowerCase().slice(0,3) === s);
    return idx !== -1 ? idx : d;
  };

  // Obtém matérias disponíveis para o semestre atual
  const getMateriasDisponiveis = () => {
    const materiasDoSemestre = materiasPorSemestre[semestreAtual] || [];
    const materiasAnteriores = [];

    for (let i = 1; i < semestreAtual; i++) {
      const materias = materiasPorSemestre[i] || [];
      materias.forEach(m => {
        if (!materiasAprovadas.includes(m.codigo)) {
          materiasAnteriores.push({ ...m, semestreOriginal: i });
        }
      });
    }

    // Show all eletivas (even if prerequisites are not met). The card will display 'Falta: ...'
    const eletivasDisponiveis = mostrarEletivas ? (Array.isArray(eletivas) ? eletivas.filter(e => !materiasAprovadas.includes(e.codigo)) : []) : [];

    return {
      obrigatorias: materiasDoSemestre.filter(m => !materiasAprovadas.includes(m.codigo)),
      pendentes: materiasAnteriores,
      eletivas: eletivasDisponiveis
    };
  };

  // Verifica se uma matéria tem alguma turma que se encaixa no filtro de horário
  const materiaSeEncaixaNoFiltro = (materia) => {
    if (!filtroHorario.ativo) return true;
    if (!materia.turmas || materia.turmas.length === 0) return false;

    const { dia, horaInicio, horaFim, isAnp, creditos } = filtroHorario;

    // Verificar filtro de créditos (valor exato)
    if (creditos !== null) {
      const creditosMateria = materia.creditos || 0;
      if (creditosMateria !== creditos) return false;
    }

    // Se filtro ANP está ativo: mostrar apenas matérias exclusivamente ANP
    if (isAnp) {
      return materia.turmas.some(turma => {
        // Verificar se a turma é ANP
        if (!isAnpTurma(turma)) return false;
        
        // Verificar se a matéria é EXCLUSIVAMENTE ANP (não tem horários em outros dias)
        const horarios = turma.horarios || [];
        const temHorarioNaoSabado = horarios.some(h => {
          const hDia = normalizeDia(h.dia);
          return hDia !== SATURDAY_INDEX && hDia !== null;
        });
        
        // Retorna true apenas se é ANP E não tem horários em outros dias
        return !temHorarioNaoSabado;
      });
    }

    // Se não há filtro de dia/horário, mas há filtro de créditos, já foi validado acima
    if (dia === null && horaInicio === null && horaFim === null) {
      return true;
    }

    // Filtro de dia/horário normal (não ANP)
    return materia.turmas.some(turma => {
      if (!turma.horarios || turma.horarios.length === 0) return false;

      return turma.horarios.some(h => {
        const hDia = normalizeDia(h.dia);
        const hInicio = parseHour(h.inicio);
        const hFim = parseHour(h.fim);

        // Se o dia não corresponde, não serve
        if (dia !== null && hDia !== dia) return false;

        // Se temos filtro de hora, verificar se o horário da turma se encaixa
        if (horaInicio !== null && horaFim !== null) {
          // Verifica se há alguma sobreposição entre o horário da turma e o filtro
          return !(hFim <= horaInicio || hInicio >= horaFim);
        }

        return true;
      });
    });
  };

  // Constrói lista completa de matérias para verificação de requisitos do mesmo período
  // Movido para cima para estar disponível nas funções handleDragStart, etc.
  const allMateriasList = [
    ...Object.values(materiasPorSemestre).flat(),
    ...eletivas
  ];

  const getCorMateria = (codigo) => {
    const keys = Object.keys(materiasNoCalendario);
    const index = keys.indexOf(codigo);
    if (index === -1) {
      return CORES_MATERIAS[keys.length % CORES_MATERIAS.length];
    }
    return CORES_MATERIAS[index % CORES_MATERIAS.length];
  };

  const getCorTurma = (index) => {
    return CORES_TURMAS[index % CORES_TURMAS.length];
  };

  // Determina o tipo de matéria (eletiva, obrigatória ou futura)
  const getTipoMateria = (codigo) => {
    const materiaNoCalendario = materiasNoCalendario[codigo];
    if (!materiaNoCalendario) return null;

    // Verifica se é eletiva
    const isEletiva = eletivas.some(e => e.codigo === codigo);
    if (isEletiva) return 'eletiva';

    // Verifica se é futura (de semestres posteriores ao atual)
    for (let sem = Number(semestreAtual) + 1; sem <= 10; sem++) {
      const materiasSem = materiasPorSemestre[sem] || [];
      if (materiasSem.some(m => m.codigo === codigo)) {
        return 'futura';
      }
    }

    // Se não é eletiva nem futura, é obrigatória
    return 'obrigatoria';
  };

  // Verifica se uma célula está ocupada por alguma matéria já adicionada
  const getMateriasEmCelula = (horarioIdx, diaIdx) => {
    const hora = baseHour + horarioIdx;
    const found = [];

    for (const [codigo, materiaData] of Object.entries(materiasNoCalendario)) {
      // Matéria ANP:
      // - No sábado: aparece no horário ANP (anpHour)
      // - Seg-Sex: aparece nos horários normais cadastrados
      if (materiaData.anp) {
        // No sábado: usar anpHour
        if (diaIdx === SATURDAY_INDEX) {
          if (materiaData.anpHour != null && hora === materiaData.anpHour) {
            found.push({ ...materiaData, codigo });
          }
        } else {
          // Seg-Sex: usar horários normais cadastrados
          for (const h of (materiaData.horarios || [])) {
            if (!h) continue;
            const hd = normalizeDia(h.dia);
            const hStart = parseHour(h.inicio);
            const hEnd = parseHour(h.fim);
            // Só processar se não for sábado (horários de seg-sex)
            if (hd !== SATURDAY_INDEX && hd === diaIdx && !Number.isNaN(hStart) && !Number.isNaN(hEnd) && hora >= hStart && hora < hEnd) {
              found.push({ ...materiaData, codigo });
              break;
            }
          }
        }
        continue;
      }

      // Matéria normal: verificar pelos horários normalmente
      for (const h of (materiaData.horarios || [])) {
        if (!h) continue;
        const hd = normalizeDia(h.dia);
        const hStart = parseHour(h.inicio);
        const hEnd = parseHour(h.fim);
        if (hd === diaIdx && !Number.isNaN(hStart) && !Number.isNaN(hEnd) && hora >= hStart && hora < hEnd) {
          found.push({ ...materiaData, codigo });
          break;
        }
      }
    }
    return found;
  };

  // Verifica se uma turma tem conflito de horário
  const verificarConflito = (turma) => {
    const isAnpOnlyTurma = (t) => {
      const horarios = t?.horarios || [];
      if (horarios.length === 0) return true;
      return horarios.every(h => normalizeDia(h.dia) === SATURDAY_INDEX);
    };

    // Turma ANP: só verifica se há horário disponível no sábado quando é ANP-only
    if (isAnpTurma(turma) && isAnpOnlyTurma(turma)) {
      const nextHour = findNextAnpHour(materiasNoCalendario);
      if (nextHour === null) {
        return { temConflito: true, mensagem: 'Sem vagas ANP disponíveis no sábado' };
      }
      return { temConflito: false };
    }

    // Função helper para verificar se dois horários conflitam
    const horariosConflitam = (horario1, horario2) => {
      const dia1 = normalizeDia(horario1.dia);
      const dia2 = normalizeDia(horario2.dia);

      // Se dias são diferentes, não há conflito
      if (dia1 !== dia2 || dia1 == null || dia2 == null) {
        return false;
      }

      const inicio1 = parseHour(horario1.inicio);
      const fim1 = parseHour(horario1.fim);
      const inicio2 = parseHour(horario2.inicio);
      const fim2 = parseHour(horario2.fim);

      if (Number.isNaN(inicio1) || Number.isNaN(fim1) || Number.isNaN(inicio2) || Number.isNaN(fim2)) {
        return false;
      }

      // Há conflito se: horario1 começa ANTES de horario2 terminar E horario1 termina DEPOIS de horario2 começar
      return (inicio1 < fim2 && fim1 > inicio2);
    };

    // Turma normal: verificar conflito de horários
    const horariosNovos = turma.horarios || [];

    // Para cada matéria já na grade
    for (const [codigo, materia] of Object.entries(materiasNoCalendario)) {
      // ✅ CRUCIAL: Ignorar a própria matéria ao verificar conflitos (permite trocar de turma via drag)
      if (draggingMateria && codigo === draggingMateria.codigo) continue;

      // Ignorar matérias ANP apenas se forem ANP-only (sem horários em dias úteis)
      if (materia.anp) {
        const horarios = materia.horarios || [];
        const onlySaturday = horarios.length === 0 || horarios.every(h => normalizeDia(h.dia) === SATURDAY_INDEX);
        if (onlySaturday) continue;
      }

      const horariosExistentes = materia.horarios || [];

      // Para cada horário da nova turma
      for (const novoHorario of horariosNovos) {
        if (!novoHorario) continue;

        // Para cada horário da matéria existente
        for (const horarioExistente of horariosExistentes) {
          if (!horarioExistente) continue;

          // Verifica se há conflito
          const conflito = horariosConflitam(novoHorario, horarioExistente);
          if (conflito) {
            return { temConflito: true, materiaConflito: materia.nome };
          }
        }
      }
    }

    return { temConflito: false };
  };

  // Verifica em qual turma a célula pertence (durante o drag)
  const getTurmaIndexParaCelula = (horarioIdx, diaIdx) => {
    if (!draggingMateria) return -1;
    const hora = baseHour + horarioIdx;

    for (let i = 0; i < draggingMateria.turmas.length; i++) {
      const turma = draggingMateria.turmas[i];

      // Se é ANP e está no sábado, aceita no próximo horário disponível
      if (isAnpTurma(turma) && diaIdx === SATURDAY_INDEX) {
        const nextHour = findNextAnpHour(materiasNoCalendario);
        if (nextHour === hora) return i;
        continue;
      }

      // Turma normal: verificar horários
      for (const h of (turma.horarios || [])) {
        const hd = normalizeDia(h.dia);
        const hStart = parseHour(h.inicio);
        const hEnd = parseHour(h.fim);
        if (hd === diaIdx && !Number.isNaN(hStart) && !Number.isNaN(hEnd) && hora >= hStart && hora < hEnd) {
          return i;
        }
      }
    }
    return -1;
  };

  // Inicia o drag de uma matéria que já está no calendário
  const handleDragStartFromCalendar = (e, materiaNoCalendario) => {
    // Prevent default mouse/touch behavior early
    e.preventDefault();
    e.stopPropagation();

    // Suporte para touch e mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Encontrar a matéria completa (com todas as turmas) para permitir realocação
    const materiaCompleta = allMateriasList.find(m => m.codigo === materiaNoCalendario.codigo);

    if (!materiaCompleta) {
      // Se não encontrar a matéria completa, usa os dados básicos só para remoção
      setDraggingMateria(materiaNoCalendario);
    } else {
      setDraggingMateria(materiaCompleta);
    }

    setIsDragging(true);
    setDragPosition({ x: clientX, y: clientY });
    setSelectedTurmaIndex(null);
    setDraggingFromCalendar(true); // Arrastando do calendário
  };

  // Inicia o drag
  const handleDragStart = async (e, materia) => {
    console.log('🎯 Tentando arrastar matéria:', materia.nome, materia.codigo);

    // ✅ Verificar se a matéria tem turmas e horários
    if (!materia.turmas || materia.turmas.length === 0) {
      console.log('❌ Matéria sem turmas disponíveis');
      setShakeErrorMateria(materia.codigo);
      setTimeout(() => setShakeErrorMateria(null), 600);
      triggerToast('Esta matéria não possui turmas disponíveis no momento.', 'error');
      return;
    }

    // Verificar se pelo menos uma turma tem horários (exceto ANP)
    const temTurmasComHorarios = materia.turmas.some(turma => {
      if (turma.anp) return true; // ANP é válido mesmo sem horários
      return turma.horarios && turma.horarios.length > 0;
    });

    if (!temTurmasComHorarios) {
      console.log('❌ Nenhuma turma possui horários disponíveis');
      setShakeErrorMateria(materia.codigo);
      setTimeout(() => setShakeErrorMateria(null), 600);
      triggerToast('Esta matéria não possui turmas com horários disponíveis.', 'error');
      return;
    }

    // Use detailed prereq check
    // Adiciona temporariamente a própria matéria ao calendário para permitir co-requisitos do mesmo período
    const materiasNoCalendarioTemp = { ...materiasNoCalendario, [materia.codigo]: materia };
    const det = verificarPreRequisitosDetalhada(materia, materiasAprovadas, materiasNoCalendarioTemp, allMateriasList);

    // Filter all prereq types using confirmed list
    const faltandoForteRaw = det.faltandoForte || [];
    const faltandoForte = faltandoForteRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));

    const faltandoCoreqRaw = det.faltandoCoreq || [];
    const faltandoCoreq = faltandoCoreqRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));

    const faltandoMinimoRaw = det.faltandoMinimo || [];
    const faltandoMinimo = faltandoMinimoRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));

    // If missing forte prerequisites (after filtering confirmados) -> block silently (card already shows lock)
    if (faltandoForte.length > 0) {
      console.log('❌ Bloqueado por pré-requisitos forte:', faltandoForte);
      return; // block
    }

    // If missing coreq (after filtering confirmados) -> block silently
    if (faltandoCoreq.length > 0) {
      console.log('❌ Bloqueado por co-requisitos:', faltandoCoreq);
      return;
    }

    // If missing minimo prerequisites (after filtering confirmados) -> block silently
    if (faltandoMinimo.length > 0) {
      console.log('❌ Bloqueado por pré-requisitos mínimos:', faltandoMinimo);
      return;
    }

    if (materiasNoCalendario[materia.codigo]) {
      console.log('❌ Matéria já está no calendário');
      return;
    }

    console.log('✅ Matéria passou nas verificações de pré-requisitos');
    console.log('📚 Turmas da matéria:', materia.turmas?.map(t => ({
      id: t.id,
      horarios: t.horarios,
      anp: t.anp
    })));

    // Prevent default mouse/touch behavior early
    e.preventDefault();


    // Suporte para touch e mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Now enable dragging state
    setDraggingMateria(materia);
    setIsDragging(true);
    setDragPosition({ x: clientX, y: clientY });
    setSelectedTurmaIndex(null);
    setDraggingFromCalendar(false); // Arrastando da sidebar
  };

  // Durante o drag
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  // Quando passa o mouse sobre uma célula do calendário
  const handleCellHover = (horarioIdx, diaIdx) => {
    if (!isDragging || !draggingMateria) return;

    const turmaIndex = getTurmaIndexParaCelula(horarioIdx, diaIdx);
    if (turmaIndex !== -1) {
      setSelectedTurmaIndex(turmaIndex);
    }
  };

  // Finaliza o drag
  const handleMouseUp = (e) => {
    handledDropRef.current = true;

    if (!isDragging || !draggingMateria) {
      resetDrag();
      return;
    }

    // Suporte para touch e mouse
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

    // Se estava arrastando do calendário
    if (draggingFromCalendar) {
      // Verificar se soltou na sidebar (área de matérias disponíveis)
      const sidebar = document.querySelector('.calendar__sidebar');
      if (sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect();
        const isInsideSidebar =
          clientX >= sidebarRect.left &&
          clientX <= sidebarRect.right &&
          clientY >= sidebarRect.top &&
          clientY <= sidebarRect.bottom;

        if (isInsideSidebar) {
          // Remover a matéria do calendário
          onRemoveMateria(draggingMateria.codigo);
          resetDrag();
          return;
        }
      }

      // Se não soltou na sidebar, verificar se soltou em outra célula do calendário
      const calendarTable = calendarTableRef.current;
      if (calendarTable) {
        const rect = calendarTable.getBoundingClientRect();
        const isInsideCalendar =
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom;

        if (isInsideCalendar) {
          // Encontrar a célula de destino e realocar
          try {
            const thead = calendarTable.querySelector('thead');
            const tbody = calendarTable.querySelector('tbody');
            const headerCells = Array.from(thead.querySelectorAll('th'));

            // find which header cell contains the x
            let foundHeaderIndex = headerCells.findIndex(h => {
              const hr = h.getBoundingClientRect();
              return clientX >= hr.left && clientX <= hr.right;
            });

            if (foundHeaderIndex === -1) {
              const timeCol = headerCells[0];
              const timeW = timeCol ? timeCol.getBoundingClientRect().width : rect.width * 0.12;
              const relativeX = clientX - rect.left - timeW;
              const contentW = rect.width - timeW;
              const approxCol = Math.floor((relativeX / contentW) * DIAS_SEMANA.length);
              foundHeaderIndex = approxCol + 1;
            }

            const dayIndex = Math.max(0, foundHeaderIndex - 1);
            const tbodyRect = tbody.getBoundingClientRect();
            const rowHeight = tbodyRect.height / Math.max(1, horarios.length);
            const yInBody = clientY - tbodyRect.top;
            const targetHorarioIdx = Math.min(horarios.length - 1, Math.max(0, Math.floor(yInBody / rowHeight)));

            // Verificar se a célula de destino está ocupada
            const ocupadas = getMateriasEmCelula(targetHorarioIdx, dayIndex);
            const materiaAtual = ocupadas.find(m => m.codigo === draggingMateria.codigo);

            // Se é a mesma célula onde já está, não fazer nada
            if (materiaAtual) {
              resetDrag();
              return;
            }

            // Se há outra matéria na célula, mostrar erro
            if (ocupadas && ocupadas.length > 0) {
              triggerToast('Horário já ocupado por outra matéria.', 'error');
              resetDrag();
              return;
            }

            // Tentar realocar a matéria
            const materiaCompleta = allMateriasList.find(m => m.codigo === draggingMateria.codigo);
            if (materiaCompleta && materiaCompleta.turmas) {
              const turmaIndex = getTurmaIndexParaCelula(targetHorarioIdx, dayIndex);

              if (turmaIndex !== -1) {
                const turma = materiaCompleta.turmas[turmaIndex];
                const conflitResult = verificarConflito(turma);

                if (conflitResult.temConflito) {
                  triggerToast(`Conflito de horário com ${conflitResult.materiaConflito || conflitResult.mensagem}!`, 'error');
                  resetDrag();
                  return; // ✅ CRUCIAL: Não continuar se há conflito!
                } else {
                  // Remover da posição atual e adicionar na nova
                  onRemoveMateria(draggingMateria.codigo);

                  // O App.jsx vai lidar com a alocação ANP corretamente
                  onAddMateria({
                    ...materiaCompleta,
                    turmaId: turma.id,
                    horarios: turma.horarios,
                    anp: turma.anp === true,
                    turmaAnp: turma.anp === true
                  });
                  // Removida notificação de realocação - não queremos isso
                }
              }
            }
          } catch (err) {
            triggerToast('Erro ao realocar matéria', 'error');
          }
        } else {
          // Se soltou fora do calendário e da sidebar, manter na posição original
          resetDrag();
          return;
        }
      }
    } else {
      // Comportamento original para drag da sidebar
      // Verifica se soltou dentro do calendário
      const calendarTable = calendarTableRef.current;
      if (calendarTable) {
        const rect = calendarTable.getBoundingClientRect();
        const isInsideCalendar =
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom;

        if (isInsideCalendar) {
          // If user hasn't hovered/select a turma, compute target cell from mouse coords
          let turmaIdxToUse = selectedTurmaIndex;
          let targetHorarioIdx = null;
          let targetDiaIdx = null;

          if (turmaIdxToUse === null) {
            try {
              const thead = calendarTable.querySelector('thead');
              const tbody = calendarTable.querySelector('tbody');
              const headerCells = Array.from(thead.querySelectorAll('th'));

              // find which header cell contains the x
              let foundHeaderIndex = headerCells.findIndex(h => {
                const hr = h.getBoundingClientRect();
                return clientX >= hr.left && clientX <= hr.right;
              });

              if (foundHeaderIndex === -1) {
                // fallback: compute approximate column by proportion
                const timeCol = headerCells[0];
                const timeW = timeCol ? timeCol.getBoundingClientRect().width : rect.width * 0.12;
                const relativeX = clientX - rect.left - timeW;
                const contentW = rect.width - timeW;
                const approxCol = Math.floor((relativeX / contentW) * DIAS_SEMANA.length);
                foundHeaderIndex = approxCol + 1; // +1 because headerCells includes time column
              }

              // map header index to day index (header 0 = time column)
              const dayIndex = Math.max(0, foundHeaderIndex - 1);

              // compute row index inside tbody
              const tbodyRect = tbody.getBoundingClientRect();
              const rowHeight = tbodyRect.height / Math.max(1, horarios.length);
              const yInBody = clientY - tbodyRect.top;
              targetHorarioIdx = Math.min(horarios.length - 1, Math.max(0, Math.floor(yInBody / rowHeight)));
              targetDiaIdx = dayIndex;

              // attempt to find turma index for that cell
              const computedTurmaIndex = getTurmaIndexParaCelula(targetHorarioIdx, targetDiaIdx);
              if (computedTurmaIndex !== -1) {
                turmaIdxToUse = computedTurmaIndex;
              } else if (targetDiaIdx === SATURDAY_INDEX) {
                // saturday fallback: pick first ANP turma if any
                const anpIdx = (draggingMateria.turmas || []).findIndex(t => isAnpTurma(t));
                if (anpIdx !== -1) turmaIdxToUse = anpIdx;
              }
            } catch (err) {
              // parsing failed; leave turmaIdxToUse as null
              // console.warn('could not compute cell from mouse coords', err);
            }
          }

          // If we have a resolved turma index, proceed like before
          if (turmaIdxToUse !== null && turmaIdxToUse !== -1) {
            const turma = draggingMateria.turmas[turmaIdxToUse];

            // If we computed a concrete target cell, ensure it's empty (no overlapping cell item)
            if (typeof targetHorarioIdx === 'number' && typeof targetDiaIdx === 'number') {
              const ocupadas = getMateriasEmCelula(targetHorarioIdx, targetDiaIdx);
              if (ocupadas && ocupadas.length > 0) {
                triggerToast('Horário já ocupado por outra matéria.', 'error');
                resetDrag();
                return;
              }
            }

            const conflitResult = verificarConflito(turma);
            const temConflito = conflitResult.temConflito;
            const materiaConflito = conflitResult.materiaConflito || conflitResult.mensagem;


            if (temConflito) {
              triggerToast(`Conflito de horário com ${materiaConflito}!`, 'error');
              resetDrag();
              return; // ✅ CRUCIAL: Não continuar se há conflito!
            } else {
              // Verificação de limite de crédito
              const currentTotal = calcTotalCreditos();
              const materiaCred = draggingMateria.creditos || 0;
              const novoTotal = currentTotal + materiaCred;

              if (currentTotal >= CREDIT_MAX) {
                triggerToast(`Limite de créditos atingido (${CREDIT_MAX}). Remova matérias para adicionar mais.`, 'error');
              } else if (novoTotal > CREDIT_MAX) {
                triggerToast('Adicionar esta matéria excederia o limite de 32 créditos.', 'error');
              } else {
                // Criar dados da matéria - o App.jsx vai lidar com a alocação ANP corretamente
                const materiaData = {
                  ...draggingMateria,
                  turmaId: turma.id,
                  horarios: turma.horarios,
                  anp: turma.anp === true,
                  turmaAnp: turma.anp === true
                };

                const added = onAddMateria(materiaData);
                if (!added) {
                  triggerToast('Não foi possível adicionar a matéria.', 'error');
                }
              }
            }
          }
        }
      }
    }

    resetDrag();
  };

  const resetDrag = () => {
    setDraggingMateria(null);
    setIsDragging(false);
    setSelectedTurmaIndex(null);
    setDraggingFromCalendar(false);
    handledDropRef.current = false;
  };

  // Verifica se uma célula faz parte de alguma turma da matéria sendo arrastada
  const getCellPreviewInfo = (horarioIdx, diaIdx) => {
    if (!isDragging || !draggingMateria) return null;

    const hora = baseHour + horarioIdx;
    const materiasExistentes = getMateriasEmCelula(horarioIdx, diaIdx);

    for (let i = 0; i < draggingMateria.turmas.length; i++) {
      const turma = draggingMateria.turmas[i];

      // Se é ANP e está no sábado, preview no próximo horário disponível
      if (isAnpTurma(turma) && diaIdx === SATURDAY_INDEX) {
        const nextHour = findNextAnpHour(materiasNoCalendario);
        if (!nextHour) {
          return { turmaIndex: i, turmaId: turma.id, cor: getCorTurma(i), isSelected: false, hasConflict: true };
        }
        const isCorrectRow = (hora === nextHour);
        if (!isCorrectRow) continue;

        return {
          turmaIndex: i,
          turmaId: turma.id,
          cor: getCorTurma(i),
          isSelected: selectedTurmaIndex === i,
          hasConflict: false
        };
      }

      // Turma normal: verificar horários
      for (const h of (turma.horarios || [])) {
        const hd = normalizeDia(h.dia);
        const hStart = parseHour(h.inicio);
        const hEnd = parseHour(h.fim);
        if (hd === diaIdx && !Number.isNaN(hStart) && !Number.isNaN(hEnd) && hora >= hStart && hora < hEnd) {
          const { temConflito } = verificarConflito(turma);
          return {
            turmaIndex: i,
            turmaId: turma.id,
            cor: getCorTurma(i),
            isSelected: selectedTurmaIndex === i,
            hasConflict: temConflito || (materiasExistentes.length > 0)
          };
        }
      }
    }
    return null;
  };

  // Componente de aviso quando não há matérias na seção filtrada
  const renderEmptyFilterWarning = (sectionName) => (
    <div className="calendar__empty-filter-warning">
      <div className="calendar__empty-filter-icon">
        <i className="fi fi-br-search"></i>
      </div>
      <div className="calendar__empty-filter-content">
        <h5>Sem disciplinas</h5>
        <p>Nenhuma disciplina {sectionName.toLowerCase()} encontrada para o filtro aplicado.</p>
      </div>
    </div>
  );

  // ---------- Export to Google Calendar (.ics) helpers temporarily disabled ----------
  // Export functionality removed for now (unused) to avoid linting/CI failures.

  const totalCreditos = calcTotalCreditos();
  let creditClass = '';
  if (totalCreditos >= CREDIT_MAX) creditClass = 'calendar__credits--danger';
  else if (totalCreditos > CREDIT_WARN) creditClass = 'calendar__credits--warn';
  const { obrigatorias, pendentes, eletivas: eletivasDisponiveis } = getMateriasDisponiveis();


  const renderMateriaCard = (materia, tipo = 'obrigatoria') => {
    const jaNoCalendario = materiasNoCalendario[materia.codigo];
    // Adiciona temporariamente a própria matéria ao calendário para permitir co-requisitos do mesmo período
    const materiasNoCalendarioTemp = { ...materiasNoCalendario, [materia.codigo]: materia };
    const det = verificarPreRequisitosDetalhada(materia, materiasAprovadas, materiasNoCalendarioTemp, allMateriasList);

    // Filter ALL prereq types using confirmed list so confirmed prereqs are ignored
    const faltandoForteRaw = det.faltandoForte || [];
    const faltandoForte = faltandoForteRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));

    const faltandoMinimoRaw = det.faltandoMinimo || [];
    const faltandoMinimo = faltandoMinimoRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));

    const faltandoCoreqRaw = det.faltandoCoreq || [];
    const faltandoCoreq = faltandoCoreqRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));

    // If all prereqs have been confirmed, consider the materia "destravada" (cumpridoAdjusted)
    const cumpridoAdjusted = (faltandoForte.length === 0) && (faltandoCoreq.length === 0) && (faltandoMinimo.length === 0);

    const isBeingDragged = isDragging && draggingMateria?.codigo === materia.codigo;

    if (jaNoCalendario) return null;

    // Aplicar filtro de horário
    if (!materiaSeEncaixaNoFiltro(materia)) return null;

    const cardClasses = [
      'materia-card',
      tipo === 'pendente' && 'materia-card--pending',
      tipo === 'eletiva' && 'materia-card--elective',
      !cumpridoAdjusted && 'materia-card--blocked',
      isBeingDragged && 'materia-card--dragging-origin',
      shakeErrorMateria === materia.codigo && 'shake-error'
    ].filter(Boolean).join(' ');

    // determine visual indicator color for missing type
    let missingBadge = null;
    if (faltandoForte.length > 0) missingBadge = { color: 'red', text: `Falta: ${faltandoForte.map(f => getNomeMateria(f)).join(', ')}` };
    else if (faltandoMinimo.length > 0) missingBadge = { color: 'orange', text: `Mínimo: ${faltandoMinimo.map(f => getNomeMateria(f)).join(', ')}` };
    else if (faltandoCoreq.length > 0) missingBadge = { color: '#F9DC5C', text: `Co-req: ${faltandoCoreq.map(f => getNomeMateria(f)).join(', ')}` };

    return (
      <div
        key={materia.codigo}
        className={cardClasses}
        onMouseDown={(e) => !isMobile && cumpridoAdjusted && handleDragStart(e, materia)}
        onTouchStart={(e) => !isMobile && cumpridoAdjusted && handleDragStart(e, materia)}
        onClick={(e) => {
          // No mobile, clicar no card abre as informações
          if (isMobile && cumpridoAdjusted) {
            e.stopPropagation();
            onMateriaClick?.(materia);
          }
        }}
        style={{
          borderLeftColor: getCorMateria(materia.codigo),
          cursor: isMobile ? (cumpridoAdjusted ? 'pointer' : 'not-allowed') : (cumpridoAdjusted ? 'grab' : 'not-allowed')
        }}
      >
        <div className="materia-card__header">
          <span className="materia-card__name">{materia.nome}</span>
          <button
            className="materia-card__info-btn"
            onClick={(ev) => {
              ev.stopPropagation();
              onMateriaClick?.(materia);
            }}
            title="Ver informações"
          >
            <i className="fi fi-br-menu-dots-vertical"></i>
          </button>
        </div>
        <div className="materia-card__details">
          <span className="materia-card__code">{materia.codigo}</span>
          <span className="materia-card__credits">{materia.creditos} Créditos</span>
          <span className="materia-card__turmas-count">{(materia.turmas||[]).length} turma{(materia.turmas||[]).length > 1 ? 's' : ''}</span>
        </div>

        {tipo === 'pendente' && materia.semestreOriginal && (
          <span className="materia-card__semester-badge">{materia.semestreOriginal}º Sem</span>
        )}

        {/** show blocked info only when not cumpridoAdjusted */}
        {!cumpridoAdjusted && missingBadge && (
          <div className="materia-card__blocked-info" style={{ borderColor: missingBadge.color, color: missingBadge.color }}>
            <i className="fi fi-br-lock"></i>
            <div>{missingBadge.text}</div>

            {/* Para ELETIVAS: mostrar botão de adicionar para qualquer tipo de pré-requisito */}
            {tipo === 'eletiva' && (
              <div className="materia-card__minimo-actions">
                {faltandoForte.length > 0 && (
                  <button
                    className="materia-card__minimo-btn"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openForteConfirm(faltandoForte, materia.codigo);
                    }}
                    title="Confirmar que já cursou este pré-requisito"
                  >
                    Adicionar
                  </button>
                )}
                {faltandoMinimo.length > 0 && faltandoForte.length === 0 && (
                  <button
                    className="materia-card__minimo-btn"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openMinimoConfirm(String(faltandoMinimo[0]), materia.codigo);
                    }}
                    title="Confirmar que cursou e obteve média mínima"
                  >
                    Adicionar
                  </button>
                )}
                {faltandoCoreq.length > 0 && faltandoForte.length === 0 && faltandoMinimo.length === 0 && (
                  <button
                    className="materia-card__minimo-btn"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openCoreqConfirm(faltandoCoreq, materia.codigo);
                    }}
                    title="Confirmar que já cursou este co-requisito"
                  >
                    Adicionar
                  </button>
                )}
              </div>
            )}

            {/* Para NÃO eletivas: manter comportamento antigo (só mínimo quando não tem forte) */}
            {tipo !== 'eletiva' && faltandoMinimo.length > 0 && faltandoForte.length === 0 && (
              <div className="materia-card__minimo-actions">
                <button
                  className="materia-card__minimo-btn"
                  onClick={(ev) => { ev.stopPropagation(); openMinimoConfirm(String(faltandoMinimo[0]), materia.codigo); }}
                  title="Confirmar que cursou e obteve média mínima"
                >
                  Adicionar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Funções para abrir modais de confirmação de pré-requisitos
  const openForteConfirm = (prereqs, parent) => {
    setMinimoModal({
      open: true,
      prereqs: Array.isArray(prereqs) ? prereqs : [prereqs],
      parent,
      tipo: 'forte'
    });
  };

  const openMinimoConfirm = (prereq, parent) => {
    const code = prereq && typeof prereq === 'object' ? (prereq.codigo || prereq.id || '') : String(prereq || '');
    setMinimoModal({
      open: true,
      prereqs: [code],
      parent,
      tipo: 'minimo'
    });
  };

  const openCoreqConfirm = (prereqs, parent) => {
    setMinimoModal({
      open: true,
      prereqs: Array.isArray(prereqs) ? prereqs : [prereqs],
      parent,
      tipo: 'coreq'
    });
  };

  const closeMinimoConfirm = () => {
    setMinimoModal({ open: false, prereqs: [], parent: null, tipo: null });
  };

  const confirmMinimo = () => {
    const { prereqs, tipo } = minimoModal;

    if (!prereqs || prereqs.length === 0) {
      triggerToast('Nenhum pré-requisito para confirmar.', 'error');
      closeMinimoConfirm();
      return;
    }

    // Remove duplicatas da lista de pré-requisitos
    const prereqsUnicos = [...new Set(prereqs.map(p => String(p).trim()))].filter(Boolean);

    // Confirmar todos os pré-requisitos da lista
    prereqsUnicos.forEach(codigo => {
      if (typeof onConfirmMinimo === 'function') {
        onConfirmMinimo(codigo);
      } else {
        try {
          const ev = new CustomEvent('gradeufla-confirm-minimo', { detail: { codigo } });
          window.dispatchEvent(ev);
        } catch (e) {}
      }
    });

    // Mensagem personalizada por tipo (apenas UMA notificação com todos os nomes)
    const nomes = prereqsUnicos.map(p => getNomeMateria(p) || p).join(', ');
    let mensagem;

    if (tipo === 'forte') {
      mensagem = `Pré-requisito(s) forte(s) ${nomes} confirmado(s) como cursado(s).`;
    } else if (tipo === 'minimo') {
      mensagem = `Pré-requisito ${nomes} confirmado como cursado com média mínima.`;
    } else if (tipo === 'coreq') {
      mensagem = `Co-requisito(s) ${nomes} confirmado(s) como cursado(s).`;
    } else {
      mensagem = `Pré-requisito(s) ${nomes} confirmado(s).`;
    }

    triggerToast(mensagem, 'success');
    closeMinimoConfirm();
  };

  return (
    <section
      className="calendar"
      ref={ref}
      id="calendario"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="calendar__header-wrapper">
        <button className="btn-voltar btn-voltar--calendar" onClick={onVoltar}>
          <i className="fi fi-br-arrow-left"></i>
          <span className="btn-voltar__text">Voltar</span>
        </button>
      </div>

      <div className="calendar__layout">
        {/* Sidebar de matérias */}
        <div className={`calendar__sidebar ${isDragging && draggingFromCalendar ? 'calendar__sidebar--drop-zone' : ''}`}>
          <div className="calendar__sidebar-header">
            <h3 className="calendar__sidebar-title">
              <i className="fi fi-br-book-alt"></i>
              <span className="calendar__sidebar-title-text">Matérias Disponíveis</span>
            </h3>
            <div className={`calendar__credits ${creditClass}`}>
              <span>Créditos: <strong>{totalCreditos}</strong></span>
            </div>
          </div>


          <p className="calendar__instructions">
            <span className="calendar__instructions-desktop">
              Arraste uma matéria da lista para o horário desejado.
              Para mover ou remover, arraste a matéria no calendário para outro horário ou de volta para a lista
            </span>
            <span className="calendar__instructions-mobile">
              Clique na matéria da lista e selecione um horário.
              Clique na matéria do calendário para ver informações.
            </span>
          </p>

          {/* Filtro de Horário */}
          <div className="calendar__time-filter">
            <button
              className={`calendar__time-filter-toggle ${filtroHorario.ativo ? 'active' : ''}`}
              onClick={() => setFiltroHorario({ ...filtroHorario, ativo: !filtroHorario.ativo })}
              title="Filtrar matérias por horário ou créditos"
            >
              <i className="fi fi-br-search-alt"></i>
              <span>Filtrar Matérias</span>
              <i className={`fi fi-br-angle-${filtroHorario.ativo ? 'down' : 'right'}`} style={{ marginLeft: 'auto' }}></i>
            </button>

            {filtroHorario.ativo && (
              <div className="calendar__time-filter-content">
                <div className="calendar__time-filter-row">
                  <label htmlFor="filter-dia">Tipo:</label>
                  <select
                    id="filter-dia"
                    value={filtroHorario.isAnp ? 'anp' : (filtroHorario.dia ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'anp') {
                        setFiltroHorario({
                          ...filtroHorario,
                          isAnp: true,
                          dia: null,
                          horaInicio: null,
                          horaFim: null
                        });
                      } else {
                        setFiltroHorario({
                          ...filtroHorario,
                          isAnp: false,
                          dia: val === '' ? null : Number(val)
                        });
                      }
                    }}
                  >
                    <option value="">Qualquer dia</option>
                    <option value="anp">ANP</option>
                    {/* Remover Domingo (0) e Sábado (6) */}
                    {DIAS_SEMANA.slice(1, 6).map((dia, idx) => (
                      <option key={idx + 1} value={idx + 1}>{dia}</option>
                    ))}
                  </select>
                </div>

                {/* Só mostrar horários se não for ANP */}
                {!filtroHorario.isAnp && (
                  <>
                    <div className="calendar__time-filter-row">
                      <label htmlFor="filter-inicio">Hora início:</label>
                  <select
                    id="filter-inicio"
                    value={filtroHorario.horaInicio ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFiltroHorario({
                        ...filtroHorario,
                        horaInicio: val === '' ? null : Number(val)
                      });
                    }}
                  >
                    <option value="">-</option>
                    {gerarHorarios(7, 23).map((h, idx) => (
                      <option key={idx} value={7 + idx}>{h}</option>
                    ))}
                  </select>
                </div>

                <div className="calendar__time-filter-row">
                  <label htmlFor="filter-fim">Hora fim:</label>
                  <select
                    id="filter-fim"
                    value={filtroHorario.horaFim ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFiltroHorario({
                        ...filtroHorario,
                        horaFim: val === '' ? null : Number(val)
                      });
                    }}
                  >
                    <option value="">-</option>
                    {gerarHorarios(7, 24).map((h, idx) => (
                      <option key={idx} value={7 + idx}>{h}</option>
                    ))}
                  </select>
                </div>
                </>
                )}

                {/* Filtro de Créditos */}
                <div className="calendar__time-filter-row">
                  <label htmlFor="filter-creditos">Créditos:</label>
                  <select
                    id="filter-creditos"
                    value={filtroHorario.creditos ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFiltroHorario({
                        ...filtroHorario,
                        creditos: val === '' ? null : Number(val)
                      });
                    }}
                  >
                    <option value="">Qualquer</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((cred) => (
                      <option key={cred} value={cred}>{cred} crédito{cred > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                {(filtroHorario.dia !== null || filtroHorario.horaInicio !== null || filtroHorario.horaFim !== null || filtroHorario.isAnp || filtroHorario.creditos !== null) && (
                  <button
                    className="calendar__time-filter-clear"
                    onClick={() => setFiltroHorario({ ativo: true, dia: null, horaInicio: null, horaFim: null, isAnp: false, creditos: null })}
                    title="Limpar filtros"
                  >
                    <i className="fi fi-br-broom"></i>
                    <span>Limpar Filtros</span>
                  </button>
                )}

                <p className="calendar__time-filter-hint">
                  {filtroHorario.isAnp
                    ? 'Mostrando apenas matérias exclusivamente ANP'
                    : filtroHorario.dia !== null || filtroHorario.horaInicio !== null || filtroHorario.horaFim !== null
                    ? `Mostrando matérias com turmas disponíveis${filtroHorario.dia !== null ? ` às ${DIAS_SEMANA[filtroHorario.dia]}s` : ''}${filtroHorario.horaInicio !== null ? ` das ${String(filtroHorario.horaInicio).padStart(2, '0')}:00` : ''}${filtroHorario.horaFim !== null ? ` às ${String(filtroHorario.horaFim).padStart(2, '0')}:00` : ''}`
                    : 'Configure o filtro acima para buscar matérias em horários específicos ou exclusivamente ANP'}
                </p>
              </div>
            )}
          </div>

          {/* Matérias Obrigatórias */}
          <div className="calendar__category">
            <h4 className="calendar__category-title">
              <i className="fi fi-br-bookmark calendar__category-icon"></i>
              Obrigatórias
            </h4>
            <div className="calendar__materias">
              {(() => {
                // Filtrar matérias que podem ser renderizadas (não estão no calendário e passam no filtro)
                const materiasRenderizaveis = obrigatorias.filter(materia => {
                  const jaNoCalendario = materiasNoCalendario[materia.codigo];
                  if (jaNoCalendario) return false;
                  return materiaSeEncaixaNoFiltro(materia);
                });

                // Se não há matérias renderizáveis
                if (materiasRenderizaveis.length === 0) {
                  // Se há obrigatórias mas filtro está ativo (filtrou todas)
                  if (filtroHorario.ativo && obrigatorias.some(m => !materiasNoCalendario[m.codigo])) {
                    return renderEmptyFilterWarning('obrigatórias');
                  }
                  // Se todas as obrigatórias estão no calendário OU não há obrigatórias, mostrar parabéns
                  else {
                    return (
                      <div className="calendar__empty-filter-warning">
                        <div className="calendar__empty-filter-icon">
                          <i className="fi fi-br-check"></i>
                        </div>
                        <div className="calendar__empty-filter-content">
                          <h5>Parabéns! 🎉</h5>
                          <p>Todas as matérias obrigatórias do semestre ja estão na sua grade!</p>
                        </div>
                      </div>
                    );
                  }
                }

                return materiasRenderizaveis.map(materia => renderMateriaCard(materia, 'obrigatoria'));
              })()}
            </div>
          </div>

          {/* Matérias Pendentes de Semestres Anteriores */}
          {pendentes.length > 0 && (
            <div className="calendar__category">
              <h4 className="calendar__category-title calendar__category-title--pending">
                <i className="fi fi-br-triangle-warning calendar__category-icon"></i>
                Pendentes (Anteriores)
              </h4>
              <div className="calendar__materias">
                {(() => {
                  const materiasFiltradas = pendentes.filter(materia => materiaSeEncaixaNoFiltro(materia));
                  if (filtroHorario.ativo && materiasFiltradas.length === 0) {
                    return renderEmptyFilterWarning('pendentes');
                  }
                  return materiasFiltradas.map(materia => renderMateriaCard(materia, 'pendente'));
                })()}
              </div>
            </div>
          )}

          {/* Toggle Eletivas */}
          <div className="calendar__category">
            <button
              className="calendar__electives-toggle"
              onClick={() => {
                const next = !mostrarEletivas;
                setMostrarEletivas(next);
                setMostrarFuturas(false);
                if (!next) setEletivasQuery(''); // clear search when closing
              }}
            >
              <i className="fi fi-br-bullseye-pointer calendar__category-icon"></i>
              <span>Eletivas</span>
              {mostrarEletivas && (
                <input
                  type="text"
                  className="calendar__eletivas-search"
                  placeholder="Pesquisar..."
                  value={eletivasQuery}
                  onChange={(e) => setEletivasQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <i className={`fi fi-br-angle-${mostrarEletivas ? 'down' : 'right'} calendar__toggle-icon`}></i>
            </button>

            {mostrarEletivas && (
              <div className="calendar__materias" style={{ marginTop: '10px' }}>
                {eletivasDisponiveis.length === 0 ? (
                  <p className="calendar__no-electives">
                    Nenhuma eletiva disponível.
                  </p>
                ) : (
                  (() => {
                    // group by subgrupo string coming from CSV (use exact label in CSV)
                    const groups = eletivasDisponiveis.reduce((acc, m) => {
                      const raw = (m.subgrupo || 'Outros').toString().trim();
                      const key = raw || 'Outros';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(m);
                      return acc;
                    }, {});

                    // order keys so consistent display (you can customize order later)
                    const orderedKeys = Object.keys(groups).sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

                    const renderedGroups = orderedKeys.map(key => {
                      const label = key.toString();
                      const title = label;
                      const filteredMaterias = groups[key]
                        .filter(materia => materia.nome.toLowerCase().includes(eletivasQuery.toLowerCase()))
                        .filter(materia => materiaSeEncaixaNoFiltro(materia));

                      if (filteredMaterias.length === 0) {
                        // Se o filtro de horário está ativo e não há matérias, mostrar aviso
                        if (filtroHorario.ativo && groups[key].filter(materia => materia.nome.toLowerCase().includes(eletivasQuery.toLowerCase())).length > 0) {
                          return (
                            <div key={key} className="calendar__eletiva-group">
                              {label.toLowerCase() !== 'outros' && (
                                <h5 className="calendar__eletiva-group-title">{title}</h5>
                              )}
                              <div className="calendar__eletiva-group-list">
                                {renderEmptyFilterWarning('eletivas')}
                              </div>
                            </div>
                          );
                        }
                        return null; // skip empty groups
                      }

                      return (
                        <div key={key} className="calendar__eletiva-group">
                          {label.toLowerCase() !== 'outros' && (
                            <h5 className="calendar__eletiva-group-title">{title}</h5>
                          )}
                          <div className="calendar__eletiva-group-list">
                            {filteredMaterias.map(materia => renderMateriaCard(materia, 'eletiva'))}
                          </div>
                        </div>
                      );
                    }).filter(group => group !== null);

                    // Se não há grupos renderizados e o filtro está ativo, mostrar aviso geral
                    if (renderedGroups.length === 0 && filtroHorario.ativo) {
                      return renderEmptyFilterWarning('eletivas');
                    }

                    return renderedGroups;
                  })()
                 )}
               </div>
             )}

             {/* Toggle Matérias Futuras */}
             <button
               className="calendar__futuras-toggle"
               onClick={() => {
                 const next = !mostrarFuturas;
                 setMostrarFuturas(next);
                 setMostrarEletivas(false);
                 if (!next) setFuturasQuery(''); // clear search when closing
               }}
               style={{ marginTop: '12px' }}
             >
               <i className="fi fi-br-rocket calendar__category-icon"></i>
               <span>Matérias Futuras</span>
               {mostrarFuturas && (
                 <input
                   type="text"
                   className="calendar__eletivas-search"
                   placeholder="Pesquisar..."
                   value={futurasQuery}
                   onChange={(e) => setFuturasQuery(e.target.value)}
                   onClick={(e) => e.stopPropagation()}
                 />
               )}
               <i className={`fi fi-br-angle-${mostrarFuturas ? 'down' : 'right'} calendar__toggle-icon`}></i>
             </button>

             {mostrarFuturas && (
               <div className="calendar__materias" style={{ marginTop: '10px' }}>
                 {(() => {
                   const startSem = Number(semestreAtual) || 1;
                   // collect materias only from semesters strictly greater than current
                   const grupos = {};
                   Object.keys(materiasPorSemestre)
                     .map(k => Number(k))
                     .filter(kNum => !Number.isNaN(kNum) && kNum > startSem)
                     .sort((a, b) => a - b)
                     .forEach(kNum => {
                       const list = materiasPorSemestre[kNum] || [];
                       const filtered = list.filter(m => !materiasAprovadas.includes(m.codigo) && !materiasNoCalendario[m.codigo]);
                       if (filtered.length > 0) grupos[kNum] = filtered;
                     });

                   if (Object.keys(grupos).length === 0) {
                     return <p className="calendar__no-electives">Nenhuma matéria futura disponível.</p>;
                   }

                   // filter each group's materias by futurasQuery (search by name or code)
                   const renderedGroups = Object.keys(grupos).sort((a,b)=>Number(a)-Number(b)).map(key => {
                     const sem = Number(key);
                     const lista = grupos[key];
                     const query = (futurasQuery || '').toLowerCase().trim();
                     const filteredByQuery = query
                       ? lista.filter(m => (m.nome || '').toLowerCase().includes(query) || (m.codigo || '').toLowerCase().includes(query))
                       : lista;
                     const filteredByHorario = filteredByQuery.filter(m => materiaSeEncaixaNoFiltro(m));

                     if (filteredByHorario.length === 0) {
                       // Se o filtro de horário está ativo e não há matérias, mostrar aviso
                       if (filtroHorario.ativo && filteredByQuery.length > 0) {
                         return (
                           <div key={key} className="calendar__eletiva-group">
                             <h5 className="calendar__eletiva-group-title">{sem}º Semestre</h5>
                             <div className="calendar__eletiva-group-list">
                               {renderEmptyFilterWarning('futuras')}
                             </div>
                           </div>
                         );
                       }
                       return null;
                     }

                     return (
                       <div key={key} className="calendar__eletiva-group">
                         <h5 className="calendar__eletiva-group-title">{sem}º Semestre</h5>
                         <div className="calendar__eletiva-group-list">
                           {filteredByHorario.map(materia => renderMateriaCard(materia, 'futura'))}
                         </div>
                       </div>
                     );
                   }).filter(group => group !== null);

                   // Se não há grupos renderizados e o filtro está ativo, mostrar aviso geral
                   if (renderedGroups.length === 0 && filtroHorario.ativo) {
                     return renderEmptyFilterWarning('futuras');
                   }

                   return renderedGroups;
                 })()}
               </div>
             )}
           </div>
        </div>

        {/* Calendário */}
        <div className="calendar__wrapper" ref={wrapperRef}>
           <div className="calendar__title-container">
             <h2 className="calendar__title">Sua Grade - {semestreAtual}º Semestre</h2>

             {/* Download PNG button */}
             <button className="calendar__download" onClick={handleDownloadPNG} title="Baixar PNG da grade">
               <i className="fi fi-br-download" aria-hidden="true" />
             </button>

            {/* Popup flutuante - Legenda das turmas durante o drag */}
            {isDragging && draggingMateria && (
              <div className="calendar__turmas-popup">
                <span className="calendar__turmas-popup-title">Escolha uma turma:</span>
                <div className="calendar__turmas-popup-items">
                  {(draggingMateria.turmas || []).map((turma, index) => {
                    const { temConflito } = verificarConflito(turma);
                    return (
                      <div
                        key={turma.id}
                        className={`calendar__turmas-popup-item ${selectedTurmaIndex === index ? 'calendar__turmas-popup-item--selected' : ''} ${temConflito ? 'calendar__turmas-popup-item--conflito' : ''}`}
                        style={{ borderColor: getCorTurma(index) }}
                      >
                        <span className="calendar__turmas-popup-color" style={{ backgroundColor: getCorTurma(index) }}></span>
                        <span>Turma {turma.id}</span>
                        {temConflito && <i className="fi fi-br-triangle-warning calendar__turmas-popup-conflito"></i>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="calendar__container">
            <table className="calendar__table" ref={calendarTableRef}>
              <thead>
                <tr>
                  <th className="calendar__col-time">Hora</th>
                  {DIAS_SEMANA.map((dia, index) => (
                    <th key={index} className="calendar__col-day">{dia}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horarios.map((horario, indexHora) => (
                  <tr key={indexHora}>
                    <td className="calendar__cell-time">{horario}</td>
                    {DIAS_SEMANA.map((_, indexDia) => {
                      const materiasEmCelula = getMateriasEmCelula(indexHora, indexDia);
                      const previewInfo = getCellPreviewInfo(indexHora, indexDia);

                      // Determinar tipo da primeira matéria na célula
                      const tipoMateria = materiasEmCelula.length > 0 ? getTipoMateria(materiasEmCelula[0].codigo) : null;

                      const cellClasses = [
                        'calendar__cell',
                        materiasEmCelula.length > 0 && 'calendar__cell--has-subject',
                        tipoMateria === 'eletiva' && 'calendar__cell--eletiva',
                        tipoMateria === 'futura' && 'calendar__cell--futura',
                        tipoMateria === 'obrigatoria' && 'calendar__cell--obrigatoria',
                        previewInfo && !previewInfo.hasConflict && 'calendar__cell--preview',
                        previewInfo?.hasConflict && 'calendar__cell--preview-conflito',
                        previewInfo?.isSelected && 'calendar__cell--preview-selected'
                      ].filter(Boolean).join(' ');

                      return (
                        <td
                          key={indexDia}
                          className={cellClasses}
                          style={
                            materiasEmCelula.length > 0
                              ? {
                                  backgroundColor: getCorMateria(materiasEmCelula[0].codigo),
                                  cursor: isMobile ? 'pointer' : 'grab'
                                }
                              : previewInfo
                                ? {
                                    backgroundColor: previewInfo.hasConflict
                                      ? 'rgba(232, 72, 85, 0.2)'
                                      : `${previewInfo.cor}33`,
                                    borderColor: previewInfo.cor
                                  }
                                : {}
                          }
                          onMouseDown={(e) => {
                            // Se a célula tem matéria e não clicou no botão de remover, iniciar drag (desktop)
                            if (materiasEmCelula.length > 0 && !isMobile) {
                              if (e.target.closest('.calendar__cell-remove')) return;
                              handleDragStartFromCalendar(e, materiasEmCelula[0]);
                            }
                          }}
                          onClick={(e) => {
                            // Se clicou no botão de info, não fazer nada aqui (o botão trata)
                            if (e.target.closest('.calendar__cell-info')) return;
                            // No mobile, clicar na célula abre o modal. No desktop, não faz nada (só drag)
                            if (isMobile && materiasEmCelula && materiasEmCelula.length > 0) {
                              e.stopPropagation();
                              onMateriaClick?.(materiasEmCelula[0]);
                            }
                          }}
                          onMouseEnter={() => handleCellHover(indexHora, indexDia)}
                        >
                          {materiasEmCelula.length > 0 && (
                            <div className="calendar__cell-subjects">
                              {materiasEmCelula.map((mec) => (
                                <div
                                  key={mec.codigo}
                                  className="calendar__cell-subject"
                                >
                                  <span className="calendar__cell-subject-name">{mec.nome}</span>
                                  <button
                                    className={`calendar__cell-info ${isMobile ? 'calendar__cell-info--mobile-hidden' : ''}`}
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      ev.preventDefault();
                                      onMateriaClick?.(mec);
                                    }}
                                    onMouseDown={(ev) => {
                                      ev.stopPropagation();
                                      ev.preventDefault();
                                    }}
                                    title="Ver informações"
                                  >
                                    <i className="fi fi-br-menu-dots-vertical"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {previewInfo && !(materiasEmCelula && materiasEmCelula.length) && (
                            <div
                              className="calendar__cell-preview-content"
                              style={{ color: previewInfo.cor }}
                            >
                              {/* preview of turma removed per request */}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="calendar__legend">
            {(() => {
              // Separar matérias por tipo
              const obrigatorias = [];
              const eletivas = [];
              const futuras = [];

              Object.entries(materiasNoCalendario).forEach(([codigo, m]) => {
                const tipo = getTipoMateria(codigo);
                const item = { codigo, ...m };

                if (tipo === 'eletiva') {
                  eletivas.push(item);
                } else if (tipo === 'futura') {
                  futuras.push(item);
                } else {
                  obrigatorias.push(item);
                }
              });

              return (
                <>
                  {obrigatorias.length > 0 && (
                    <div className="calendar__legend-section">
                      <h4 className="calendar__legend-section-title">Obrigatórias</h4>
                      <div className="calendar__legend-items">
                        {obrigatorias.map((m) => (
                          <div key={m.codigo} className="calendar__legend-item">
                            <span
                              className="calendar__legend-color"
                              style={{ backgroundColor: getCorMateria(m.codigo) }}
                            ></span>
                            <span className="calendar__legend-text">
                              {m.nome}
                              {m.turmaId && <span className="calendar__legend-turma"> - Turma {m.turmaId}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {eletivas.length > 0 && (
                    <div className="calendar__legend-section">
                      <h4 className="calendar__legend-section-title">Eletivas</h4>
                      <div className="calendar__legend-items">
                        {eletivas.map((m) => (
                          <div key={m.codigo} className="calendar__legend-item calendar__legend-item--eletiva">
                            <span
                              className="calendar__legend-color calendar__legend-color--eletiva"
                              style={{ backgroundColor: getCorMateria(m.codigo) }}
                            ></span>
                            <span className="calendar__legend-text">
                              {m.nome}
                              {m.turmaId && <span className="calendar__legend-turma"> - Turma {m.turmaId}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {futuras.length > 0 && (
                    <div className="calendar__legend-section">
                      <h4 className="calendar__legend-section-title">Futuras</h4>
                      <div className="calendar__legend-items">
                        {futuras.map((m) => (
                          <div key={m.codigo} className="calendar__legend-item calendar__legend-item--futura">
                            <span
                              className="calendar__legend-color calendar__legend-color--futura"
                              style={{ backgroundColor: getCorMateria(m.codigo) }}
                            ></span>
                            <span className="calendar__legend-text">
                              {m.nome}
                              {m.turmaId && <span className="calendar__legend-turma"> - Turma {m.turmaId}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="calendar__footer">
            <p className="calendar__footer-text">
              Não se esqueça de fazer sua matrícula no SIG! Este aplicativo não tem nenhum vínculo com a UFLA.<br />
              Os horarios das turmas são baseados nos dados oficiais, mas podem sofrer alterações pela universidade. Use como guia, mas sempre confirme no SIG.<br />
              Banco de dados atualizado em 20/02/26 - 12:00 | Matriz 2026/1
            </p>
          </div>
        </div>
      </div>

      {/* Elemento flutuante durante o drag */}
      {isDragging && draggingMateria && (
        <div
          className="drag-ghost"
          style={{
            left: dragPosition.x - 80,
            top: dragPosition.y - 25,
            backgroundColor: getCorMateria(draggingMateria.codigo)
          }}
        >
          <span>{draggingMateria.nome}</span>
        </div>
      )}

      {/* Modal for minimo confirm */}
      {minimoModal.open && (
        <div className="minimo-modal-overlay" onClick={closeMinimoConfirm}>
          <div className="minimo-modal" onClick={(e) => e.stopPropagation()}>
            {minimoModal.tipo === 'forte' && (
              <>
                <h3>Confirmação - Pré-requisito Forte</h3>
                <p>
                  Você já cursou e foi <strong>aprovado</strong> em{' '}
                  <strong>{minimoModal.prereqs.map(p => getNomeMateria(p)).join(', ')}</strong>?
                </p>
                <p style={{ fontSize: '0.9rem', color: '#a3a3a3', marginTop: '8px' }}>
                  Você só pode cursar esta matéria se tiver sido <strong>aprovado</strong> em{' '}
                  <strong>{minimoModal.prereqs.map(p => getNomeMateria(p)).join(', ')}</strong>.
                </p>
              </>
            )}

            {minimoModal.tipo === 'minimo' && (
              <>
                <h3>Confirmação - Pré-requisito Mínimo</h3>
                <p>
                  Você já cursou <strong>{getNomeMateria(minimoModal.prereqs[0])}</strong> sem ter sido
                  reprovado por frequência e obteve média final mínima (≥ 50 pontos)?
                </p>
              </>
            )}

            {minimoModal.tipo === 'coreq' && (
              <>
                <h3>Confirmação - Co-requisito</h3>
                <p>
                  Você já cursou e foi <strong>aprovado</strong> em{' '}
                  <strong>{minimoModal.prereqs.map(p => getNomeMateria(p)).join(', ')}</strong>?
                </p>
                <p style={{ fontSize: '0.9rem', color: '#a3a3a3', marginTop: '8px' }}>
                  Para cursar esta matéria, você deve estar <strong>aprovado</strong> em{' '}
                  <strong>{minimoModal.prereqs.map(p => getNomeMateria(p)).join(', ')}</strong> ou{' '}
                  <strong>cursá-la(s) junto</strong> no mesmo semestre.
                </p>
              </>
            )}

            <div className="minimo-modal-actions">
              <button className="btn btn-secondary" onClick={closeMinimoConfirm}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmMinimo}>Sim, destravar materia</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

Calendar.displayName = 'Calendar';

export default Calendar;
// nao use pessoas, use drogas