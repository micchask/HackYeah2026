import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Barrier } from '../api/client'
import { BarrierList } from './BarrierList'

const P = { lat: 50.055, lon: 19.935 }

const BARRIERS: Barrier[] = [
  {
    id: 'segment:1-2-0',
    type: 'stairs',
    description: 'Schody, 81 stopni',
    street: 'Wzgórze Wawelskie',
    location: P,
    geometry: [P, { lat: 50.0552, lon: 19.936 }],
    length_m: 30,
    source: 'osm',
    source_ref: 'way/395982452',
    confidence: 0.6,
  },
  {
    id: 'segment:3-4-0',
    type: 'rough_surface',
    description: 'Kostka granitowa (bruk)',
    street: 'Grodzka',
    location: P,
    geometry: [P, { lat: 50.056, lon: 19.937 }],
    length_m: 99,
    source: 'osm',
    confidence: 0.6,
  },
  {
    id: 'report:r-1',
    type: 'reported',
    description: 'Niedziałająca winda',
    location: P,
    geometry: [P],
    source: 'user_reports',
    source_ref: 'r-1',
    confidence: 0.4,
  },
]

function renderList(overrides: Partial<Parameters<typeof BarrierList>[0]> = {}) {
  const props = {
    barriers: BARRIERS,
    truncated: false,
    loading: false,
    error: null,
    visible: true,
    onVisibleChange: vi.fn(),
    selected: null,
    onSelect: vi.fn(),
    ...overrides,
  }
  render(<BarrierList {...props} />)
  return props
}

describe('BarrierList', () => {
  it('grupuje bariery wg typu i podaje źródło oraz pewność tekstem', () => {
    renderList()
    expect(screen.getByText('3 barier w widocznym obszarze.')).toBeInTheDocument()
    expect(screen.getByText('Schody (1)')).toBeInTheDocument()
    expect(screen.getByText('Nierówna nawierzchnia (1)')).toBeInTheDocument()
    expect(screen.getByText('Zgłoszenie użytkowników (1)')).toBeInTheDocument()
    const stairs = screen.getByRole('button', { name: /Wzgórze Wawelskie/ })
    expect(within(stairs).getByText('OpenStreetMap · pewność 60%')).toBeInTheDocument()
  })

  it('przełącznik „Pokaż bariery na mapie” to checkbox z etykietą', async () => {
    const user = userEvent.setup()
    const props = renderList()
    await user.click(screen.getByRole('checkbox', { name: 'Pokaż bariery na mapie' }))
    expect(props.onVisibleChange).toHaveBeenCalledWith(false)
  })

  it('wybór bariery z listy pokazuje ją na mapie', async () => {
    const user = userEvent.setup()
    const props = renderList()
    await user.click(screen.getByRole('button', { name: /Niedziałająca winda/ }))
    expect(props.onSelect).toHaveBeenCalledWith('report:r-1')
  })

  it('przy obciętym wyniku prosi o przybliżenie mapy', () => {
    renderList({ truncated: true })
    expect(screen.getByText(/pokazujemy część – przybliż mapę/)).toBeInTheDocument()
  })
})

describe('BarrierList – zgłoszenia użytkowników (#62)', () => {
  it('zwinięta lista nie chowa zgłoszeń i pokazuje ich stan głosowania', () => {
    const stairs: Barrier[] = Array.from({ length: 6 }, (_, i) => ({
      ...BARRIERS[0],
      id: `segment:s-${i}`,
      street: `Schody ${i}`,
    }))
    const report: Barrier = {
      ...BARRIERS[2],
      report: { report_id: 'r-1', status: 'pending', confirmations: 1, denials: 0 },
    }
    render(
      <BarrierList
        barriers={[...stairs, report]}
        truncated={false}
        loading={false}
        error={null}
        visible
        onVisibleChange={() => {}}
        selected={null}
        onSelect={() => {}}
        collapsedLimit={3}
      />,
    )
    expect(screen.getByText('Niedziałająca winda')).toBeInTheDocument()
    expect(
      screen.getByText('Niepotwierdzone – na razie potwierdzone przez 1 osobę'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Schody 5')).not.toBeInTheDocument() // reszta zwinięta
  })
})
