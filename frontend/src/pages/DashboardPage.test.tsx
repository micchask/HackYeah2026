import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, type CityStats } from '../api/client'
import { DashboardPage } from './DashboardPage'

const stats: CityStats = {
  city: 'krakow',
  generated_at: '2026-10-04T12:00:00Z',
  network_length_m: 159242.9,
  network_segments: 7515,
  coverage: [
    { key: 'surface', sources: ['osm'], length_m: 144425.7, share: 0.907 },
    { key: 'incline_percent', sources: ['nmt_gugik'], length_m: 147281.9, share: 0.925 },
    { key: 'width_cm', sources: [], length_m: 0, share: 0 },
  ],
  gap_length_m: 14817.2,
  gap_share: 0.093,
  barriers_total: 1552,
  barriers_by_type: [
    { type: 'rough_surface', count: 1065, length_m: 17879.8 },
    { type: 'stairs', count: 282, length_m: 1724.2 },
  ],
  priority_weights: { stairs: 3, kerb: 3, reported: 3, steep: 2, rough_surface: 1 },
  priority_streets: [
    { street: 'Bulwar Wołyński', score: 77, barriers: 28, by_type: { stairs: 21, steep: 7 } },
  ],
  reports_total: 0,
  reports_by_status: [
    { status: 'pending', count: 0 },
    { status: 'confirmed', count: 0 },
  ],
  reports_by_type: [{ type: 'barrier', count: 0 }],
}

afterEach(() => vi.restoreAllMocks())

describe('DashboardPage', () => {
  it('pokazuje liczby z /api/stats i tabelę obok każdego wykresu', async () => {
    vi.spyOn(api, 'stats').mockResolvedValue(stats)
    render(<DashboardPage />)

    expect(await screen.findByText('1552')).toBeInTheDocument()
    expect(screen.getAllByText('90,7%').length).toBeGreaterThan(0)

    const section = screen.getByRole('region', { name: 'Pokrycie danymi' })
    const coverage = within(section).getByRole('table')
    expect(within(coverage).getByRole('rowheader', { name: 'nawierzchnia' })).toBeInTheDocument()
    expect(within(coverage).getByText('model terenu GUGiK')).toBeInTheDocument()
    expect(within(coverage).getAllByText('brak').length).toBe(1)
  })

  it('ranking priorytetów ma wynik i liczby barier wg rodzaju', async () => {
    vi.spyOn(api, 'stats').mockResolvedValue(stats)
    render(<DashboardPage />)

    const row = (await screen.findByRole('rowheader', { name: 'Bulwar Wołyński' })).closest('tr')!
    expect(within(row).getByText('77')).toBeInTheDocument()
    expect(within(row).getByText('21')).toBeInTheDocument()
    expect(screen.getByText(/schody 3, wysoki krawężnik 3/)).toBeInTheDocument()
  })

  it('brak zgłoszeń jest opisany, a błąd API pokazany jako alert', async () => {
    vi.spyOn(api, 'stats').mockResolvedValue(stats)
    const { unmount } = render(<DashboardPage />)
    expect(await screen.findByText('Na razie brak zgłoszeń w obszarze demo.')).toBeInTheDocument()
    unmount()

    vi.spyOn(api, 'stats').mockRejectedValue(new Error('API 503'))
    render(<DashboardPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('API 503')
  })
})
