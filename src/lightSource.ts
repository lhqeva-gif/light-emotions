// 光源模型：RGB 三色 LED 混色（单色实测数据）
// 每颗灯珠驱动值 d ∈ [0,255] → 相对光强 (d/255)^γ；整灯三刺激值 = Σ 通道强度 × 单色满载三刺激值
// γ 由 7 段 bin 与彩光实测 xy 拟合得到（γ = 1.6 时平均 Δxy ≈ 0.018）

export interface Primary {
  key: 'R' | 'G' | 'B'
  /** 实测色温 K */
  cct: number
  cri: number
  r9: number
  /** 满载光通量 lm（整灯全部灯珠单色全亮） */
  flux: number
  /** 满载功率 W */
  power: number
  efficacy: number
  sdcm: number
  duv: number
  x: number
  y: number
  hex: string
}

export const primaries: Primary[] = [
  { key: 'R', cct: 1454, cri: 88.8, r9: 42, flux: 4054.6, power: 88.86, efficacy: 45.63, sdcm: 83.7, duv: 0.0000636, x: 0.5918, y: 0.3901, hex: '#ff4a2a' },
  { key: 'G', cct: 4536, cri: 60.7, r9: -95, flux: 10857, power: 88.88, efficacy: 122.15, sdcm: 58.1, duv: 0.0464, x: 0.3821, y: 0.4958, hex: '#c9e84a' },
  { key: 'B', cct: 100000, cri: 27.5, r9: -193, flux: 5130.7, power: 89, efficacy: 57.65, sdcm: 104.6, duv: -0.0714, x: 0.1597, y: 0.1589, hex: '#4a6cff' },
]

export const DRIVE_GAMMA = 1.6

const xyz = (p: Primary) => [(p.x / p.y) * p.flux, p.flux, ((1 - p.x - p.y) / p.y) * p.flux]
const [XR, XG, XB] = primaries.map(xyz)

/** 驱动值 → 相对光强查找表 */
export const driveLut = Float32Array.from({ length: 256 }, (_, v) => (v / 255) ** DRIVE_GAMMA)

/** 三通道相对光强（0-1，可为多灯珠平均值）→ 整灯 XYZ（Y 即光通量 lm）、功率 */
export function mixRGB(r: number, g: number, b: number) {
  const X = r * XR[0] + g * XG[0] + b * XB[0]
  const Y = r * XR[1] + g * XG[1] + b * XB[1]
  const Z = r * XR[2] + g * XG[2] + b * XB[2]
  const s = X + Y + Z || 1
  const power = r * primaries[0].power + g * primaries[1].power + b * primaries[2].power
  return { X, Y, Z, x: X / s, y: Y / s, flux: Y, power }
}

/** 整灯满白（三通道全亮）光通量，用于输出百分比 */
export const FULL_FLUX = primaries.reduce((s, p) => s + p.flux, 0)

/** 每通道 256 档驱动值计数 */
export interface DriveHist {
  r: number[]
  g: number[]
  b: number[]
  n: number
}

/** 由驱动值直方图在任意 γ 下求整灯平均混光（无需重新解析 bin） */
export function mixFromHist(h: DriveHist, gamma: number) {
  let r = 0, g = 0, b = 0
  for (let v = 1; v < 256; v++) {
    const k = (v / 255) ** gamma
    r += h.r[v] * k
    g += h.g[v] * k
    b += h.b[v] * k
  }
  return mixRGB(r / h.n, g / h.n, b / h.n)
}

export const GAMMA_RANGE = { min: 1, max: 3, step: 0.05 }
