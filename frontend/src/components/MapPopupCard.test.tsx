import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MapPopupCard } from './MapPopupCard'

describe('MapPopupCard', () => {
  it('„Zgłoś problem tutaj” tylko gdy jest akcja zgłoszenia', () => {
    const onReport = vi.fn()
    const props = { id: 'x', title: 'Apteka', onDetails: vi.fn(), onClose: vi.fn() }
    const { rerender } = render(<MapPopupCard {...props} />)
    expect(screen.queryByRole('button', { name: 'Zgłoś problem tutaj' })).not.toBeInTheDocument()

    rerender(<MapPopupCard {...props} onReport={onReport} />)
    fireEvent.click(screen.getByRole('button', { name: 'Zgłoś problem tutaj' }))
    expect(onReport).toHaveBeenCalledOnce()
  })
})
