import { describe, expect, it } from 'vitest'
import { visibleLabels, type Box } from './declutter'

const box = (left: number, top: number, width = 100, height = 14): Box => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
})

describe('visibleLabels', () => {
  it('pokazuje nazwy, które się nie nakładają', () => {
    const labels = [box(0, 0), box(0, 50)]
    const dots = [box(-12, 0, 12, 12), box(-12, 50, 12, 12)]
    expect(visibleLabels(labels, dots)).toEqual([true, true])
  })

  it('przy kolizji nazw zostaje nazwa wcześniejszego (bliższego) wyniku', () => {
    // dwa hotele prawie jeden nad drugim - nazwy nachodzą na siebie, kropki nie są pod nazwami
    const labels = [box(0, 0), box(0, 8), box(300, 0)]
    const dots = [box(-12, 0, 12, 12), box(-12, 8, 12, 12), box(288, 0, 12, 12)]
    expect(visibleLabels(labels, dots)).toEqual([true, false, true])
  })

  it('nazwa nie zasłania kropki innego punktu', () => {
    const labels = [box(0, 0), box(500, 0)]
    const dots = [box(-12, 0, 12, 12), box(50, 2, 12, 12)] // kropka nr 2 pod nazwą nr 1
    expect(visibleLabels(labels, dots)).toEqual([false, true])
  })
})
