import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DataGapsSummary } from '../api/client'
import { DataGapsSection } from './DataGapsSection'

const summary: DataGapsSummary = {
  max_confidence: 0.4,
  total_length_m: 159242.9,
  gap_length_m: 14817.2,
  gap_share: 0.093,
  gap_segments: 865,
  no_surface_m: 14817.2,
  imprecise_incline_m: 240.5,
  by_kind: [
    { highway: 'service', label: 'droga dojazdowa', gap_length_m: 7125.2 },
    { highway: 'footway', label: 'chodnik', gap_length_m: 6981.4 },
  ],
  areas: [
    {
      label: 'okolice: Poselska',
      center: { lat: 50.0572, lon: 19.9357 },
      gap_length_m: 686,
      segments: 54,
    },
    {
      label: 'okolice: Kanonicza',
      center: { lat: 50.0567, lon: 19.9363 },
      gap_length_m: 651.4,
      segments: 12,
    },
  ],
}

function renderSection(props: Partial<Parameters<typeof DataGapsSection>[0]> = {}) {
  const handlers = { onVisibleChange: vi.fn(), onShow: vi.fn() }
  render(<DataGapsSection summary={summary} error={null} visible {...handlers} {...props} />)
  return handlers
}

describe('DataGapsSection', () => {
  it('pokazuje podsumowanie tekstem - nie tylko na mapie', () => {
    renderSection()

    expect(screen.getByText('14,82 km')).toBeInTheDocument()
    expect(screen.getByText('9%')).toBeInTheDocument()
    expect(screen.getByText(/droga dojazdowa 7,13 km, chodnik 6,98 km/)).toBeInTheDocument()
    expect(screen.getByText('54 odcinki', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('12 odcinków', { exact: false })).toBeInTheDocument()
  })

  it('klik w obszar przesuwa mapę', async () => {
    const { onShow } = renderSection()

    await userEvent.click(screen.getByRole('button', { name: /okolice: Poselska/ }))
    expect(onShow).toHaveBeenCalledWith({ lat: 50.0572, lon: 19.9357 })
  })

  it('przełącznik warstwy działa z klawiatury, a wyłączona warstwa nie pokazuje listy', async () => {
    const { onVisibleChange } = renderSection({ visible: false })

    expect(screen.queryByText('Gdzie brakuje najwięcej')).not.toBeInTheDocument()
    screen.getByRole('checkbox', { name: 'Pokaż braki danych na mapie' }).focus()
    await userEvent.keyboard(' ')
    expect(onVisibleChange).toHaveBeenCalledWith(true)
  })
})
