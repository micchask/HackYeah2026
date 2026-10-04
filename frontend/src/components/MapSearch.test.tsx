import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, type SearchResult } from '../api/client'
import { MapSearch } from './MapSearch'

const results: SearchResult[] = [
  {
    id: 'institution:mk-krzysztofory',
    source: 'institution',
    match: 'name',
    label: 'Muzeum Krakowa — Pałac Krzysztofory',
    kind: 'muzeum',
    point: { lat: 50.0618, lon: 19.9368 },
    institution_id: 'mk-krzysztofory',
    distance_m: 120,
  },
  {
    id: 'address:1',
    source: 'address',
    match: 'name',
    label: 'Krzysztofory 1',
    point: { lat: 50.062, lon: 19.937 },
  },
]

afterEach(() => vi.restoreAllMocks())

describe('MapSearch', () => {
  it('pokazuje podpowiedzi i Enter wybiera pierwszą', async () => {
    const search = vi.spyOn(api, 'search').mockResolvedValue(results)
    const onSelect = vi.fn()
    render(<MapSearch city="krakow" near={{ lat: 50.06, lon: 19.94 }} onSelect={onSelect} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'krzysztof' } })

    expect(await screen.findByText('Muzeum Krakowa — Pałac Krzysztofory')).toBeInTheDocument()
    expect(screen.getByText('deklaracja dostępności')).toBeInTheDocument()
    expect(screen.getByText('muzeum · 120 m')).toBeInTheDocument()
    expect(search).toHaveBeenCalledWith(
      'krzysztof',
      'krakow',
      { lat: 50.06, lon: 19.94 },
      expect.any(AbortSignal),
    )

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(results[0])
  })
})

describe('MapSearch – zapytanie o rodzaj', () => {
  it('pierwsza opcja i Enter pokazują wszystkie wyniki na mapie', async () => {
    const hotels: SearchResult[] = [1, 2, 3].map((i) => ({
      id: `place:h${i}`,
      source: 'place',
      match: 'category',
      label: `Hotel ${i}`,
      kind: 'hotel',
      point: { lat: 50.06, lon: 19.94 },
    }))
    vi.spyOn(api, 'search').mockResolvedValue(hotels)
    const onShowAll = vi.fn()
    const onSelect = vi.fn()
    render(<MapSearch city="krakow" near={null} onSelect={onSelect} onShowAll={onShowAll} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'hotele' } })

    expect(await screen.findByText('Pokaż wszystkie na mapie (3)')).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onShowAll).toHaveBeenCalledWith(hotels, 'hotele')
    expect(onSelect).not.toHaveBeenCalled()
  })
})
