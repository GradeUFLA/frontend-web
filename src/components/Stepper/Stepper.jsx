import React, { useState, Children } from 'react';
import { motion } from 'motion/react';

import './Stepper.css';

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = 'Voltar',
  nextButtonText = 'Continuar',
  disableStepIndicators = false,
  validateStep = () => true,
  onValidationError = () => {},
  ...rest
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [shaking, setShaking] = useState(false);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = newStep => {
    setCurrentStep(newStep);
    if (newStep > totalSteps) {
      onFinalStepCompleted();
    } else {
      onStepChange(newStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      updateStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    // Valida antes de avançar
    if (!validateStep(currentStep)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      onValidationError(currentStep);
      return;
    }

    if (!isLastStep) {
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    // Valida antes de finalizar
    if (!validateStep(currentStep)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      onValidationError(currentStep);
      return;
    }
    updateStep(totalSteps + 1);
  };

  return (
    <div className="stepper-outer-container" {...rest}>
      <div className={`stepper-circle-container ${stepCircleContainerClassName} ${shaking ? 'shake' : ''}`}>
        <div className={`stepper-indicator-row ${stepContainerClassName}`}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                <StepIndicator
                  step={stepNumber}
                  disableStepIndicators={disableStepIndicators}
                  currentStep={currentStep}
                  onClickStep={clicked => {
                    if (clicked < currentStep) {
                      updateStep(clicked);
                    }
                  }}
                />
                {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className={`stepper-content-wrapper ${contentClassName}`}>
          {!isCompleted && stepsArray[currentStep - 1]}
        </div>

        {!isCompleted && (
          <div className={`stepper-footer-container ${footerClassName}`}>
            <div className={`stepper-footer-nav ${currentStep !== 1 ? 'spread' : 'end'}`}>
              {currentStep !== 1 && (
                <button
                  onClick={handleBack}
                  className="stepper-back-button"
                  {...backButtonProps}
                >
                  <i className="fi fi-br-arrow-left"></i> {backButtonText}
                </button>
              )}
              <button
                onClick={isLastStep ? handleComplete : handleNext}
                className="stepper-next-button"
                {...nextButtonProps}
              >
                {isLastStep ? 'Finalizar' : nextButtonText} {!isLastStep && <i className="fi fi-br-arrow-right"></i>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Step({ children }) {
  return <div className="stepper-step-default">{children}</div>;
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators }) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators && step < currentStep) {
      onClickStep(step);
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      className={`stepper-indicator ${step < currentStep ? 'clickable' : ''}`}
      animate={status}
      initial={false}
    >
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: '#1a1a1a', color: '#a3a3a3' },
          active: { scale: 1, backgroundColor: '#00F0B5', color: '#00F0B5' },
          complete: { scale: 1, backgroundColor: '#00F0B5', color: '#00F0B5' }
        }}
        transition={{ duration: 0.3 }}
        className="stepper-indicator-inner"
      >
        {status === 'complete' ? (
          <CheckIcon className="stepper-check-icon" />
        ) : status === 'active' ? (
          <div className="stepper-active-dot" />
        ) : (
          <span className="stepper-step-number">{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ isComplete }) {
  return (
    <div className="stepper-connector">
      <motion.div
        className="stepper-connector-inner"
        initial={false}
        animate={{
          width: isComplete ? '100%' : '0%',
          backgroundColor: isComplete ? '#00F0B5' : 'transparent'
        }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

