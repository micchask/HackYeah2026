import type { ActiveReport } from '../api/client'
import { AlertIcon } from './icons'

interface Props {
  reports: ActiveReport[]
  onRecalculate: () => void
  onDismiss: () => void
}

/** „Na Twojej trasie potwierdzono barierę” - trasa nie zmienia się sama, decyduje użytkownik (#63). */
export function RouteReportAlert({ reports, onRecalculate, onDismiss }: Props) {
  if (!reports.length) return null
  const labels = [...new Set(reports.map((r) => r.label))].join(', ')
  const onlyWarn = reports.every((r) => r.effect === 'warn')
  return (
    <div className="callout callout-warning route-report-alert">
      <AlertIcon size={18} />
      <div>
        <p>
          {onlyWarn
            ? 'Przy Twojej trasie potwierdzono problem'
            : 'Na Twojej trasie potwierdzono barierę'}
          : <strong>{labels}</strong>.
        </p>
        <div className="route-report-alert-actions">
          <button type="button" className="primary-button" onClick={onRecalculate}>
            Przelicz trasę
          </button>
          <button type="button" className="secondary-button" onClick={onDismiss}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  )
}
