import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoApi, inBbox, isDemoData } from './demo'

const DEMO_BBOX = '50.045,19.928,50.066,19.950'

afterEach(() => vi.unstubAllGlobals())

describe('demoApi', () => {
  it('filtruje parkingi po obszarze mapy', async () => {
    const all = await demoApi.parkingSpots(null)
    expect(all.length).toBeGreaterThanOrEqual(8)
    expect(await demoApi.parkingSpots(DEMO_BBOX)).toHaveLength(all.length)
    expect(await demoApi.parkingSpots('50.0625,19.934,50.064,19.936')).toEqual([
      expect.objectContaining({ name: 'Plac Szczepański' }),
    ])
    expect(all.every(isDemoData)).toBe(true)
  })

  it('wydarzenia są nadchodzące, od najbliższego, w obszarze demo i oznaczone jako przykładowe', async () => {
    const now = new Date('2026-10-04T08:00:00')
    const events = await demoApi.events(now)
    expect(events.length).toBeGreaterThanOrEqual(6)
    expect(events.every((e) => new Date(e.end) > now)).toBe(true)
    expect(events.map((e) => e.start)).toEqual([...events.map((e) => e.start)].sort())
    expect(events.every((e) => inBbox(e.location, DEMO_BBOX) && isDemoData(e))).toBe(true)
  })

  it('ławki pobiera z /api/pois i uzupełnia puste pola', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'osm:node/1',
            kind: 'bench',
            location: { lat: 50.06, lon: 19.94 },
            source: 'osm',
            provenance: { source: 'osm', source_type: 'osm', fetched_at: '2026-10-04T00:00:00Z' },
            confidence: 0.6,
          },
        ]),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const [bench] = await demoApi.restSpots(DEMO_BBOX)
    expect(fetchMock.mock.calls[0][0]).toContain('/api/pois?')
    expect(fetchMock.mock.calls[0][0]).toContain('kind=bench')
    expect(bench).toMatchObject({ name: null, details: {}, source: 'osm' })
    expect(isDemoData(bench)).toBe(false)
  })
})
