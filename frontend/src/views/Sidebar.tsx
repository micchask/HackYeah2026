// Lewy panel (desktop) / dolny panel (telefon): jeden kontekst naraz, jak w mapach Google.
// Zwinięty na desktopie znika całkiem (przycisk w pasku wyszukiwania), na telefonie zostaje nagłówek.
import { useEffect, useRef } from 'react'
import { useApp } from '../app/context'
import { ArrowLeftIcon, ChevronLeftIcon } from '../components/icons'
import { panelTitle } from './panelTitles'
import { ExplorePanel } from './panels/ExplorePanel'
import { ListPanel } from './panels/ListPanel'
import { PlacePanel } from './panels/PlacePanel'
import { ReportPanel } from './panels/ReportPanel'
import { RoutePanel } from './panels/RoutePanel'

export const SIDEBAR_BODY_ID = 'sidebar-body'

export function Sidebar() {
  const [{ panel, history, sidebarOpen, navigation }, dispatch] = useApp()
  const heading = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)
  const body = useRef<HTMLDivElement>(null)

  // Po zmianie widoku fokus na nagłówek (czytnik ekranu wie, gdzie jest) i przewinięcie na górę
  useEffect(() => {
    body.current?.scrollTo?.({ top: 0 })
    if (first.current) {
      first.current = false
      return
    }
    heading.current?.focus()
  }, [panel])

  // W nawigacji cały ekran ma mapa i karta manewru (NavigationView)
  if (navigation) return null

  return (
    <aside className="sidebar" data-open={sidebarOpen} aria-labelledby="panel-heading">
      <div className="sidebar-header">
        {/* uchwyt dolnego panelu na telefonie */}
        <button
          type="button"
          className="sheet-handle"
          aria-expanded={sidebarOpen}
          aria-controls={SIDEBAR_BODY_ID}
          aria-label={sidebarOpen ? 'Zwiń panel' : 'Rozwiń panel'}
          onClick={() => dispatch({ type: 'toggleSidebar' })}
        />
        {history.length > 0 && (
          <button
            type="button"
            className="icon-button icon-button-ghost"
            aria-label="Wstecz"
            title="Wstecz"
            onClick={() => dispatch({ type: 'back' })}
          >
            <ArrowLeftIcon />
          </button>
        )}
        <h2 id="panel-heading" ref={heading} tabIndex={-1}>
          {panelTitle(panel)}
        </h2>
        <button
          type="button"
          className="icon-button icon-button-ghost sidebar-collapse"
          title={sidebarOpen ? 'Zwiń panel' : 'Rozwiń panel'}
          aria-expanded={sidebarOpen}
          aria-controls={SIDEBAR_BODY_ID}
          aria-label={sidebarOpen ? 'Zwiń panel' : 'Rozwiń panel'}
          onClick={() => dispatch({ type: 'toggleSidebar' })}
        >
          <ChevronLeftIcon />
        </button>
      </div>
      <div ref={body} id={SIDEBAR_BODY_ID} className="sidebar-body" hidden={!sidebarOpen}>
        {panel.kind === 'explore' && <ExplorePanel />}
        {panel.kind === 'route' && <RoutePanel />}
        {panel.kind === 'place' && <PlacePanel place={panel.place} />}
        {panel.kind === 'report' && <ReportPanel />}
        {panel.kind === 'list' && <ListPanel list={panel.list} />}
      </div>
    </aside>
  )
}
