// Lewy panel: jeden kontekst naraz (jak w mapach Google), z „← Wstecz” (plan §2).
import { useEffect, useRef } from 'react'
import { useApp } from '../app/context'
import type { PanelState } from '../app/state'
import { ExplorePanel } from './panels/ExplorePanel'
import { PlacePanel } from './panels/PlacePanel'
import { ReportPanel } from './panels/ReportPanel'
import { RoutePanel } from './panels/RoutePanel'

const TITLE: Record<PanelState['kind'], string> = {
  explore: 'Dla Ciebie',
  route: 'Trasa',
  place: 'Miejsce',
  report: 'Zgłoś barierę',
}

export function Panel() {
  const [{ panel, history }, dispatch] = useApp()
  const heading = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)

  // Po zmianie widoku fokus na nagłówek - czytnik ekranu wie, gdzie jest (poza pierwszym renderem)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    heading.current?.focus()
  }, [panel.kind])

  return (
    <aside className="panel" aria-labelledby="panel-heading">
      <div className="panel-header">
        {history.length > 0 && (
          <button type="button" className="link-button" onClick={() => dispatch({ type: 'back' })}>
            ← Wstecz
          </button>
        )}
        <h2 id="panel-heading" ref={heading} tabIndex={-1}>
          {TITLE[panel.kind]}
        </h2>
      </div>
      {panel.kind === 'explore' && <ExplorePanel />}
      {panel.kind === 'route' && <RoutePanel />}
      {panel.kind === 'place' && <PlacePanel place={panel.place} />}
      {panel.kind === 'report' && <ReportPanel />}
    </aside>
  )
}
