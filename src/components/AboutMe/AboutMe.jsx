import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import './AboutMe.css';

const AboutMe = () => {
  const [open, setOpen] = useState(false);
  const [cardStyle, setCardStyle] = useState(null);
  const buttonRef = useRef(null);
  const cardRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // compute placement whenever open toggles, or window resizes/scrolls
  const computePlacement = () => {
    const btn = buttonRef.current;
    const card = cardRef.current;
    if (!btn || !card) return;

    const btnRect = btn.getBoundingClientRect();
    const cardWidthRaw = card.offsetWidth || Math.round(card.getBoundingClientRect().width || 280);
    const cardHeightRaw = card.offsetHeight || Math.round(card.getBoundingClientRect().height || 160);

    const margin = 8; // gap in px between button and card
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // preferred: open above the button if there's space
    const spaceAbove = btnRect.top;
    const spaceBelow = viewportH - btnRect.bottom;
    const openAbove = spaceAbove >= cardHeightRaw + margin && spaceAbove >= spaceBelow;

    // compute centered left coordinate but keep inside viewport padding
    const centerX = btnRect.left + btnRect.width / 2;
    const pad = 8;
    const cardWidth = Math.min(cardWidthRaw, viewportW - pad * 2);
    // Prefer anchoring card's left to the button's left (so it opens 'sobre' the button)
    let leftCandidate = Math.round(btnRect.left);
    // clamp to viewport
    let left = Math.max(pad, Math.min(leftCandidate, viewportW - cardWidth - pad));
    // compute caret offset relative to card's left so arrow can point to button center
    const caretOffset = Math.round(centerX - left);
    // clamp caretOffset so caret stays within card (keep 12px padding each side)
    const caretMin = 12;
    const caretMax = Math.max(12, Math.round(cardWidth - 12));
    const caretClamped = Math.min(Math.max(caretOffset, caretMin), caretMax);

    // compute top coordinate and clamp so card fully inside viewport
    let top;
    if (openAbove) {
      top = Math.round(btnRect.top - margin - cardHeightRaw);
    } else {
      top = Math.round(btnRect.bottom + margin);
    }
    top = Math.max(pad, Math.min(top, viewportH - cardHeightRaw - pad));

    setCardStyle({ left: `${left}px`, top: `${top}px`, width: `${cardWidth}px`, transform: 'none', openAbove, caretLeft: `${caretClamped}px` });
  };

  useLayoutEffect(() => {
    if (!open) return;
    // Small timeout to allow card to render and measure its size
    const id = window.requestAnimationFrame(() => computePlacement());

    // attach ResizeObserver to card so if content grows we recompute positioning
    const card = cardRef.current;
    if (card && typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(() => computePlacement());
      resizeObserverRef.current.observe(card);
    }

    return () => {
      window.cancelAnimationFrame(id);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const handle = () => {
      if (open) computePlacement();
    };
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open]);

  const toggleOpen = () => {
    setOpen(prev => {
      const next = !prev;
      if (!next) setCardStyle(null);
      return next;
    });
  };

  return (
    <div className="aboutme-root">
      <button
        ref={buttonRef}
        className="aboutme-button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label="Sobre"
        title="Sobre"
      >
        {/* info icon: circle with an 'i' using currentColor */}
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="aboutme-icon" width="20" height="20">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
          <path d="M12 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm1 4h-2v6h2v-6z" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          ref={cardRef}
          className={`aboutme-card ${cardStyle?.openAbove === false ? 'aboutme-card--down' : ''} ${cardStyle ? 'aboutme-card--visible' : 'aboutme-card--hidden'}`}
          role="dialog"
          aria-modal="true"
          style={{ ...(cardStyle || { left: '-9999px', top: '-9999px', width: 'auto' }), visibility: cardStyle ? 'visible' : 'hidden', opacity: cardStyle ? 1 : 0, '--aboutme-caret-left': cardStyle?.caretLeft || '50%' }}
        >
          <div className="aboutme-card-inner">
            <h2><strong>Eae Beleza?</strong></h2>
            <p className="aboutme-card-content">
              Esse site foi criado por <a href="https://github.com/FernandoScarabeli" target="_blank" rel="noopener noreferrer"><strong>Fernando Scarabeli</strong></a> com o objetivo de
              facilitar a vida dos alunos da UFLA na montagem de seus horários semestrais. A plataforma nasceu da necessidade de tornar esse processo mais simples, rápido e organizado,
              oferecendo uma visão clara das disciplinas, pré-requisitos e possibilidades de grade.
            </p>
            <button className="aboutme-close" onClick={() => setOpen(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutMe;
