import { useId, type ReactNode } from 'react'

export interface BarRow {
  key: string
  label: string
  value: number
  /** Tekst wartości przy słupku i w tabeli, np. "90,7%" albo "282" */
  display: string
  /** Dodatkowe kolumny tabeli, np. długość odcinków */
  extra?: ReactNode[]
}

interface Props {
  title: string
  rows: BarRow[]
  /** Maksimum skali; domyślnie największa wartość (dla udziałów podaj 1) */
  max?: number
  valueHeader: string
  extraHeaders?: string[]
  note?: ReactNode
}

/**
 * Poziome słupki jednej serii + tabela z tymi samymi liczbami tuż pod nimi (WCAG 1.1.1).
 * Słupki są dla oka (aria-hidden), czytnik ekranu i kopiowanie danych korzystają z tabeli.
 * Jedna seria = jeden kolor; wartość zawsze podpisana tekstem, nigdy samym kolorem.
 */
export function BarChart({ title, rows, max, valueHeader, extraHeaders = [], note }: Props) {
  const id = useId()
  const scale = max ?? Math.max(1, ...rows.map((r) => r.value))
  return (
    <figure className="bar-chart" aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="bar-chart-title">
        {title}
      </figcaption>
      <div className="bar-chart-bars" aria-hidden="true">
        {rows.map((row) => (
          <div key={row.key} className="bar-row" title={`${row.label}: ${row.display}`}>
            <span className="bar-label">{row.label}</span>
            <span className="bar-track">
              <span
                className="bar-fill"
                style={{ width: `${Math.min(100, (row.value / scale) * 100)}%` }}
              />
            </span>
            <span className="bar-value">{row.display}</span>
          </div>
        ))}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{title}</th>
            <th scope="col">{valueHeader}</th>
            {extraHeaders.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{row.display}</td>
              {row.extra?.map((cell, i) => (
                <td key={extraHeaders[i] ?? i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="meta">{note}</p>}
    </figure>
  )
}
