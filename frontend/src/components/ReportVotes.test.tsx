import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, type Report } from '../api/client'
import { reportVotesText } from './attributes'
import { ReportVotes } from './ReportVotes'

const pending = { report_id: 'r-1', status: 'pending' as const, confirmations: 1, denials: 0 }

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('reportVotesText', () => {
  it('liczba osób słowami, z polską odmianą', () => {
    expect(reportVotesText({ status: 'confirmed', confirmations: 3, denials: 0 })).toBe(
      'Potwierdzone przez 3 osoby',
    )
    expect(reportVotesText({ status: 'confirmed', confirmations: 5, denials: 1 })).toBe(
      'Potwierdzone przez 5 osób · 1 osoba: problemu już nie ma',
    )
    expect(reportVotesText({ status: 'pending', confirmations: 1, denials: 0 })).toBe(
      'Niepotwierdzone – na razie potwierdzone przez 1 osobę',
    )
    expect(reportVotesText({ status: 'pending', confirmations: 0, denials: 2 })).toBe(
      'Niepotwierdzone – nikt jeszcze nie potwierdził · 2 osoby: problemu już nie ma',
    )
  })
})

describe('ReportVotes', () => {
  it('„Potwierdzam” wysyła głos, pokazuje nowy stan i zapamiętuje wybór', async () => {
    const updated = {
      id: 'r-1',
      status: 'confirmed',
      confirmations: 2,
      denials: 0,
    } as Report
    const vote = vi.spyOn(api, 'voteReport').mockResolvedValue(updated)
    const onVoted = vi.fn()
    render(<ReportVotes report={pending} onVoted={onVoted} />)

    fireEvent.click(screen.getByRole('button', { name: 'Potwierdzam' }))
    expect(vote).toHaveBeenCalledWith('r-1', 'confirm')
    expect(await screen.findByText(/Dziękujemy za głos/)).toBeInTheDocument()
    expect(screen.getByText('Potwierdzone przez 2 osoby')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Potwierdzam' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(onVoted).toHaveBeenCalledWith(updated)
  })

  it('błąd z serwera (np. własne zgłoszenie) w role="alert"', async () => {
    vi.spyOn(api, 'voteReport').mockRejectedValue(
      new Error('Nie możesz głosować na własne zgłoszenie.'),
    )
    render(<ReportVotes report={pending} />)
    fireEvent.click(screen.getByRole('button', { name: 'Problemu już nie ma' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('własne zgłoszenie')
  })
})
