// Legenda na żądanie: przycisk „Legenda” otwiera kompaktowe okienko z grupami.
// Pokazuje tylko to, co jest na mapie. Kolor nigdy nie jest jedynym nośnikiem informacji.
import type { ReactNode } from 'react'
import type { BarrierType, Difficulty } from '../api/client'
import { BarrierIcon } from './BarrierIcon'
import { BARRIER_LABEL, BARRIER_TYPES } from './barrierStyle'
import { GAP_CLASSES, GAP_COLOR, GAP_LABEL } from './dataGapsStyle'
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL } from './difficulty'
import { EmptyState } from './EmptyState'
import { ListIcon } from './icons'
import { AccessBadgeIcon, PlaceKindIcon } from './PlaceAccessIcon'
import { ACCESS_LABEL, ACCESS_LEVELS, KIND_LABEL, LEGEND_KINDS } from './placeCategories'
import { usePopover } from './usePopover'

interface Props {
  showRoute: boolean
  showBaseline: boolean
  showInstitutions: boolean
  otherRoutes?: { index: number; label: string }[]
  /** Typy barier widoczne na mapie (z włączonych chipów) */
  barrierTypes?: BarrierType[]
  /** Na mapie są miejsca (warstwa z klastrami) */
  showPlaces?: boolean
  showDataGaps?: boolean
}

function Group({
  title,
  children,
  columns = false,
}: {
  title: string
  children: ReactNode
  columns?: boolean
}) {
  return (
    <div className="legend-group">
      <h3 className="popover-title">{title}</h3>
      <ul className={columns ? 'legend-columns' : undefined}>{children}</ul>
    </div>
  )
}

/** Treść legendy (grupy). Osobno od przycisku - do testów i ewentualnie dolnego panelu. */
export function LegendContent({
  showRoute,
  showBaseline,
  showInstitutions,
  otherRoutes = [],
  barrierTypes = [],
  showPlaces = false,
  showDataGaps = false,
}: Props) {
  const barriers = BARRIER_TYPES.filter((t) => barrierTypes.includes(t))
  const hasRoute = showRoute || otherRoutes.length > 0 || showBaseline
  const hasLayers = showInstitutions || showDataGaps
  if (!hasRoute && !barriers.length && !showPlaces && !hasLayers) {
    return <EmptyState title="Mapa jest pusta">Włącz warstwę, aby zobaczyć oznaczenia.</EmptyState>
  }

  return (
    <>
      {hasRoute && (
        <Group title="Trasa">
          {showRoute &&
            (Object.keys(DIFFICULTY_COLOR) as Difficulty[]).map((d) => (
              <li key={d}>
                <span
                  className="legend-swatch"
                  style={{ background: DIFFICULTY_COLOR[d] }}
                  aria-hidden="true"
                />
                {DIFFICULTY_LABEL[d]}
              </li>
            ))}
          {otherRoutes.map((route) => (
            <li key={route.index}>
              <span
                className={`legend-swatch legend-swatch-route-${route.index % 3}`}
                aria-hidden="true"
              />
              {route.label}
            </li>
          ))}
          {showBaseline && (
            <li>
              <span className="legend-swatch legend-swatch-dashed" aria-hidden="true" />
              zwykła trasa piesza
            </li>
          )}
        </Group>
      )}
      {barriers.length > 0 && (
        <Group title="Bariery">
          {barriers.map((t) => (
            <li key={t}>
              <BarrierIcon type={t} size={18} />
              {BARRIER_LABEL[t].toLowerCase()}
            </li>
          ))}
        </Group>
      )}
      {showPlaces && (
        <>
          <Group title="Rodzaj miejsca" columns>
            {LEGEND_KINDS.map((kind) => (
              <li key={kind}>
                <PlaceKindIcon kind={kind} size={18} />
                {KIND_LABEL[kind]}
              </li>
            ))}
          </Group>
          <Group title="Dostępność dla wózka (kwadracik w rogu)">
            {ACCESS_LEVELS.map((access) => (
              <li key={access}>
                <AccessBadgeIcon access={access} size={14} />
                {ACCESS_LABEL[access]}
              </li>
            ))}
            <li>
              <span className="legend-cluster" aria-hidden="true">
                12
              </span>
              grupa miejsc
            </li>
          </Group>
        </>
      )}
      {hasLayers && (
        <Group title="Warstwy">
          {showInstitutions && (
            <li>
              <PlaceKindIcon kind="office" size={18} />
              instytucja publiczna (z nazwą obok)
            </li>
          )}
          {showDataGaps &&
            GAP_CLASSES.map((gap) => (
              <li key={gap}>
                <span
                  className={`legend-swatch legend-swatch-gap-${gap}`}
                  style={{ color: GAP_COLOR[gap] }}
                  aria-hidden="true"
                />
                {GAP_LABEL[gap]}
              </li>
            ))}
        </Group>
      )}
    </>
  )
}

export function Legend(props: Props) {
  const { open, toggle, id: popoverId, wrapper, trigger, triggerProps } = usePopover()
  return (
    <div ref={wrapper} className="map-control-wrap">
      <button
        ref={trigger}
        type="button"
        className="map-control"
        {...triggerProps}
        onClick={toggle}
      >
        <ListIcon size={20} />
        <span className="map-control-label">Legenda</span>
      </button>
      {open && (
        <section id={popoverId} className="popover legend-popover" aria-label="Legenda mapy">
          <LegendContent {...props} />
        </section>
      )}
    </div>
  )
}
