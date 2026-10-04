// Gdy trasa jest otwarta, co POLL_MS sprawdzamy, czy na niej nie potwierdzono nowej bariery (#63).
import { useEffect, useMemo, useState } from 'react'
import { api, type ActiveReport, type RouteResponse } from '../api/client'
import { CITY } from './context'
import { newReportsOnRoute, POLL_MS } from './routeReports'

export interface RouteReportWatch {
  /** Nowe zgłoszenia na trasie - trasa ich jeszcze nie omija */
  reports: ActiveReport[]
  dismiss: () => void
}

export function useRouteReportWatch(
  route: RouteResponse | null,
  active: RouteResponse | null,
): RouteReportWatch {
  const [reports, setReports] = useState<ActiveReport[]>([])
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    if (!route) return
    const controller = new AbortController()
    const check = () =>
      api
        .activeReports(CITY, controller.signal)
        .then(setReports)
        // Brak połączenia - komunikat po prostu się nie pokaże, spróbujemy za chwilę
        .catch(() => undefined)
    void check()
    const timer = setInterval(check, POLL_MS)
    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [route])

  const found = useMemo(
    () => (route && active ? newReportsOnRoute(reports, route, active, dismissed) : []),
    [reports, route, active, dismissed],
  )
  const dismiss = () => setDismissed((prev) => new Set([...prev, ...found.map((r) => r.id)]))
  return { reports: found, dismiss }
}
