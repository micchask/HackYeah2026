import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Barrier, Place } from '../../api/client'
import { DataContext, DispatchContext, StateContext, type AppData } from '../../app/context'
import { initialState } from '../../app/state'
import { ExplorePanel } from './ExplorePanel'

const P = { lat: 50.06, lon: 19.94 }

const cafe = {
  id: 'osm:1',
  city: 'krakow',
  name: 'Kawiarnia Bez Progu',
  category: 'cafe',
  location: P,
  attributes: [
    {
      key: 'wheelchair',
      value: 'yes',
      confidence: 0.6,
      provenance: { source: 'osm', source_type: 'osm', fetched_at: '2026-10-03T00:00:00Z' },
    },
  ],
} as Place

const barriers = Array.from({ length: 8 }, (_, i) => ({
  id: `segment:${i}`,
  type: i === 7 ? 'reported' : 'stairs',
  description: `Schody ${i}`,
  street: `Ulica ${i}`,
  location: { lat: P.lat + i * 0.001, lon: P.lon },
  geometry: [P],
  source: 'osm',
  confidence: 0.6,
})) as Barrier[]

const DATA = {
  places: [cafe],
  placesError: null,
  institutions: [],
  barriers,
  barriersTruncated: false,
  barriersLoading: false,
  barriersError: null,
} as unknown as AppData

function renderPanel() {
  const dispatch = vi.fn()
  const state = { ...initialState({ profile: 'wheelchair' }), mapCenter: P }
  render(
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        <DataContext.Provider value={DATA}>
          <ExplorePanel />
        </DataContext.Provider>
      </DispatchContext.Provider>
    </StateContext.Provider>,
  )
  return dispatch
}

describe('ExplorePanel', () => {
  it('duże „Zaplanuj trasę”, szybkie akcje i krótkie sekcje', async () => {
    const dispatch = renderPanel()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Zaplanuj trasę/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'openPanel', panel: { kind: 'route' } })

    const actions = screen.getByRole('list', { name: 'Szybkie akcje' })
    expect(within(actions).getAllByRole('button')).toHaveLength(4)
    for (const name of ['Polecane w pobliżu', 'Aktualne utrudnienia']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument()
    }
    // wydarzenia (przykładowe) wczytują się asynchronicznie
    expect(await screen.findByRole('heading', { level: 3, name: 'Wydarzenia' })).toBeInTheDocument()
  })

  it('trasa demo jednym kliknięciem ustawia oba punkty', async () => {
    const user = userEvent.setup()
    const dispatch = renderPanel()
    await user.click(screen.getByRole('button', { name: 'Rynek → Wawel' }))
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'setOrigin',
        point: expect.objectContaining({ label: 'Rynek Główny (Sukiennice)' }),
      }),
    )
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'setDestination' }))
  })

  it('„Polecane w pobliżu” otwiera kartę miejsca', async () => {
    const user = userEvent.setup()
    const dispatch = renderPanel()
    const nearby = screen.getByRole('region', { name: 'Polecane w pobliżu' })
    await user.click(within(nearby).getByRole('button', { name: /Kawiarnia Bez Progu/ }))
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'openPanel',
        panel: expect.objectContaining({ kind: 'place' }),
      }),
    )
  })

  it('utrudnienia: najwyżej 3, zgłoszenia najpierw, „Pokaż więcej” otwiera pełną listę', async () => {
    const user = userEvent.setup()
    const dispatch = renderPanel()
    const section = screen.getByRole('region', { name: 'Aktualne utrudnienia' })
    const items = within(section).getAllByRole('button', { name: /Ulica/ })
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Ulica 7')
    await user.click(within(section).getByRole('button', { name: /Pokaż więcej/ }))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'openPanel',
      panel: { kind: 'list', list: 'barriers' },
    })
  })
})
