import { useId, useState } from 'react'
import type { Barrier, BarrierType, Report } from '../api/client'
import { BarrierIcon } from './BarrierIcon'
import { BARRIER_LABEL, BARRIER_TYPES } from './barrierStyle'
import { formatKm } from './format'
import { reportVotesText } from './attributes'
import { ReportVotes } from './ReportVotes'

// Długie listy (np. bruk na całym Starym Mieście) skracamy - reszta po przybliżeniu mapy
const PER_GROUP = 25
// Nierównej nawierzchni jest najwięcej - grupa domyślnie zwinięta
const COLLAPSED: BarrierType[] = ['rough_surface']

const SOURCE_LABEL: Record<string, string> = {
  osm: 'OpenStreetMap',
  user_reports: 'zgłoszenia użytkowników',
}

interface Props {
  barriers: Barrier[]
  truncated: boolean
  loading: boolean
  error: string | null
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  selected: string | null
  onSelect: (id: string | null) => void
  /** Zwinięta lista: tylko tyle najważniejszych barier, reszta po „Pokaż wszystkie” */
  collapsedLimit?: number
  /** Głos na zgłoszenie użytkownika zapisany (#62) - np. odśwież bariery */
  onReportVoted?: (report: Report) => void
}

/** Tekstowa alternatywa warstwy barier: te same dane co na mapie, pogrupowane wg typu. */
export function BarrierList({
  barriers,
  truncated,
  loading,
  error,
  visible,
  onVisibleChange,
  selected,
  onSelect,
  collapsedLimit,
  onReportVoted,
}: Props) {
  const id = useId()
  const [showAll, setShowAll] = useState(false)
  // API zwraca bariery od najważniejszych (schody, krawężniki…) - zwinięta lista pokazuje je
  const collapsible = collapsedLimit !== undefined && barriers.length > collapsedLimit
  const shown = collapsible && !showAll ? barriers.slice(0, collapsedLimit) : barriers
  const groups = BARRIER_TYPES.map((type) => ({
    type,
    items: shown.filter((b) => b.type === type),
  })).filter((g) => g.items.length > 0)

  return (
    <section className="card barriers" aria-labelledby={`${id}-heading`} aria-busy={loading}>
      <h2 id={`${id}-heading`}>Bariery w widoku mapy</h2>
      <label className="toggle">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => onVisibleChange(e.target.checked)}
        />
        Pokaż bariery na mapie
      </label>

      <p className="meta" aria-live="polite">
        {error
          ? ''
          : loading && !barriers.length
            ? 'Szukam barier…'
            : barriers.length
              ? `${barriers.length} barier w widocznym obszarze${truncated ? ' (pokazujemy część – przybliż mapę)' : ''}.`
              : 'Brak barier w widocznym obszarze.'}
      </p>
      {error && (
        <p role="alert" className="callout callout-error">
          {error}
        </p>
      )}

      {groups.map(({ type, items }) => (
        <details key={type} className="barrier-group" open={!COLLAPSED.includes(type)}>
          <summary>
            <BarrierIcon type={type} />
            {BARRIER_LABEL[type]} ({items.length})
          </summary>
          <ul>
            {items.slice(0, PER_GROUP).map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className={selected === b.id ? 'barrier-item selected' : 'barrier-item'}
                  aria-pressed={selected === b.id}
                  onClick={() => onSelect(selected === b.id ? null : b.id)}
                >
                  <span className="barrier-item-title">{b.street ?? 'Odcinek bez nazwy'}</span>
                  <span>
                    {b.description}
                    {b.length_m ? `, ${formatKm(b.length_m)}` : ''}
                  </span>
                  <span className="meta">
                    {SOURCE_LABEL[b.source] ?? b.source} · pewność {Math.round(b.confidence * 100)}%
                    {b.last_verified
                      ? ` · sprawdzone ${new Date(b.last_verified).toLocaleDateString('pl-PL')}`
                      : ''}
                  </span>
                  {b.report && <span className="meta">{reportVotesText(b.report)}</span>}
                  <span className="visually-hidden">
                    {selected === b.id ? ' – pokazane na mapie' : ' – pokaż na mapie'}
                  </span>
                </button>
                {/* zaznaczone zgłoszenie: inni potwierdzają albo mówią, że problemu już nie ma */}
                {selected === b.id && b.report && (
                  <ReportVotes key={b.id} report={b.report} onVoted={onReportVoted} />
                )}
              </li>
            ))}
          </ul>
          {items.length > PER_GROUP && (
            <p className="meta">
              …i {items.length - PER_GROUP} więcej. Przybliż mapę, żeby zawęzić listę.
            </p>
          )}
        </details>
      ))}
      {collapsible && (
        <button type="button" className="link-button" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Pokaż mniej barier' : `Pokaż wszystkie bariery (${barriers.length})`}
        </button>
      )}
    </section>
  )
}
