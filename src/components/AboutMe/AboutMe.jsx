import { useState } from 'react';
import './AboutMe.css';

const AboutMe = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="aboutme-root">
      <button
        className="aboutme-button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-label="Sobre"
        title="Sobre"
      >
        {/* info icon: circle with an 'i' using currentColor */}
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="aboutme-icon">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
          <path d="M12 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm1 4h-2v6h2v-6z" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="aboutme-card" role="dialog" aria-modal="true">
          <div className="aboutme-card-inner">
            <h2><strong>Eae Beleza?</strong></h2>
            <p>
              Esse site foi criado por <a href="https://github.com/FernandoScarabeli" target="_blank" rel="noopener noreferrer"><strong>Fernando Scarabeli</strong></a> com o objetivo de
              facilitar a vida dos alunos da UFLA na montagem de seus horários semestrais.
              A plataforma nasceu da necessidade de tornar esse processo mais simples, rápido e organizado,
              oferecendo uma visão clara das disciplinas, pré-requisitos e possibilidades de grade.
              A ideia é reduzir o tempo gasto com planejamento e evitar conflitos de horário, permitindo que o
              aluno foque no que realmente importa: aprender e aproveitar melhor o semestre.
            </p>
            <button className="aboutme-close" onClick={() => setOpen(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutMe;

