// Wydarzenia (dane przykładowe do czasu kalendarza miasta, #60) - wspólne dla „Dla Ciebie” i listy.
import { useEffect, useState } from 'react'
import { demoApi, type DemoEvent } from '../api/demo'

export function useEvents(): { events: DemoEvent[]; loading: boolean } {
  const [events, setEvents] = useState<DemoEvent[] | null>(null)
  useEffect(() => {
    let active = true
    demoApi
      .events()
      .then((all) => {
        if (active) setEvents(all)
      })
      .catch(() => {
        if (active) setEvents([])
      })
    return () => {
      active = false
    }
  }, [])
  return { events: events ?? [], loading: events === null }
}

/** „dziś, 17:00” / „jutro, 12:00” / „wt., 6 paź, 16:00” */
export function eventWhen(event: DemoEvent, now = new Date()): string {
  const start = new Date(event.start)
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000)
  const time = start.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  const date =
    diff === 0
      ? 'dziś'
      : diff === 1
        ? 'jutro'
        : start.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${date}, ${time}`
}
