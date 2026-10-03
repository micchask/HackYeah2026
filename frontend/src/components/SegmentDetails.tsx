import type { RouteSegment } from '../api/client'
import { STATUS_DESCRIPTION, STATUS_LABEL } from './dataStatus'
import { DIFFICULTY_LABEL } from './difficulty'
import { formatDate, formatKm } from './format'

interface Props {
  id: string
  segment: RouteSegment
  onClose: () => void
}

/** Szczegóły odcinka: co wiemy, skąd i na ile tego jesteśmy pewni. */
export function SegmentDetails({ id, segment: s, onClose }: Props) {
  const status = s.data_status ?? 'unverified'
  const incline = s.incline_percent

  return (
    <section id={id} className="segment-details" aria-label={`Szczegóły odcinka: ${s.street}`}>
      <dl>
        <div>
          <dt>Nawierzchnia</dt>
          <dd>{s.surface ?? 'brak danych'}</dd>
        </div>
        <div>
          <dt>Nachylenie</dt>
          <dd>{incline != null ? `${Math.abs(incline)}%` : 'brak danych'}</dd>
        </div>
        <div>
          <dt>Długość</dt>
          <dd>{formatKm(s.distance_m)}</dd>
        </div>
        <div>
          <dt>Trudność</dt>
          <dd>{DIFFICULTY_LABEL[s.difficulty ?? 'easy']}</dd>
        </div>
        <div>
          <dt>Dostępność dla profilu</dt>
          <dd>{s.accessibility_score}/100</dd>
        </div>
        <div>
          <dt>Pewność danych</dt>
          <dd>
            {Math.round(s.confidence * 100)}%{' '}
            <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
          </dd>
        </div>
        <div className="wide">
          <dt>Źródło</dt>
          <dd>
            {s.sources?.length ? s.sources.join(', ') : 'nieznane'}. {STATUS_DESCRIPTION[status]}
          </dd>
        </div>
        <div>
          <dt>Dane pobrane</dt>
          <dd>{s.fetched_at ? formatDate(s.fetched_at) : 'brak informacji'}</dd>
        </div>
        <div>
          <dt>Weryfikacja w terenie</dt>
          <dd>{s.last_verified ? formatDate(s.last_verified) : 'brak – nikt jej nie odnotował'}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="link-button"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        Zamknij szczegóły
      </button>
    </section>
  )
}
