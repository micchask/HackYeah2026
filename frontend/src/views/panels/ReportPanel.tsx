// Zgłoszenie bariery jako osobny stan panelu (plan §5.6, #95). Punkt przychodzi z kontekstu:
// karta miejsca, odcinek trasy, okienko na mapie albo przycisk „Zgłoś problem” na mapie.
import { useState } from 'react'
import type { Report } from '../../api/client'
import { CITY, useApp } from '../../app/context'
import { useActiveRoute } from '../../app/useRoute'
import { reportConfirmation } from '../../components/attributes'
import { ReportForm } from '../../components/ReportForm'
import { ReportSent } from '../../components/ReportSent'
import { panelTitle } from '../panelTitles'

export function ReportPanel() {
  const [state, dispatch] = useApp()
  const { segmentPoint } = useActiveRoute()
  const [sent, setSent] = useState<Report | null>(null)
  const picking = state.pickTarget === 'report'
  const previous = state.history.at(-1)
  const backLabel = panelTitle(previous)

  if (sent) {
    return (
      <ReportSent
        message={reportConfirmation(sent)}
        backLabel={backLabel}
        onBack={() => dispatch({ type: 'back' })}
        onStay={() => setSent(null)}
      />
    )
  }

  return (
    <ReportForm
      city={CITY}
      point={state.reportPoint}
      onPointChange={(point) => {
        dispatch({ type: 'setReportPoint', point })
        if (picking) dispatch({ type: 'setPickTarget', target: null })
      }}
      picking={picking}
      onPick={(on) => dispatch({ type: 'setPickTarget', target: on ? 'report' : null })}
      segmentPoint={segmentPoint}
      defaultOpen
      collapsible={false}
      onSent={(report) => {
        if (picking) dispatch({ type: 'setPickTarget', target: null })
        setSent(report)
      }}
    />
  )
}
