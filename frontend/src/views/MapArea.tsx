// Prawa część ekranu: mapa + nakładki (pasek, baner wskazywania, legenda). Warstwy porządkuje #90.
import { useApp, useAppData } from '../app/context'
import { useMapClick, useSetPoint } from '../app/mapActions'
import { fromSearchResult } from '../app/selectedPlace'
import { useActiveRoute } from '../app/useRoute'
import { PinIcon } from '../components/icons'
import { InstitutionPopup } from '../components/InstitutionPopup'
import { Legend } from '../components/Legend'
import { MapView, type MapPopup } from '../components/MapView'
import { PlacePopup } from '../components/PlacePopup'
import { TopBar } from './TopBar'

const KRAKOW_CENTER: [number, number] = [50.0575, 19.9385]

function usePopup(): MapPopup | null {
  const [{ mapSelection }, dispatch] = useApp()
  const { institutions } = useAppData()
  const setPoint = useSetPoint()
  const close = () => dispatch({ type: 'selectOnMap', selection: null })

  if (mapSelection?.kind === 'institution') {
    const institution = institutions.find((i) => i.id === mapSelection.id)
    if (!institution?.location) return null
    const point = { label: institution.name, point: institution.location.point }
    return {
      key: `institution:${institution.id}`,
      point: institution.location.point,
      render: () => (
        <InstitutionPopup
          key={institution.id}
          institution={institution}
          onSetOrigin={() => setPoint('origin', point)}
          onSetDestination={() => setPoint('destination', point)}
          onClose={close}
        />
      ),
    }
  }
  if (mapSelection?.kind === 'search') {
    const result = mapSelection.result
    const point = { label: result.label, point: result.point }
    return {
      key: result.id,
      point: result.point,
      render: () => (
        <PlacePopup
          key={result.id}
          result={result}
          onSetOrigin={() => setPoint('origin', point)}
          onSetDestination={() => setPoint('destination', point)}
          onClose={close}
        />
      ),
    }
  }
  return null
}

export function MapArea() {
  const [state, dispatch] = useApp()
  const data = useAppData()
  const { route, active, variants, otherRoutes } = useActiveRoute()
  const onMapClick = useMapClick()
  const popup = usePopup()
  const { pickTarget, layers, mapSelection } = state
  const pickLetter =
    pickTarget === 'origin' ? 'A' : pickTarget === 'destination' ? 'B' : pickTarget ? '!' : null
  const showBarriers = layers.barriers

  return (
    <div className="map-wrap">
      <MapView
        center={KRAKOW_CENTER}
        zoom={14}
        places={data.places}
        route={active}
        routeVariants={variants}
        selectedRoute={state.variant}
        origin={state.origin?.point ?? null}
        destination={state.destination?.point ?? null}
        reportPoint={state.reportPoint?.point ?? null}
        selectedSegment={state.segment}
        pickLabel={pickLetter}
        onMapClick={onMapClick}
        onSegmentClick={(segment) => dispatch({ type: 'setSegment', segment })}
        onBoundsChange={(bbox) =>
          dispatch({ type: 'setMapView', bbox, center: state.mapCenter ?? centerOf(bbox) })
        }
        institutions={data.institutions}
        selectedInstitution={mapSelection?.kind === 'institution' ? mapSelection.id : null}
        onInstitutionSelect={(id) =>
          dispatch({ type: 'selectOnMap', selection: id ? { kind: 'institution', id } : null })
        }
        popup={popup}
        onPopupClose={() => dispatch({ type: 'selectOnMap', selection: null })}
        searchPin={mapSelection?.kind === 'search' ? mapSelection.result.point : null}
        resultPins={state.resultSet?.results}
        onResultPinClick={(result) =>
          dispatch({ type: 'selectOnMap', selection: fromSearchResult(result) })
        }
        onViewChange={(center) =>
          state.mapBbox && dispatch({ type: 'setMapView', bbox: state.mapBbox, center })
        }
        barriers={data.barriers}
        showBarriers={showBarriers}
        selectedBarrier={state.selectedBarrier}
        onBarrierSelect={(id) => dispatch({ type: 'selectBarrier', id })}
      />
      <TopBar />
      {pickLetter && (
        <div className="map-banner">
          <PinIcon size={18} />
          <span>
            {pickTarget === 'report' ? (
              'Kliknij na mapie, aby wskazać miejsce bariery'
            ) : (
              <>
                Kliknij na mapie, aby ustawić punkt <strong>{pickLetter}</strong>
              </>
            )}
          </span>
          <button
            type="button"
            className="banner-button"
            onClick={() => dispatch({ type: 'setPickTarget', target: null })}
          >
            Anuluj
          </button>
        </div>
      )}
      {state.routeLoading && (
        <div className="map-loading" aria-hidden="true">
          <span className="spinner" /> Szukam trasy…
        </div>
      )}
      {(route || data.institutions.length > 0 || (showBarriers && data.barriers.length > 0)) && (
        <Legend
          showRoute={!!route}
          showBaseline={!!route?.baseline && !route.is_mock}
          showInstitutions={data.institutions.length > 0}
          otherRoutes={otherRoutes}
          showBarriers={showBarriers && data.barriers.length > 0}
        />
      )}
    </div>
  )
}

function centerOf(bbox: string) {
  const [s, w, n, e] = bbox.split(',').map(Number)
  return { lat: (s + n) / 2, lon: (w + e) / 2 }
}
