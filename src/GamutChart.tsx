// CIE 1931 xy 色度图：RGB 三色混色色域 + 黑体轨迹 + 场景色度点
import { planckXY } from './analyze/fuse'
import { primaries } from './lightSource'
import { useId, useMemo } from 'react'
import { xyToSrgb, insideTriangle } from './cieColor'

export interface GamutPoint {
  id: string
  label?: string
  x: number
  y: number
  color: string
  kind: 'measured' | 'model'
  /** 同一场景的模型点与实测点相连 */
  pair?: string
  active?: boolean
}

const X0 = 0.12, X1 = 0.64, Y0 = 0.12, Y1 = 0.54
let gamutImage: string | undefined
function colorImage() {
  if (gamutImage) return gamutImage
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 291
  const ctx = canvas.getContext('2d')!
  const data = ctx.createImageData(canvas.width, canvas.height)
  for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
    const x = X0 + px / (canvas.width - 1) * (X1 - X0)
    const y = Y1 - py / (canvas.height - 1) * (Y1 - Y0)
    if (!insideTriangle(x, y, primaries)) continue
    const offset = (py * canvas.width + px) * 4
    data.data.set([...xyToSrgb(x, y), 255], offset)
  }
  ctx.putImageData(data, 0, 0)
  gamutImage = canvas.toDataURL()
  return gamutImage
}

export function GamutChart({ points, width = 360, showLabels = true }: { points: GamutPoint[]; width?: number; showLabels?: boolean }) {
  const clipId = useId().replace(/:/g, '')
  const image = useMemo(() => colorImage(), [])
  const H = width * ((Y1 - Y0) / (X1 - X0))
  const px = (x: number) => ((x - X0) / (X1 - X0)) * width
  const py = (y: number) => H - ((y - Y0) / (Y1 - Y0)) * H
  const tri = primaries.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')
  const locus: string[] = []
  for (let i = 0; i <= 60; i++) {
    const T = Math.exp(Math.log(1667) + ((Math.log(25000) - Math.log(1667)) * i) / 60)
    const [x, y] = planckXY(T)
    locus.push(`${px(x)},${py(y)}`)
  }
  const ticks = [2000, 3000, 4000, 6500, 10000, 20000]
  const byPair = new Map<string, GamutPoint[]>()
  points.forEach((p) => p.pair && byPair.set(p.pair, [...(byPair.get(p.pair) ?? []), p]))

  return (
    <svg role="img" aria-label="CIE 1931 RGB 色域（xy 转 sRGB 显示近似）" viewBox={`-8 -8 ${width + 16} ${H + 26}`} className="w-full">
      <defs>
        <clipPath id={clipId}><polygon points={tri} /></clipPath>
      </defs>
      <image data-testid="cie-color-image" href={image} width={width} height={H} clipPath={`url(#${clipId})`} opacity=".85" />
      <rect x="0" y="0" width={width} height={H} fill="none" stroke="white" strokeOpacity="0.08" />
      {[0.2, 0.3, 0.4, 0.5, 0.6].map((v) => (
        <g key={`x${v}`}>
          <line x1={px(v)} x2={px(v)} y1={0} y2={H} stroke="white" strokeOpacity="0.05" />
          <text x={px(v)} y={H + 12} fontSize="9" fill="white" fillOpacity="0.35" textAnchor="middle">{v}</text>
        </g>
      ))}
      {[0.2, 0.3, 0.4, 0.5].map((v) => (
        <g key={`y${v}`}>
          <line y1={py(v)} y2={py(v)} x1={0} x2={width} stroke="white" strokeOpacity="0.05" />
          <text x={-3} y={py(v) + 3} fontSize="9" fill="white" fillOpacity="0.35" textAnchor="end">{v}</text>
        </g>
      ))}
      <polygon points={tri} fill="none" stroke="white" strokeOpacity="0.7" strokeDasharray="4 3" />
      {primaries.map((p) => (
        <g key={p.key}>
          <circle cx={px(p.x)} cy={py(p.y)} r="5" fill={`rgb(${xyToSrgb(p.x, p.y).join(',')})`} stroke="white" strokeWidth="1.5" />
          <text x={px(p.x) + 8} y={py(p.y) + 4} fontSize="11" fontWeight="700" fill="white">{p.key}</text>
        </g>
      ))}
      <polyline points={locus.join(' ')} fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1.2" />
      {ticks.map((T) => {
        const [x, y] = planckXY(T)
        return (
          <g key={T}>
            <circle cx={px(x)} cy={py(y)} r="1.8" fill="white" fillOpacity="0.7" />
            <text x={px(x) + 4} y={py(y) - 5} fontSize="8.5" fill="white" fillOpacity="0.45">{T >= 10000 ? `${T / 1000}k` : T}K</text>
          </g>
        )
      })}
      {[...byPair.values()].map((ps) =>
        ps.length === 2 ? (
          <line key={ps[0].pair} x1={px(ps[0].x)} y1={py(ps[0].y)} x2={px(ps[1].x)} y2={py(ps[1].y)} stroke="white" strokeOpacity="0.4" strokeDasharray="2 2" />
        ) : null,
      )}
      {points.map((p) => (
        <g key={`${p.id}-${p.kind}`} opacity={p.active === false ? 0.35 : 1}>
          {p.kind === 'measured' ? (
            <circle cx={px(p.x)} cy={py(p.y)} r={p.active ? 6 : 4.5} fill={p.color} stroke="white" strokeWidth={p.active ? 2 : 1} />
          ) : (
            <circle cx={px(p.x)} cy={py(p.y)} r={p.active ? 5 : 3.5} fill="none" stroke={p.color} strokeWidth="1.5" />
          )}
          {showLabels && p.label && p.kind === 'measured' && (
            <text x={px(p.x) + 8} y={py(p.y) + 3} fontSize="9.5" fill="white" fillOpacity={p.active ? 1 : 0.65}>{p.label}</text>
          )}
        </g>
      ))}
      <text x={width} y={H + 22} fontSize="9" fill="white" fillOpacity="0.45" textAnchor="end">CIE 1931 x →</text>
    </svg>
  )
}
