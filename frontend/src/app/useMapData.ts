// Dane mapy dla widocznego obszaru: miejsca, instytucje, bariery (przeniesione z dawnego HomePage).
import { useEffect, useState } from 'react'
import {
  api,
  type Barrier,
  type DataGapsSummary,
  type Institution,
  type Place,
  type SegmentCollection,
} from '../api/client'
import { CITY, type AppData } from './context'

// Tyle miejsc naraz trafia na mapę - więcej spowalnia mapę i czytnik ekranu
export const PLACES_LIMIT = 200
// Na mapie braków pokazujemy też odcinki z nieprecyzyjnym nachyleniem (0.5), lista liczy <= 0.4
export const GAPS_MAP_MAX_CONFIDENCE = 0.5

/** Braki danych (#31): odcinki o niskiej pewności w widoku mapy + podsumowanie dla obszaru demo */
function useDataGaps(bbox: string | null, on: boolean) {
  const [dataGaps, setDataGaps] = useState<SegmentCollection | null>(null)
  const [dataGapsSummary, setSummary] = useState<DataGapsSummary | null>(null)
  const [dataGapsError, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!on || !bbox) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      const [s, w, n, e] = bbox.split(',').map(Number)
      api
        .segments(CITY, [s, w, n, e], {
          maxConfidence: GAPS_MAP_MAX_CONFIDENCE,
          signal: controller.signal,
        })
        .then((found) => {
          setDataGaps(found)
          setError(null)
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setError(e.message)
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [bbox, on])

  // Podsumowanie jest dla całego obszaru demo - wystarczy raz
  useEffect(() => {
    if (!on || dataGapsSummary) return
    const controller = new AbortController()
    api
      .dataGaps(CITY, controller.signal)
      .then(setSummary)
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => controller.abort()
  }, [on, dataGapsSummary])

  return { dataGaps: on ? dataGaps : null, dataGapsSummary, dataGapsError }
}

export function useMapData(bbox: string | null, placesQuery: string, showGaps = false): AppData {
  const gaps = useDataGaps(bbox, showGaps)
  const [places, setPlaces] = useState<Place[]>([])
  const [placesError, setPlacesError] = useState<string | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [barriers, setBarriers] = useState<Barrier[]>([])
  const [barriersTruncated, setBarriersTruncated] = useState(false)
  const [barriersLoading, setBarriersLoading] = useState(false)
  const [barriersError, setBarriersError] = useState<string | null>(null)

  useEffect(() => {
    if (!bbox) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setBarriersLoading(true)
      try {
        const result = await api.barriers(CITY, bbox, controller.signal)
        setBarriers(result.barriers)
        setBarriersTruncated(result.truncated ?? false)
        setBarriersError(null)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setBarriers([])
        setBarriersError((err as Error).message)
      } finally {
        if (!controller.signal.aborted) setBarriersLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [bbox])

  useEffect(() => {
    if (!bbox) return
    const q = placesQuery.trim()
    const controller = new AbortController()
    const timer = setTimeout(() => {
      api
        // Wyszukiwanie po nazwie obejmuje cały obszar demo, nie tylko widok mapy
        .places(
          CITY,
          { q: q || undefined, bbox: q ? undefined : bbox, limit: PLACES_LIMIT },
          controller.signal,
        )
        .then((found) => {
          setPlaces(found)
          setPlacesError(null)
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setPlacesError(e.message)
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [bbox, placesQuery])

  useEffect(() => {
    api
      .institutions(CITY)
      .then(setInstitutions)
      .catch(() => {
        // bez warstwy instytucji aplikacja dalej działa
      })
  }, [])

  return {
    places,
    placesError,
    institutions,
    barriers,
    barriersTruncated,
    barriersLoading,
    barriersError,
    ...gaps,
  }
}
