// Stan aplikacji: jeden właściciel stanu dla wszystkich widoków (plan §3).
// Logika: state.ts (reducer), hooki: context.ts, useRoute.ts, useMapData.ts, mapActions.ts.
import { useEffect, useReducer, type ReactNode } from 'react'
import { DataContext, DispatchContext, StateContext } from './context'
import { appReducer, initialState, loadSaved, saveState } from './state'
import { useMapData } from './useMapData'
import { useRouteFetch } from './useRoute'

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, () =>
    initialState(loadSaved(browserStorage())),
  )
  const { profile, prefs, customized, layers } = state

  // Zapamiętujemy tylko tryb i personalizację - bez punktów trasy (prywatność)
  useEffect(() => {
    saveState(browserStorage(), { profile, prefs, customized, layers })
  }, [profile, prefs, customized, layers])

  useRouteFetch(state, dispatch)
  const data = useMapData(state.mapBbox, state.placesQuery, state.layers.gaps)

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        <DataContext.Provider value={data}>{children}</DataContext.Provider>
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}
