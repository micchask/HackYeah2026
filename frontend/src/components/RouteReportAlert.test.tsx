import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ActiveReport } from '../api/client'
import { RouteReportAlert } from './RouteReportAlert'

const report: ActiveReport = {
  id: 'r1',
  type: 'construction',
  effect: 'block',
  label: 'remont / zablokowane przejście',
  location: { lat: 50.06, lon: 19.93 },
  active_until: '2026-11-01T00:00:00Z',
}

describe('RouteReportAlert', () => {
  it('nic nie pokazuje bez nowych zgłoszeń', () => {
    const { container } = render(
      <RouteReportAlert reports={[]} onRecalculate={vi.fn()} onDismiss={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('informuje o barierze i przelicza trasę na żądanie', async () => {
    const onRecalculate = vi.fn()
    const onDismiss = vi.fn()
    render(
      <RouteReportAlert reports={[report]} onRecalculate={onRecalculate} onDismiss={onDismiss} />,
    )
    expect(screen.getByText(/Na Twojej trasie potwierdzono barierę/)).toHaveTextContent(
      'remont / zablokowane przejście',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Przelicz trasę' }))
    expect(onRecalculate).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Zamknij' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
