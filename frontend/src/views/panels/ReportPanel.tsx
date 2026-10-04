// Zgłoszenie bariery jako osobny stan panelu (plan §5.6) - dopracuje #95.
import { CITY, useApp } from '../../app/context'
import { useActiveRoute } from '../../app/useRoute'
import { ReportForm } from '../../components/ReportForm'

export function ReportPanel() {
  const [state, dispatch] = useApp()
  const { segmentPoint } = useActiveRoute()
  const picking = state.pickTarget === 'report'
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
    />
  )
}
