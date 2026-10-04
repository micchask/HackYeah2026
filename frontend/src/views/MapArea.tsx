// Prawa część ekranu: mapa + nakładki (pasek, baner wskazywania, legenda). Warstwy porządkuje #90.
import { useApp, useAppData } from '../app/context'
import { openReport, useMapClick } from '../app/mapActions'
import { visibleLayerData } from '../app/layerData'
import { fromPlace, fromSearchResult, type SelectedPlace } from '../app/selectedPlace'
import { useActiveRoute } from '../app/useRoute'
import { AlertIcon, PinIcon } from '../components/icons'
import { InstitutionPopup } from '../components/InstitutionPopup'
import { Legend } from '../components/Legend'
import { MapView, type MapPopup } from '../components/MapView'
import { GROUP_LABEL, placeGroup } from '../components/placeCategories'
import { PlacePopup } from '../components/PlacePopup'
import { TopBar } from './TopBar'

const KRAKOW_CENTER: [number, number] = [50.0575, 19.9385]

function usePopup(): MapPopup | null {
  const [{ mapSelection }, dispatch] = useApp()
  const { institutions } = useAppData()
  const close = () => dispatch({ type: 'selectOnMap', selection: null })
  const details = (place: SelectedPlace) => () =>
    dispatch({ type: 'openPanel', panel: { kind: 'place', place } })
  // „Zgłoś problem tutaj” w okienku: panel zgłoszenia z tym miejscem (#95)
  const report = (label: string, point: { lat: number; lon: number }) => () => {
    close()
    openReport(dispatch, { label, point })
  }

  if (mapSelection?.kind === 'institution') {
    const institution = institutions.find((i) => i.id === mapSelection.id)
    if (!institution?.location) return null
    const point = institution.location.point
    return {
      key: `institution:${institution.id}`,
      point: institution.location.point,
      render: () => (
        <InstitutionPopup
          key={institution.id}
          institution={institution}
          onDetails={details(mapSelection)}
          onClose={close}
          onReport={report(institution.name, point)}
        />
      ),
    }
  }
  if (mapSelection?.kind === 'search') {
    const result = mapSelection.result
    return {
      key: result.id,
      point: result.point,
      render: () => (
        <PlacePopup
          key={result.id}
          result={result}
          onDetails={details(mapSelection)}
          onClose={close}
          onReport={report(result.label, result.point)}
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
  // Mapa i legenda pokazują tylko warstwy włączone chipami (#90)
  const visible = visibleLayerData(data, layers)
  const showBarriers = layers.barriers || layers.reports
  // Zaznaczenie na mapie (okienko) + karta w panelu (plan §6)
  const select = (selection: SelectedPlace) => {
    dispatch({ type: 'selectOnMap', selection })
    dispatch({ type: 'openPanel', panel: { kind: 'place', place: selection } })
  }

  return (
    <div className="map-wrap">
      <MapView
        center={KRAKOW_CENTER}
        zoom={14}
        places={visible.places}
        onPlaceClick={(place) => select(fromPlace(place, GROUP_LABEL[placeGroup(place)]))}
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
        institutions={visible.institutions}
        selectedInstitution={mapSelection?.kind === 'institution' ? mapSelection.id : null}
        onInstitutionSelect={(id) => select({ kind: 'institution', id })}
        popup={popup}
        onPopupClose={() => dispatch({ type: 'selectOnMap', selection: null })}
        searchPin={mapSelection?.kind === 'search' ? mapSelection.result.point : null}
        resultPins={state.resultSet?.results}
        onResultPinClick={(result) => select(fromSearchResult(result))}
        onViewChange={(center) =>
          state.mapBbox && dispatch({ type: 'setMapView', bbox: state.mapBbox, center })
        }
        barriers={visible.barriers}
        showBarriers={showBarriers}
        selectedBarrier={state.selectedBarrier}
        onBarrierSelect={(id) => dispatch({ type: 'selectBarrier', id })}
      />
      <TopBar />
      <button
        type="button"
        className="map-report-button"
        aria-pressed={pickTarget === 'report'}
        onClick={() => {
          if (pickTarget === 'report') {
            dispatch({ type: 'setPickTarget', target: null })
            return
          }
          // panel zgłoszenia + wskazywanie miejsca kliknięciem; z klawiatury: adres w panelu
          if (state.panel.kind !== 'report') openReport(dispatch, null)
          dispatch({ type: 'setPickTarget', target: 'report' })
        }}
      >
        <AlertIcon size={18} />
        <span>Zgłoś problem</span>
      </button>
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
      {(route ||
        visible.institutions.length > 0 ||
        visible.barriers.length > 0 ||
        visible.places.length > 0) && (
        <Legend
          showRoute={!!route}
          showBaseline={!!route?.baseline && !route.is_mock}
          showInstitutions={visible.institutions.length > 0}
          otherRoutes={otherRoutes}
          barrierTypes={[...new Set(visible.barriers.map((b) => b.type))]}
          showPlaces={visible.places.length > 0}
        />
      )}
    </div>
  )
}

function centerOf(bbox: string) {
  const [s, w, n, e] = bbox.split(',').map(Number)
  return { lat: (s + n) / 2, lon: (w + e) / 2 }
}
