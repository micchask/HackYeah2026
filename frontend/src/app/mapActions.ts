// Akcje związane z mapą: wskazywanie punktu kliknięciem i „Start (A)” / „Cel (B)” z okienka.
import { useCallback, type Dispatch } from 'react'
import { api, type LatLon } from '../api/client'
import type { NamedPoint, PickTarget } from '../components/RoutePoints'
import { CITY, useApp } from './context'
import type { Action } from './state'

function mapPoint(point: LatLon): NamedPoint {
  return {
    label: `Punkt na mapie (${point.lat.toFixed(4)}, ${point.lon.toFixed(4)})`,
    point,
  }
}

export function setPointAction(target: PickTarget, point: NamedPoint | null): Action {
  if (target === 'origin') return { type: 'setOrigin', point }
  if (target === 'destination') return { type: 'setDestination', point }
  return { type: 'setReportPoint', point }
}

/** Punkt A/B/zgłoszenia z okienka na mapie, wyszukiwarki lub pola adresu. */
export function useSetPoint() {
  const [, dispatch] = useApp()
  return useCallback(
    (target: PickTarget, point: NamedPoint) => {
      dispatch(setPointAction(target, point))
      dispatch({ type: 'setPickTarget', target: null })
      dispatch({ type: 'selectOnMap', selection: null })
    },
    [dispatch],
  )
}

/**
 * Klik w mapę ustawia punkt tylko po „Wskaż na mapie” (jak w mapach Google klik sam nic nie robi).
 * Adres z geokodera podmienia współrzędne, jeśli w międzyczasie nikt nie zmienił punktu.
 */
export function useMapClick() {
  const [{ pickTarget, destination }, dispatch] = useApp()
  return useCallback(
    (point: LatLon) => {
      if (!pickTarget) return
      const picked = mapPoint(point)
      dispatch(setPointAction(pickTarget, picked))
      dispatch({
        type: 'setPickTarget',
        target: pickTarget === 'origin' && !destination ? 'destination' : null,
      })
      api
        .reverseGeocode(point, CITY)
        .then((found) => {
          if (!found) return
          const better = { label: found.label, point }
          dispatch({ type: 'refinePoint', target: pickTarget, expected: picked, point: better })
        })
        .catch(() => {
          // brak geokodera: zostają współrzędne
        })
    },
    [pickTarget, destination, dispatch],
  )
}

/** Otwiera panel zgłoszenia z gotowym punktem (miejsce, odcinek trasy) albo bez niego. */
export function openReport(dispatch: Dispatch<Action>, point: NamedPoint | null): void {
  dispatch({ type: 'setReportPoint', point })
  dispatch({ type: 'openPanel', panel: { kind: 'report', point } })
}
