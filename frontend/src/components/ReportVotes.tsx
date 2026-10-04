import { useState } from 'react'
import { api, type BarrierReport, type Report, type VoteKind } from '../api/client'
import { reportVotesText } from './attributes'

const VOTES_KEY = 'kbb.votes'

function savedVote(reportId: string): VoteKind | null {
  try {
    const all = JSON.parse(localStorage.getItem(VOTES_KEY) ?? '{}') as Record<string, VoteKind>
    return all[reportId] ?? null
  } catch {
    return null
  }
}

function saveVote(reportId: string, vote: VoteKind) {
  try {
    const all = JSON.parse(localStorage.getItem(VOTES_KEY) ?? '{}') as Record<string, VoteKind>
    localStorage.setItem(VOTES_KEY, JSON.stringify({ ...all, [reportId]: vote }))
  } catch {
    // bez pamięci przeglądarki: głos i tak liczy serwer, tylko przycisk nie zapamięta wyboru
  }
}

interface Props {
  report: BarrierReport
  /** Głos zapisany - rodzic odświeża bariery (status, liczniki; rozwiązane znikają z mapy) */
  onVoted?: (report: Report) => void
}

/** „Potwierdzam” / „Problemu już nie ma” przy zgłoszeniu użytkownika (#62). */
export function ReportVotes({ report, onVoted }: Props) {
  const [mine, setMine] = useState<VoteKind | null>(() => savedVote(report.report_id))
  const [state, setState] = useState(report)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function vote(kind: VoteKind) {
    setSending(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await api.voteReport(report.report_id, kind)
      saveVote(report.report_id, kind)
      setMine(kind)
      if (updated.status === 'pending' || updated.status === 'confirmed') {
        setState({ ...state, status: updated.status, ...counts(updated) })
      }
      setMessage(
        updated.status === 'resolved' || updated.status === 'rejected'
          ? 'Dziękujemy! Zgłoszenie zostało zamknięte i zniknie z mapy.'
          : `Dziękujemy za głos. ${reportVotesText({ ...counts(updated), status: updated.status })}.`,
      )
      onVoted?.(updated)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="report-votes">
      <p className={`report-votes-state report-votes-${state.status}`}>{reportVotesText(state)}</p>
      <fieldset className="report-votes-actions">
        <legend className="visually-hidden">Czy to zgłoszenie jest aktualne?</legend>
        <button
          type="button"
          className="chip"
          aria-pressed={mine === 'confirm'}
          disabled={sending}
          onClick={() => void vote('confirm')}
        >
          Potwierdzam
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={mine === 'deny'}
          disabled={sending}
          onClick={() => void vote('deny')}
        >
          Problemu już nie ma
        </button>
      </fieldset>
      {message && <output className="meta report-votes-message">{message}</output>}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}

function counts(report: Report) {
  return { confirmations: report.confirmations ?? 0, denials: report.denials ?? 0 }
}
