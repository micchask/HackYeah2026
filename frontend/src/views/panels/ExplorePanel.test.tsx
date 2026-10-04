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
  type: 'stairs',
  description: `Schody ${i}`,
  street: `Ulica ${i}`,
  location: P,
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
  it('sekcje z nagłówkami h2', async () => {
    renderPanel()
    for (const name of ['Zaplanuj trasę', 'Dostępne w pobliżu', 'Bariery w widoku mapy']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    // wydarzenia (przykładowe) wczytują się asynchronicznie
    expect(await screen.findByRole('heading', { level: 2, name: 'Wydarzenia' })).toBeInTheDocument()
    expect(screen.getAllByText('dane przykładowe').length).toBeGreaterThan(0)
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

  it('„Dostępne w pobliżu” otwiera kartę miejsca', async () => {
    const user = userEvent.setup()
    const dispatch = renderPanel()
    const nearby = screen.getByRole('region', { name: 'Dostępne w pobliżu' })
    await user.click(within(nearby).getByRole('button', { name: /Kawiarnia Bez Progu/ }))
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'openPanel',
        panel: expect.objectContaining({ kind: 'place' }),
      }),
    )
  })

  it('bariery zwinięte do 5 z „Pokaż wszystkie”', async () => {
    const user = userEvent.setup()
    renderPanel()
    const section = screen.getByRole('region', { name: 'Bariery w widoku mapy' })
    expect(within(section).getAllByRole('button', { name: /Ulica/ })).toHaveLength(5)
    await user.click(within(section).getByRole('button', { name: 'Pokaż wszystkie bariery (8)' }))
    expect(within(section).getAllByRole('button', { name: /Ulica/ })).toHaveLength(8)
  })
})
