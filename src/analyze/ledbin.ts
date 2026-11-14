// LED 发光数据（.bin）解析与情绪分析
// 格式：逐帧 × 逐灯珠，每灯珠 4 字节，通道顺序 B-R-G-W（W 恒为 0）；
// 灯珠在 bin 中的顺序由走线 JSON 给出：mapping[i] = [x, y]，y = 0 为顶部。
// 本模块不依赖 DOM，可在浏览器与 Node 中复用。
import {
  clamp,
  colorVec,
  emotionProfiles,
  lightVec,
  nearestTarget,
  rankTargets,
  quadrant,
  rgbToHsv,
  semanticVec,
  toLinear,
  dist,
  type ColorParams,
  type Vec,
} from '../emotion'
import { planckXY } from './fuse'
import { scenes, type ColorLightMetrics } from '../scenes'
import { DRIVE_GAMMA, FULL_FLUX, driveLut, mixFromHist, mixRGB, primaries, type DriveHist } from '../lightSource'
import { accumulate, finalize, newStats, type PaletteColor } from './visual'

export type LedMapping = [number, number][]
export type LedSource = 'semantic' | 'color' | 'light' | 'dynamic'
export const ledSourceLabels: Record<LedSource, string> = {
  semantic: '画面语义',
  color: '发光色彩',
  light: '光色参数',
  dynamic: '动态参数',
}
const baseWeights: Record<LedSource, number> = { semantic: 0.35, color: 0.3, light: 0.15, dynamic: 0.2 }

export const BYTES_PER_LED = 4
/** 通道偏移：B=0 R=1 G=2 W=3 */
const CH = { b: 0, r: 1, g: 2 }

export interface LedClip {
  name: string
  fps: number
  frames: number
  count: number
  width: number
  height: number
  data: Uint8Array
  mapping: LedMapping
}

/** 未入库名称的情绪语义补充定义 */
const extraKeywords: Record<string, string[]> = {
  雨后彩虹: ['释然', '希望', '明朗'],
}

export function parseName(file: string): { index: string | null; name: string; fps: number | null } {
  const base = file.replace(/^.*[\\/]/, '').replace(/\.bin$/i, '').replace(/^[0-9a-f]{8}_/, '')
  const m = base.match(/^(\d+)?\s*[-_]?\s*(.*?)(?:[_-](\d{2,3}))?$/)
  return { index: m?.[1] ?? null, name: (m?.[2] || base).trim(), fps: m?.[3] ? Number(m[3]) : null }
}

export function makeClip(name: string, data: Uint8Array, mapping: LedMapping, fps: number): LedClip {
  if (!Number.isFinite(fps) || fps < 1 || fps > 120)
    throw new Error('帧率必须为 1–120 fps')
  if (!mapping.length || mapping.some(([x, y]) => !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0))
    throw new Error('走线必须包含有效的非负整数坐标')
  const count = mapping.length
  const frameBytes = count * BYTES_PER_LED
  if (data.length < frameBytes * 2)
    throw new Error('灯光文件至少需要 2 帧有效数据')
  if (data.length % frameBytes !== 0)
    throw new Error(`文件大小 ${data.length} B 不是 ${count} 灯珠 × 4 通道（${frameBytes} B/帧）的整数倍，请确认走线 JSON`)
  return {
    name,
    fps,
    frames: data.length / frameBytes,
    count,
    width: Math.max(...mapping.map((p) => p[0])) + 1,
    height: Math.max(...mapping.map((p) => p[1])) + 1,
    data,
    mapping,
  }
}

/** 将第 f 帧绘制为 width × height 的 RGBA 栅格 */
export function frameRGBA(clip: LedClip, f: number, out?: Uint8ClampedArray): Uint8ClampedArray {
  const img = out ?? new Uint8ClampedArray(clip.width * clip.height * 4)
  const off = f * clip.count * BYTES_PER_LED
  for (let i = 0; i < clip.count; i++) {
    const [x, y] = clip.mapping[i]
    const o = off + i * BYTES_PER_LED
    const p = (y * clip.width + x) * 4
    img[p] = clip.data[o + CH.r]
    img[p + 1] = clip.data[o + CH.g]
    img[p + 2] = clip.data[o + CH.b]
    img[p + 3] = 255
  }
  return img
}

export interface TimelinePoint {
  t: number
  hex: string
  luminance: number // 0-100
}

export interface LedAnalysis {
  id: string
  name: string
  index: string | null
  fps: number
  frames: number
  duration: number
  count: number
  width: number
  height: number
  /** 关联的库内意境（设计意图） */
  linkedId: string | null
  keywords: string[]
  color: ColorParams
  palette: PaletteColor[]
  emission: {
    meanHex: string
    luminance: number // 平均输出亮度 0-100（相对满白）
    peakLuminance: number
    fluctuation: number // 亮度波动 ±%
    changeRate: number // 逐灯珠变化速率 %/s
    hueDrift: number // 色相漂移 °
    uniformity: number // 空间均匀度 U0（p5 / mean）
    period: number | null // 主周期 s
    events: number // 突变事件数
    eventsPerMin: number
    /** 采用值：有彩光实测时取实测，否则取 RGB 混色模型 */
    cct: number
    duv: number
    x: number
    y: number
    mr: number
    cri: number | null
    r9: number | null
    flux: number // lm
    power: number // W
    efficacy: number // lm/W
    sdcm: number | null
    source: 'measured' | 'model'
    /** RGB 三色混色模型推算（实测原色 + 驱动 γ） */
    model: { x: number; y: number; cct: number; duv: number; flux: number; power: number; efficacy: number }
    /** 关联场景的彩光实测 */
    measured: ColorLightMetrics | null
    /** 模型与实测的色度偏差 */
    dxy: number | null
  }
  vectors: Partial<Record<LedSource, Vec>>
  weights: Partial<Record<LedSource, number>>
  /** 驱动值分布：用于在任意 γ 下重算混光 */
  driveHist?: DriveHist
  /** 当前结果所用 γ */
  gamma?: number
  combined: Vec
  target: string
  /** 前 3 个情绪标签及匹配度 */
  ranked: { name: string; match: number }[]
  quadrant: string
  confidence: number
  /** 设计意图坐标（库内意境）与实发坐标偏差 */
  design: { id: string; name: string; combined: Vec; target: string; delta: number } | null
  trajectory: { t: number; v: Vec; hex: string }[]
  timeline: TimelinePoint[]
  review: string[]
}

const meanLin = (fl: [number, number, number][], n: number) => [0, 1, 2].map((k) => fl.reduce((s, l) => s + l[k], 0) / n)

const toHex = (lin: number[]) => {
  const m = Math.max(...lin) || 1
  return '#' + lin.map((v) => {
    const s = v / m
    const g = s <= 0.0031308 ? s * 12.92 : 1.055 * s ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, g)) * 255).toString(16).padStart(2, '0')
  }).join('')
}

const uv60 = (X: number, Y: number) => [(4 * X) / (-2 * X + 12 * Y + 3), (6 * Y) / (-2 * X + 12 * Y + 3)]

/** 在 CIE 1960 uv 平面搜索黑体轨迹最近点，求 CCT 与 Duv（轨迹上方为正）；对远离轨迹的彩色光比 McCamy 更稳健 */
export function cctDuv(x: number, y: number): { cct: number; duv: number } {
  const [u, v] = uv60(x, y)
  const d = (T: number) => {
    const [pu, pv] = uv60(...planckXY(T))
    return { dd: Math.hypot(u - pu, v - pv), sign: Math.sign(v - pv) }
  }
  let lo = Math.log(1667), hi = Math.log(25000)
  let best = Math.exp(lo), bestD = Infinity
  for (let i = 0; i <= 200; i++) {
    const T = Math.exp(lo + ((hi - lo) * i) / 200)
    const { dd } = d(T)
    if (dd < bestD) { bestD = dd; best = T }
  }
  // 黄金分割细化
  lo = Math.log(best) - 0.03; hi = Math.log(best) + 0.03
  for (let i = 0; i < 30; i++) {
    const a = lo + (hi - lo) * 0.382, b = lo + (hi - lo) * 0.618
    if (d(Math.exp(a)).dd < d(Math.exp(b)).dd) hi = b
    else lo = a
  }
  const T = Math.exp((lo + hi) / 2)
  const r = d(T)
  return { cct: Math.round(T / 10) * 10, duv: r.sign * r.dd }
}

function dynamicVec(e: { changeRate: number; fluctuation: number; eventsPerMin: number; uniformity: number; period: number | null }): Vec {
  const rateN = clamp((e.changeRate - 4) / 8)
  const flN = clamp((e.fluctuation - 20) / 40)
  const evN = clamp(e.eventsPerMin / 6, 0, 1)
  const slow = e.period != null && e.period >= 8 ? 0.15 : 0
  return {
    p: clamp(0.35 - 0.3 * Math.max(0, rateN) - 0.6 * evN + 0.2 * e.uniformity + slow),
    a: clamp(0.45 * rateN + 0.25 * flN + 0.6 * evN),
    d: clamp(0.1 + 0.3 * e.uniformity - 0.5 * evN),
  }
}

export function analyzeClip(clip: LedClip, opts: { id?: string; fileName?: string; /** 显式绑定的库内意境 id（优先于按名称匹配） */ linkId?: string | null } = {}): LedAnalysis {
  const { name, fps, frames, count } = clip
  const parsed = parseName(opts.fileName ?? name)
  const duration = frames / fps
  const review: string[] = []

  // ── 逐帧序列（光量按 RGB 三色实测原色计算）──
  const [fR, fG, fB] = primaries.map((p) => p.flux)
  const lumSeries = new Float32Array(frames)
  const hueX = new Float32Array(frames), hueY = new Float32Array(frames)
  const frameLin: [number, number, number][] = []
  let rateSum = 0, uniSum = 0, uniN = 0
  let driveR = 0, driveG = 0, driveB = 0
  const hR = new Array(256).fill(0), hG = new Array(256).fill(0), hB = new Array(256).fill(0)
  const ledY = new Float32Array(count)
  for (let f = 0; f < frames; f++) {
    const off = f * count * BYTES_PER_LED
    let r = 0, g = 0, b = 0, dr = 0, dg = 0, db = 0, Ysum = 0, diff = 0
    for (let i = 0; i < count; i++) {
      const o = off + i * BYTES_PER_LED
      const R = clip.data[o + CH.r], G = clip.data[o + CH.g], B = clip.data[o + CH.b]
      r += toLinear(R); g += toLinear(G); b += toLinear(B)
      hR[R]++; hG[G]++; hB[B]++
      const ir = driveLut[R], ig = driveLut[G], ib = driveLut[B]
      dr += ir; dg += ig; db += ib
      const Y = (ir * fR + ig * fG + ib * fB) / FULL_FLUX
      ledY[i] = Y
      Ysum += Y
      if (f > 0) {
        const p = o - count * BYTES_PER_LED
        diff += Math.abs(R - clip.data[p + CH.r]) + Math.abs(G - clip.data[p + CH.g]) + Math.abs(B - clip.data[p + CH.b])
      }
    }
    driveR += dr / count; driveG += dg / count; driveB += db / count
    const [h, s] = rgbToHsv([r, g, b].map((v) => (v / count) ** (1 / 2.2) * 255))
    hueX[f] = Math.cos((h * Math.PI) / 180) * s
    hueY[f] = Math.sin((h * Math.PI) / 180) * s
    const mean = Ysum / count
    lumSeries[f] = mean
    frameLin.push([r / count, g / count, b / count])
    if (f > 0) rateSum += diff / count / 3 / 2.55
    if (f % 5 === 0 && mean > 1e-4) {
      const sorted = Array.from(ledY).sort((a, c) => a - c)
      uniSum += sorted[Math.floor(count * 0.05)] / mean
      uniN++
    }
  }
  const changeRate = (rateSum / Math.max(1, frames - 1)) * fps // %/s
  const uniformity = uniN ? uniSum / uniN : 0
  const lumMean = lumSeries.reduce((s, v) => s + v, 0) / frames
  const lumSorted = Array.from(lumSeries).sort((a, c) => a - c)
  const p = (q: number) => lumSorted[Math.min(frames - 1, Math.floor(frames * q))]
  const fluctuation = lumMean ? ((p(0.95) - p(0.05)) / 2 / lumMean) * 100 : 0

  // 突变事件：帧间平均亮度跳变显著高于常态（如闪电）
  const jumps = Array.from(lumSeries).slice(1).map((v, i) => Math.abs(v - lumSeries[i]))
  const jSorted = [...jumps].sort((a, c) => a - c)
  const jMed = jSorted[Math.floor(jSorted.length / 2)] || 0
  const thr = Math.max(lumMean * 0.06, jMed * 12, 0.004)
  let events = 0, last = -1e9
  jumps.forEach((j, i) => {
    if (j > thr && i - last > fps * 0.5) { events++; last = i }
  })

  // 主周期：帧亮度自相关（去趋势），1 s ~ 时长 / 2
  let period: number | null = null
  {
    const step = Math.max(1, Math.round(fps / 10)) // 降采样到约 10 Hz
    const s: number[] = []
    for (let f = 0; f < frames; f += step) s.push(lumSeries[f])
    const m = s.reduce((a, c) => a + c, 0) / s.length
    const z = s.map((v) => v - m)
    const e0 = z.reduce((a, c) => a + c * c, 0)
    if (e0 > 1e-9) {
      const hz = fps / step
      const acf = (lag: number) => {
        let acc = 0
        for (let i = 0; i + lag < z.length; i++) acc += z[i] * z[i + lag]
        return acc / e0
      }
      // 先越过自相关的第一次下穿（< 0.1），再寻找最高峰
      let lag = 1
      while (lag < z.length / 2 && acf(lag) > 0.1) lag++
      let best = 0, bestLag = 0
      for (lag = Math.max(lag, Math.round(hz)); lag < z.length / 2; lag++) {
        const r = acf(lag)
        if (r > best) { best = r; bestLag = lag }
      }
      if (best > 0.3) period = Math.round((bestLag / hz) * 10) / 10
    }
  }

  // 色相漂移：逐帧平均色相的圆周标准差
  let sx = 0, sy = 0, sw = 0
  for (let f = 0; f < frames; f++) { sx += hueX[f]; sy += hueY[f]; sw += Math.hypot(hueX[f], hueY[f]) }
  const R = sw ? Math.hypot(sx, sy) / sw : 1
  const hueDrift = Math.round((Math.sqrt(-2 * Math.log(Math.max(1e-6, R))) * 180) / Math.PI)

  // ── 色彩统计（复用画面分析：逐帧栅格累积，最多 600 帧）──
  const st = newStats()
  const stride = Math.max(1, Math.ceil(frames / 600))
  const buf = new Uint8ClampedArray(clip.width * clip.height * 4)
  for (let f = 0; f < frames; f += stride) accumulate(st, frameRGBA(clip, f, buf), clip.width, clip.height)
  const { color, palette } = finalize(st)

  // ── 设计意图关联 ──
  const linked =
    (opts.linkId ? emotionProfiles.find((pr) => pr.id === opts.linkId) : null) ?? emotionProfiles.find((pr) => pr.name === parsed.name) ?? null
  const keywords = linked?.keywords ?? extraKeywords[parsed.name] ?? []
  if (!linked && extraKeywords[parsed.name]) review.push(`「${parsed.name}」未入库，情绪语义为补充定义`)
  if (!keywords.length) review.push('未匹配到情绪语义，语义维度未参与融合')
  const measured = (linked && scenes.find((sc) => sc.id === linked.id)?.colorLight) ?? null

  // ── 混光色度：RGB 三色混色模型 ──
  const mix = mixRGB(driveR / frames, driveG / frames, driveB / frames)
  const mcd = cctDuv(mix.x, mix.y)
  const model = {
    x: Math.round(mix.x * 10000) / 10000,
    y: Math.round(mix.y * 10000) / 10000,
    cct: Math.min(25000, mcd.cct),
    duv: Math.round(mcd.duv * 10000) / 10000,
    flux: Math.round(mix.flux),
    power: Math.round(mix.power * 10) / 10,
    efficacy: mix.power ? Math.round((mix.flux / mix.power) * 100) / 100 : 0,
  }
  const dxy = measured ? Math.round(Math.hypot(model.x - measured.x, model.y - measured.y) * 10000) / 10000 : null
  const x = measured?.x ?? model.x
  const y = measured?.y ?? model.y
  const cct = measured?.cct ?? model.cct
  const duv = measured?.duv ?? model.duv
  const mr = Math.round((0.00013 * Math.min(12000, cct) + 0.15) * 1000) / 1000
  if (measured) {
    review.push(`光色参数采用彩光实测（CCT ${measured.cct}K · Ra ${measured.cri} · Duv ${measured.duv}）；混色模型 Δxy ${dxy}`)
    if (dxy! > 0.03) review.push(`混色模型与实测色度偏差 Δxy ${dxy} 较大，请核对驱动曲线或测量时段`)
  } else {
    review.push(`光色由 RGB 实测原色 + 驱动 γ${DRIVE_GAMMA} 推算（平均误差 Δxy≈0.018），建议补测积分球数据`)
  }
  if (Math.abs(duv) > 0.02) review.push(`混光 Duv ${duv.toFixed(3)} 偏离黑体轨迹（彩色光），CCT 仅作参考，光色参数权重已下调`)

  const emission = {
    meanHex: toHex(meanLin(frameLin, frames)),
    luminance: Math.round(lumMean * 1000) / 10,
    peakLuminance: Math.round(lumSorted[frames - 1] * 1000) / 10,
    fluctuation: Math.round(fluctuation * 10) / 10,
    changeRate: Math.round(changeRate * 10) / 10,
    hueDrift,
    uniformity: Math.round(uniformity * 100) / 100,
    period,
    events,
    eventsPerMin: Math.round((events / duration) * 60 * 10) / 10,
    cct,
    duv,
    x,
    y,
    mr,
    cri: measured?.cri ?? null,
    r9: measured?.r9 ?? null,
    flux: measured?.flux ?? model.flux,
    power: measured?.power ?? model.power,
    efficacy: measured?.efficacy ?? model.efficacy,
    sdcm: measured?.sdcm ?? null,
    source: (measured ? 'measured' : 'model') as 'measured' | 'model',
    model,
    measured,
    dxy,
  }

  // ── PAD 融合 ──
  const vectors: Partial<Record<LedSource, Vec>> = {}
  if (keywords.length) vectors.semantic = semanticVec(keywords, review)
  vectors.color = colorVec(color)
  // 偏好 Duv 效应仅在白光附近成立，故限制在 ±0.008
  vectors.light = lightVec({
    cct: Math.min(12000, cct),
    lux: null,
    flux: emission.flux,
    brightness: emission.luminance,
    mr,
    cri: emission.cri,
    duv: clamp(duv, -0.008, 0.008),
    x,
    y,
    measured: !!measured,
  })
  vectors.dynamic = dynamicVec(emission)
  const keys = Object.keys(vectors) as LedSource[]
  // 彩色光（|Duv| > 0.02）时色温类法则可信度降低，光色参数权重减半以上
  const colored = Math.abs(duv) > 0.02
  const bw = { ...baseWeights, light: colored ? baseWeights.light * 0.4 : baseWeights.light }
  const wsum = keys.reduce((s, k) => s + bw[k], 0)
  const weights = Object.fromEntries(keys.map((k) => [k, bw[k] / wsum])) as Partial<Record<LedSource, number>>
  const fuseV = (vs: Partial<Record<LedSource, Vec>>) =>
    keys.reduce((acc, k) => ({ p: acc.p + vs[k]!.p * weights[k]!, a: acc.a + vs[k]!.a * weights[k]!, d: acc.d + vs[k]!.d * weights[k]! }), { p: 0, a: 0, d: 0 })
  const combined = fuseV(vectors)
  const spread = keys.reduce((s, k) => s + dist(vectors[k]!, combined) * weights[k]!, 0)
  const confidence = clamp(1 - spread / 1.2, 0, 1)

  // ── 情绪轨迹：12 个时间窗 ──
  const W = 12
  const trajectory: LedAnalysis['trajectory'] = []
  for (let w = 0; w < W; w++) {
    const f0 = Math.floor((w / W) * frames), f1 = Math.max(f0 + 2, Math.floor(((w + 1) / W) * frames))
    const ws = newStats()
    const wstride = Math.max(1, Math.ceil((f1 - f0) / 40))
    for (let f = f0; f < Math.min(frames, f1); f += wstride) accumulate(ws, frameRGBA(clip, f, buf), clip.width, clip.height)
    const Ls = ws.Ls.sort((a, c) => a - c)
    const wc = {
      ...color,
      brightness: ws.sumL / ws.n,
      saturation: (ws.sumS / ws.n) * 100,
      warmth: clamp(ws.warm / ws.n),
      contrast: Ls[Math.floor(Ls.length * 0.95)] - Ls[Math.floor(Ls.length * 0.05)],
    }
    let wr = 0, wl = 0, wj = 0
    const seg = lumSeries.slice(f0, Math.min(frames, f1))
    const segMean = seg.reduce((s, v) => s + v, 0) / seg.length || 1e-9
    const segSorted = Array.from(seg).sort((a, c) => a - c)
    wl = ((segSorted[Math.floor(seg.length * 0.95)] - segSorted[Math.floor(seg.length * 0.05)]) / 2 / segMean) * 100
    for (let i = f0 + 1; i < Math.min(frames, f1); i++) if (jumps[i - 1] > thr) wj++
    wr = changeRate // 变化速率按整体估计，避免短窗噪声
    const segDur = (f1 - f0) / fps
    const lin = [0, 1, 2].map((k) => frameLin.slice(f0, f1).reduce((s, l) => s + l[k], 0) / Math.max(1, f1 - f0))
    const vs: Partial<Record<LedSource, Vec>> = {
      ...vectors,
      color: colorVec(wc),
      dynamic: dynamicVec({ changeRate: wr, fluctuation: wl, eventsPerMin: (wj / segDur) * 60, uniformity, period }),
    }
    trajectory.push({ t: Math.round((f0 / fps) * 10) / 10, v: fuseV(vs), hex: toHex(lin) })
  }

  // ── 时间轴（每秒）──
  const timeline: TimelinePoint[] = []
  for (let s = 0; s < Math.floor(duration); s++) {
    const f0 = Math.floor(s * fps), f1 = Math.min(frames, Math.floor((s + 1) * fps))
    const lin = [0, 1, 2].map((k) => frameLin.slice(f0, f1).reduce((a, l) => a + l[k], 0) / Math.max(1, f1 - f0))
    const lum = lumSeries.slice(f0, f1).reduce((a, v) => a + v, 0) / Math.max(1, f1 - f0)
    timeline.push({ t: s, hex: toHex(lin), luminance: Math.round(lum * 1000) / 10 })
  }

  const design = linked
    ? { id: linked.id, name: linked.name, combined: linked.combined, target: linked.target, delta: Math.round(dist(linked.combined, combined) * 100) / 100 }
    : null
  if (design && design.delta > 0.35) review.push(`实发坐标与设计意图偏差 Δ${design.delta}，建议校准光色或动态参数`)

  return {
    id: opts.id ?? `led-${parsed.index ?? ''}-${parsed.name}`,
    name: linked?.name ?? parsed.name,
    index: parsed.index,
    fps,
    frames,
    duration: Math.round(duration * 10) / 10,
    count,
    width: clip.width,
    height: clip.height,
    linkedId: linked?.id ?? null,
    keywords,
    color,
    palette,
    emission,
    vectors,
    weights,
    driveHist: { r: hR, g: hG, b: hB, n: frames * count },
    gamma: DRIVE_GAMMA,
    combined,
    target: nearestTarget(combined),
    ranked: rankTargets(combined).map((r) => ({ name: r.target.name, match: r.match })),
    quadrant: quadrant(combined).name,
    confidence,
    design,
    trajectory,
    timeline,
    review,
  }
}

/** 按新的驱动 γ 重算混色模型；无实测的素材同时重算光色维度与情绪坐标 */
export function applyGamma(e: LedAnalysis, gamma: number): LedAnalysis {
  if (!e.driveHist) return e
  const mix = mixFromHist(e.driveHist, gamma)
  const cd = cctDuv(mix.x, mix.y)
  const model = {
    x: Math.round(mix.x * 10000) / 10000,
    y: Math.round(mix.y * 10000) / 10000,
    cct: Math.min(25000, cd.cct),
    duv: Math.round(cd.duv * 10000) / 10000,
    flux: Math.round(mix.flux),
    power: Math.round(mix.power * 10) / 10,
    efficacy: mix.power ? Math.round((mix.flux / mix.power) * 100) / 100 : 0,
  }
  const m = e.emission.measured
  const dxy = m ? Math.round(Math.hypot(model.x - m.x, model.y - m.y) * 10000) / 10000 : null
  const emission = {
    ...e.emission,
    model,
    dxy,
    // 平均输出可从驱动直方图精确重算；时序波动/峰值仍保留原始分析 γ。
    luminance: Math.round((mix.flux / FULL_FLUX) * 1000) / 10,
  }
  if (!m) {
    // 无实测：光色参数随模型变化
    const mr = Math.round((0.00013 * Math.min(12000, model.cct) + 0.15) * 1000) / 1000
    Object.assign(emission, { cct: model.cct, duv: model.duv, x: model.x, y: model.y, flux: model.flux, power: model.power, efficacy: model.efficacy, mr })
  }
  const vectors = {
    ...e.vectors,
    color: colorVec(e.color),
    light: lightVec({
      cct: Math.min(12000, emission.cct),
      lux: null,
      flux: emission.flux,
      brightness: emission.luminance,
      mr: emission.mr,
      cri: emission.cri,
      duv: clamp(emission.duv, -0.008, 0.008),
      x: emission.x,
      y: emission.y,
      measured: !!m,
    }),
  }
  const keys = Object.keys(vectors) as LedSource[]
  const combined = keys.reduce(
    (acc, k) => ({ p: acc.p + vectors[k]!.p * e.weights[k]!, a: acc.a + vectors[k]!.a * e.weights[k]!, d: acc.d + vectors[k]!.d * e.weights[k]! }),
    { p: 0, a: 0, d: 0 },
  )
  const spread = keys.reduce((s, k) => s + dist(vectors[k]!, combined) * e.weights[k]!, 0)
  const linked = e.linkedId ? emotionProfiles.find((p) => p.id === e.linkedId) : null
  return {
    ...e,
    gamma,
    emission,
    vectors,
    combined,
    confidence: clamp(1 - spread / 1.2, 0, 1),
    target: nearestTarget(combined),
    ranked: rankTargets(combined).map((r) => ({ name: r.target.name, match: r.match })),
    quadrant: quadrant(combined).name,
    design: linked
      ? { id: linked.id, name: linked.name, combined: linked.combined, target: linked.target, delta: Math.round(dist(linked.combined, combined) * 100) / 100 }
      : e.design,
  }
}

/** γ 拟合曲线：有彩光实测的素材在各 γ 下的平均 / 最大 Δxy */
export function gammaFitCurve(entries: LedAnalysis[], range = { min: 1, max: 3, step: 0.05 }) {
  const ref = entries.filter((e) => e.driveHist && e.emission.measured)
  const out: { gamma: number; mean: number; max: number }[] = []
  if (!ref.length) return { curve: out, best: null as number | null, bestMax: null as number | null, count: 0 }
  for (let g = range.min; g <= range.max + 1e-9; g += range.step) {
    const errs = ref.map((e) => {
      const mix = mixFromHist(e.driveHist!, g)
      return Math.hypot(mix.x - e.emission.measured!.x, mix.y - e.emission.measured!.y)
    })
    out.push({ gamma: Math.round(g * 100) / 100, mean: errs.reduce((s, v) => s + v, 0) / errs.length, max: Math.max(...errs) })
  }
  // best：平均 Δxy 最小；bestMax：最大 Δxy 最小（兼顾最差素材）
  const best = out.reduce((a, b) => (b.mean < a.mean ? b : a)).gamma
  const bestMax = out.reduce((a, b) => (b.max < a.max ? b : a)).gamma
  return { curve: out, best, bestMax, count: ref.length }
}
