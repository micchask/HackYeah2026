import { useId } from 'react'
import type { DataGapsSummary, LatLon } from '../api/client'
import { formatKm, plural } from './format'

interface Props {
  summary: DataGapsSummary | null
  error: string | null
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  /** Przesuń mapę na obszar z listy */
  onShow: (point: LatLon) => void
}

/**
 * Mapa braków danych (#31) w wersji tekstowej: ile sieci pieszej nie ma danych i gdzie
 * najwięcej. Argument dla miasta - te miejsca warto zinwentaryzować w pierwszej kolejności.
 */
export function DataGapsSection({ summary, error, visible, onVisibleChange, onShow }: Props) {
  const id = useId()
  return (
    <section className="card data-gaps" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Braki danych</h2>
      <label className="toggle">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => onVisibleChange(e.target.checked)}
        />
        Pokaż braki danych na mapie
      </label>

      {error && visible && (
        <p role="alert" className="callout callout-error">
          {error}
        </p>
      )}
      {visible && !summary && !error && <p className="meta">Liczę braki danych…</p>}
      {visible && summary && (
        <>
          <p>
            <strong>{formatKm(summary.gap_length_m)}</strong> z {formatKm(summary.total_length_m)}{' '}
            sieci pieszej w obszarze demo (<strong>{Math.round(summary.gap_share * 100)}%</strong>)
            nie ma danych o nawierzchni.
          </p>
          {summary.by_kind.length > 0 && (
            <p className="meta">
              Najwięcej:{' '}
              {summary.by_kind
                .slice(0, 3)
                .map((k) => `${k.label} ${formatKm(k.gap_length_m)}`)
                .join(', ')}
              .
            </p>
          )}
          <h3 className="data-gaps-subtitle">Gdzie brakuje najwięcej</h3>
          <ol className="data-gaps-areas">
            {summary.areas.map((area) => (
              <li key={`${area.center.lat},${area.center.lon}`}>
                <button type="button" className="barrier-item" onClick={() => onShow(area.center)}>
                  <span className="barrier-item-title">{area.label}</span>
                  <span>
                    {`${formatKm(area.gap_length_m)} bez danych · ${area.segments} ${plural(area.segments, 'odcinek', 'odcinki', 'odcinków')}`}
                  </span>
                  <span className="visually-hidden"> – pokaż na mapie</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="meta">
            Dane: OpenStreetMap. Brak danych = odcinek bez nawierzchni w OSM (ta sama reguła co
            pewność w opisie trasy).
          </p>
        </>
      )}
    </section>
  )
}
