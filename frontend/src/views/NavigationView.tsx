// Widok w trakcie trasy (jak w mapach Google): u góry karta manewru, na dole czas, dystans
// i „Zakończ”. Pozycję, postęp i zapowiedzi liczy useNavigation (MapArea).
import { useApp } from '../app/context'
import { formatDistance, remainingSeconds } from '../app/navigation'
import type { Navigation } from '../app/useNavigation'
import { AlertIcon, CrosshairIcon, VolumeIcon, VolumeOffIcon } from '../components/icons'
import { TurnIcon } from '../components/TurnIcon'

interface Props {
  nav: Navigation
  follow: boolean
  onRecenter: () => void
  onExit: () => void
}

function clock(date: Date): string {
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

function minutes(seconds: number): string {
  const min = Math.max(1, Math.round(seconds / 60))
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`
}

export function NavigationView({ nav, follow, onRecenter, onExit }: Props) {
  const [{ routeLoading, routeError }, dispatch] = useApp()
  const { route, progress, maneuver, status } = nav
  const segment = route && progress ? route.segments[progress.segment] : null
  const seconds = route && progress ? remainingSeconds(route, progress.remaining) : 0

  let banner
  if (status === 'arrived') {
    banner = (
      <>
        <TurnIcon kind="arrive" />
        <div>
          <p className="nav-instruction">Jesteś u celu</p>
        </div>
      </>
    )
  } else if (routeLoading || status === 'rerouting') {
    banner = <p className="nav-instruction">Wyznaczam nową trasę…</p>
  } else if (maneuver) {
    banner = (
      <>
        <TurnIcon kind={maneuver.kind} />
        <div>
          <p className="nav-distance">{formatDistance(maneuver.distance)}</p>
          <p className="nav-instruction">{maneuver.text}</p>
          {maneuver.street && <p className="nav-street">{maneuver.street}</p>}
        </div>
      </>
    )
  } else {
    banner = <p className="nav-instruction">Ustalam Twoją pozycję…</p>
  }

  return (
    <section className="nav-view" aria-label="Nawigacja">
      <div className="nav-top">
        <div className="nav-banner">{banner}</div>
        {segment?.warnings?.length && status === 'navigating' ? (
          <p className="nav-note nav-note-warning">
            <AlertIcon size={18} />
            <span>{segment.warnings[0]}</span>
          </p>
        ) : null}
        {routeError && (
          <p className="nav-note nav-note-error" role="alert">
            <AlertIcon size={18} />
            <span>{routeError}</span>
          </p>
        )}
        {(status === 'gps-error' || status === 'far') && (
          <div className="nav-note nav-note-error" role="alert">
            <AlertIcon size={18} />
            <div>
              <p>
                {status === 'far'
                  ? 'Jesteś daleko od trasy - nawigacja działa w okolicy trasy.'
                  : 'Nie udało się ustalić pozycji. Sprawdź, czy przeglądarka ma dostęp do lokalizacji.'}
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => dispatch({ type: 'startNavigation', mode: 'sim' })}
              >
                Symuluj przejście trasy
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Wskazówki dla czytnika ekranu - te same, które mówi głos */}
      <p className="visually-hidden" aria-live="assertive">
        {nav.announcement}
      </p>

      {!follow && (
        <button type="button" className="nav-recenter" onClick={onRecenter}>
          <CrosshairIcon size={18} /> Wyśrodkuj
        </button>
      )}

      <div className="nav-bottom">
        <div className="nav-summary">
          {progress && status !== 'arrived' ? (
            <>
              <strong>{minutes(seconds)}</strong>
              <span>
                {formatDistance(progress.remaining)} · przyjazd{' '}
                {clock(new Date(nav.updatedAt + seconds * 1000))}
              </span>
            </>
          ) : (
            <strong>{status === 'arrived' ? 'Koniec trasy' : 'Nawigacja'}</strong>
          )}
          {nav.mode === 'sim' && <span className="nav-sim-badge">Symulacja</span>}
        </div>
        <button
          type="button"
          className="icon-button nav-mute"
          aria-pressed={!nav.muted}
          aria-label="Wskazówki głosowe"
          title={nav.muted ? 'Włącz głos' : 'Wycisz'}
          onClick={() => nav.setMuted(!nav.muted)}
        >
          {nav.muted ? <VolumeOffIcon /> : <VolumeIcon />}
        </button>
        <button type="button" className="nav-exit" onClick={onExit}>
          Zakończ
        </button>
      </div>
    </section>
  )
}
