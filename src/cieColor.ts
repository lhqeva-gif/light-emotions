/** CIE xy → XYZ (Y=1) → D65 sRGB；超出显示器色域时压缩/裁切，非光谱重现。 */
export function xyToSrgb(x: number, y: number): [number, number, number] {
  if (![x, y].every(Number.isFinite) || y <= 0 || x < 0 || x + y > 1)
    return [0, 0, 0]
  const X = x / y,
    Z = (1 - x - y) / y
  const rgb = [
    3.2406 * X - 1.5372 - 0.4986 * Z,
    -0.9689 * X + 1.8758 + 0.0415 * Z,
    0.0557 * X - 0.204 + 1.057 * Z,
  ]
  const scale = Math.max(1, ...rgb)
  return rgb.map((v) => {
    const c = Math.max(0, v / scale)
    return Math.round(
      255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055),
    )
  }) as [number, number, number]
}

export function insideTriangle(
  x: number,
  y: number,
  points: { x: number ;
y: number }[],
) {
  const [a, b, c] = points
  const cross = (p: typeof a, q: typeof a) =>
    (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x)
  const signs = [cross(a, b), cross(b, c), cross(c, a)]
  return !signs.some((n) => n < -1e-9) || !signs.some((n) => n > 1e-9)
}
