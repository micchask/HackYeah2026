// Dashboard miasta (#30): pokrycie danymi, bariery, priorytety inwestycji, zgłoszenia.
// Argument dla miasta (B2G, #36) - wszystkie liczby z GET /api/stats, każdy wykres ma tabelę.
import { useEffect, useState } from 'react'
import { api, type CityStats } from '../api/client'
import { CITY } from '../app/context'
import { ATTRIBUTE_LABEL, REPORT_STATUS_LABEL, REPORT_TYPE_LABEL } from '../components/attributes'
import { BarChart } from '../components/BarChart'
import { BARRIER_LABEL } from '../components/barrierStyle'
import { formatKm } from '../components/format'

type BarrierType = keyof typeof BARRIER_LABEL

const SOURCE_LABEL: Record<string, string> = {
  osm: 'OpenStreetMap',
  nmt_gugik: 'model terenu GUGiK',
}

const percent = (share: number) => `${(share * 100).toFixed(1).replace('.', ',')}%`

// Kolumny rankingu: od barier, które zatrzymują wózek, do tych, które tylko utrudniają
const PRIORITY_COLUMNS: BarrierType[] = ['stairs', 'kerb', 'reported', 'steep', 'rough_surface']

export function DashboardPage() {
  const [stats, setStats] = useState<CityStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .stats(CITY, controller.signal)
      .then(setStats)
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
    return () => controller.abort()
  }, [])

  if (error) {
    return (
      <div className="dashboard">
        <h2>Dashboard miasta</h2>
        <p role="alert" className="callout callout-error">
          Nie udało się wczytać statystyk: {error}
        </p>
      </div>
    )
  }
  if (!stats) {
    return (
      <div className="dashboard" aria-busy="true">
        <h2>Dashboard miasta</h2>
        <p className="meta">Liczę statystyki…</p>
      </div>
    )
  }

  const surface = stats.coverage.find((c) => c.key === 'surface')
  const weights = stats.priority_weights as Partial<Record<BarrierType, number>>

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>Dashboard miasta</h2>
        <p className="meta">
          Obszar demo: Stare Miasto, Wawel, Kazimierz · stan na{' '}
          {new Date(stats.generated_at).toLocaleString('pl-PL')}
        </p>
      </header>

      <section aria-labelledby="kpi-heading">
        <h3 id="kpi-heading" className="visually-hidden">
          Najważniejsze liczby
        </h3>
        <ul className="kpi-tiles">
          <li className="kpi">
            <span className="kpi-value">{formatKm(stats.network_length_m)}</span>
            <span className="kpi-label">sieci pieszej ({stats.network_segments} odcinków)</span>
          </li>
          <li className="kpi">
            <span className="kpi-value">{surface ? percent(surface.share) : '–'}</span>
            <span className="kpi-label">długości ze znaną nawierzchnią</span>
          </li>
          <li className="kpi">
            <span className="kpi-value">{stats.barriers_total}</span>
            <span className="kpi-label">barier (schody, krawężniki, stromo, bruk)</span>
          </li>
          <li className="kpi">
            <span className="kpi-value">{stats.reports_total ?? '–'}</span>
            <span className="kpi-label">
              {stats.reports_total === null ? 'zgłoszeń – brak danych' : 'zgłoszeń użytkowników'}
            </span>
          </li>
        </ul>
      </section>

      <section className="card" aria-labelledby="coverage-heading">
        <h3 id="coverage-heading">Pokrycie danymi</h3>
        <BarChart
          title="Cecha odcinka"
          valueHeader="Udział długości sieci"
          extraHeaders={['Długość', 'Źródło']}
          max={1}
          rows={stats.coverage.map((c) => ({
            key: c.key,
            label: ATTRIBUTE_LABEL[c.key as keyof typeof ATTRIBUTE_LABEL] ?? c.key,
            value: c.share,
            display: percent(c.share),
            extra: [
              formatKm(c.length_m),
              c.sources.map((s) => SOURCE_LABEL[s] ?? s).join(', ') || 'brak',
            ],
          }))}
          note={`Bez danych o nawierzchni: ${formatKm(stats.gap_length_m)} (${percent(stats.gap_share)}) – szczegóły na mapie braków danych.`}
        />
      </section>

      <section className="card" aria-labelledby="barriers-heading">
        <h3 id="barriers-heading">Najczęstsze bariery</h3>
        <BarChart
          title="Rodzaj bariery"
          valueHeader="Liczba"
          extraHeaders={['Długość odcinków']}
          rows={stats.barriers_by_type.map((b) => ({
            key: b.type,
            label: BARRIER_LABEL[b.type],
            value: b.count,
            display: String(b.count),
            extra: [b.length_m ? formatKm(b.length_m) : '–'],
          }))}
        />
      </section>

      <section className="card" aria-labelledby="priority-heading">
        <h3 id="priority-heading">Priorytety inwestycji</h3>
        <p className="meta">
          Ulice z największą sumą wag barier. Wagi:{' '}
          {PRIORITY_COLUMNS.map((t) => `${BARRIER_LABEL[t].toLowerCase()} ${weights[t] ?? 0}`).join(
            ', ',
          )}
          . To, co zatrzymuje wózek całkiem, waży więcej niż to, co tylko utrudnia.
        </p>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Ulica</th>
                <th scope="col">Wynik</th>
                {PRIORITY_COLUMNS.map((t) => (
                  <th key={t} scope="col">
                    {BARRIER_LABEL[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.priority_streets.map((s, i) => (
                <tr key={s.street}>
                  <td>{i + 1}</td>
                  <th scope="row">{s.street}</th>
                  <td>
                    <strong>{s.score}</strong>
                  </td>
                  {PRIORITY_COLUMNS.map((t) => (
                    <td key={t}>{s.by_type[t] ?? 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" aria-labelledby="reports-heading">
        <h3 id="reports-heading">Zgłoszenia użytkowników</h3>
        {stats.reports_total === null ? (
          <p className="meta">
            Magazyn zgłoszeń jest niedostępny – liczby pojawią się po jego uruchomieniu.
          </p>
        ) : (
          <>
            {stats.reports_total === 0 && (
              <p className="meta">Na razie brak zgłoszeń w obszarze demo.</p>
            )}
            <BarChart
              title="Status"
              valueHeader="Liczba"
              rows={stats.reports_by_status.map((r) => ({
                key: r.status,
                label: REPORT_STATUS_LABEL[r.status],
                value: r.count,
                display: String(r.count),
              }))}
            />
            <BarChart
              title="Rodzaj zgłoszenia"
              valueHeader="Liczba"
              rows={stats.reports_by_type.map((r) => ({
                key: r.type,
                label: REPORT_TYPE_LABEL[r.type],
                value: r.count,
                display: String(r.count),
              }))}
            />
          </>
        )}
      </section>
    </div>
  )
}
