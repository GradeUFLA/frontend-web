import RotatingText from '../RotatingText';
import './Hero.css';

const Hero = ({ onGetStartedClick }) => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">
          Monte sua grade horária
        </h1>
        <h2 className="hero-title-sub">
          de forma{' '}
          <RotatingText
            texts={['prática', 'rápida', 'fácil']}
            mainClassName="rotating-text-main"
            staggerFrom="last"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-120%' }}
            staggerDuration={0.025}
            splitLevelClassName="rotating-text-split"
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            rotationInterval={2000} /* acelerado: 1.2s por palavra */
          />
        </h2>

        <p className="hero-subtitle">
          Selecione seu semestre, informe suas matérias aprovadas e monte
          sua grade respeitando pré-requisitos automaticamente.
        </p>

        <div className="hero-buttons">
          <button className="btn-primary" onClick={onGetStartedClick}>
            Vamos lá
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
