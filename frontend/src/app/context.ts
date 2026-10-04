// Konteksty i hooki stanu aplikacji. Provider: AppState.tsx.
import { createContext, useContext, type Dispatch } from 'react'
import type { Barrier, DataGapsSummary, Institution, Place, SegmentCollection } from '../api/client'
import type { DemoEvent, DemoPoi } from '../api/demo'
import type { Action, AppState } from './state'

export const CITY = 'krakow'

export interface AppData {
  places: Place[]
  placesError: string | null
  institutions: Institution[]
  barriers: Barrier[]
  barriersTruncated: boolean
  barriersLoading: boolean
  barriersError: string | null
  /** Punkty dodatkowych warstw, odświeżane dla aktualnego bbox mapy. */
  restSpots: DemoPoi[]
  parkingSpots: DemoPoi[]
  events: DemoEvent[]
  /** Braki danych (#31) - pobierane tylko przy włączonej warstwie „gaps” */
  dataGaps: SegmentCollection | null
  dataGapsSummary: DataGapsSummary | null
  dataGapsError: string | null
}

export const StateContext = createContext<AppState | null>(null)
export const DispatchContext = createContext<Dispatch<Action> | null>(null)
export const DataContext = createContext<AppData | null>(null)

export function useApp(): [AppState, Dispatch<Action>] {
  const state = useContext(StateContext)
  const dispatch = useContext(DispatchContext)
  if (!state || !dispatch) throw new Error('useApp() poza <AppProvider>')
  return [state, dispatch]
}

export function useAppData(): AppData {
  const data = useContext(DataContext)
  if (!data) throw new Error('useAppData() poza <AppProvider>')
  return data
}
