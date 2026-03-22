import { useI18n } from '../hooks/useI18n'

interface Props {
  onClose: () => void
}

export default function Onboarding({ onClose }: Props) {
  const { t } = useI18n()

  const steps = [
    { title: t('onboarding.step1title'), text: t('onboarding.step1') },
    { title: t('onboarding.step2title'), text: t('onboarding.step2') },
    { title: t('onboarding.step3title'), text: t('onboarding.step3') },
    { title: t('onboarding.step4title'), text: t('onboarding.step4') },
  ]

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <h2>{t('onboarding.welcome')}</h2>
        <p className="onboarding-intro">{t('onboarding.intro')}</p>

        <div className="onboarding-steps">
          {steps.map((step, i) => (
            <div key={i} className="onboarding-step">
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>

        <p className="onboarding-hint">{t('onboarding.showAgain')}</p>

        <button className="btn btn-primary onboarding-btn" onClick={onClose}>
          {t('onboarding.getStarted')}
        </button>
      </div>
    </div>
  )
}
