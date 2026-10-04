// Nazwy punktów na mapie bez nakładania (styl mapy jest rastrowy - MapLibre nie rozmieści napisów sam).

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

/**
 * Które nazwy pokazać: kolejność = pierwszeństwo (wyniki od najbliższych środka mapy).
 * Nazwa znika, gdy zasłoniłaby już pokazaną nazwę albo kropkę innego punktu.
 */
export function visibleLabels(labels: Box[], dots: Box[]): boolean[] {
  const placed: Box[] = []
  return labels.map((label, i) => {
    const hit =
      placed.some((p) => overlaps(label, p)) ||
      dots.some((dot, j) => j !== i && overlaps(label, dot))
    if (!hit) placed.push(label)
    return !hit
  })
}
