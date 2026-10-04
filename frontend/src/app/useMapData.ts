// Dane mapy dla widocznego obszaru: miejsca, instytucje, bariery (przeniesione z dawnego HomePage).
import { useEffect, useState } from 'react'
import { api, type Barrier, type Institution, type Place } from '../api/client'
import { CITY, type AppData } from './context'

// Tyle miejsc naraz trafia na mapę - więcej spowalnia mapę i czytnik ekranu
export const PLACES_LIMIT = 200

export function useMapData(bbox: string | null, placesQuery: string): AppData {
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
  }
}
