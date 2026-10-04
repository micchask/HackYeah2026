import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportSent } from './ReportSent'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function renderSent() {
  const onBack = vi.fn()
  const onStay = vi.fn()
  render(
    <ReportSent
      message="Dziękujemy! Zgłoszenie zapisane."
      backLabel="Trasa"
      seconds={3}
      onBack={onBack}
      onStay={onStay}
    />,
  )
  return { onBack, onStay }
}

describe('ReportSent', () => {
  it('pokazuje potwierdzenie w role="status" i sam wraca po odliczeniu', () => {
    const { onBack } = renderSent()
    expect(screen.getByRole('status')).toHaveTextContent('Dziękujemy! Zgłoszenie zapisane.')
    expect(screen.getByText('Za 3 s wrócisz do widoku „Trasa”.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '← Wróć teraz' })).toHaveFocus()

    // co sekundę jeden krok odliczania (kolejny timer powstaje po przerysowaniu)
    for (const shown of ['Za 2 s', 'Za 1 s']) {
      act(() => vi.advanceTimersByTime(1000))
      expect(screen.getByText(new RegExp(shown))).toBeInTheDocument()
      expect(onBack).not.toHaveBeenCalled()
    }
    act(() => vi.advanceTimersByTime(1000))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('„Wróć teraz” wraca od razu, „Zostań tutaj” pozwala zostać', () => {
    const { onBack, onStay } = renderSent()
    fireEvent.click(screen.getByRole('button', { name: 'Zostań tutaj i zgłoś kolejne' }))
    expect(onStay).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '← Wróć teraz' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
