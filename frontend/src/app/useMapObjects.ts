// Co rysuje mapa: warstwy z chipów, a przy wyznaczonej trasie tylko obiekty blisko niej.
import { useMemo } from 'react'
import { useApp, useAppData } from './context'
import { mapLayerData, nearRoute, type LayerInput } from './layerData'
import { useActiveRoute } from './useRoute'

export interface MapObjects {
  visible: LayerInput
  /** Trasa jest i mapa pokazuje tylko obiekty przy niej (przełącznik „Pokaż wszystkie” wyłączony) */
  limitedToRoute: boolean
}

export function useMapObjects(): MapObjects {
  const [{ layers, resultSet, showAllObjects }] = useApp()
  const { places, institutions, barriers } = useAppData()
  const { active } = useActiveRoute()
  const line = useMemo(() => active?.segments.flatMap((s) => s.geometry) ?? [], [active])
  const limitedToRoute = line.length > 0 && !showAllObjects
  const visible = useMemo(() => {
    const layered = mapLayerData({ places, institutions, barriers }, layers, !!resultSet)
    return limitedToRoute ? nearRoute(layered, line) : layered
  }, [places, institutions, barriers, layers, resultSet, limitedToRoute, line])
  return { visible, limitedToRoute }
}
