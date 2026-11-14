// 画面 / 视频本地分析：色彩参数 + 画面语义元素（启发式识别，需人工确认）
import { clamp, linToXyz, mccamy, rgbToHsv, toLinear, xyzToLab, type ColorParams } from '../emotion'

export interface PaletteColor {
  hex: string
  share: number
}

export interface SemanticTag {
  id: string
  label: string
  /** 0-1 自动识别置信度；0 表示未自动识别（可人工添加） */
  confidence: number
  selected: boolean
  auto: boolean
}

export interface Keyframe {
  t: number
  hex: string
  brightness: number
}

export interface VisualResult {
  kind: 'image' | 'video'
  name: string
  url: string
  color: ColorParams
  palette: PaletteColor[]
  tags: SemanticTag[]
  /** 视频专有：运动强度 0-100、时长、色彩关键帧 */
  motion?: number
  duration?: number
  keyframes?: Keyframe[]
}

/** 画面语义元素及其 PAD 先验 */
export const semanticElements: { id: string; label: string; pad: [number, number, number] }[] = [
  { id: 'nature', label: '自然', pad: [0.55, -0.3, 0.3] },
  { id: 'open', label: '空间开阔', pad: [0.55, 0.1, 0.5] },
  { id: 'water', label: '水景', pad: [0.5, -0.3, 0.2] },
  { id: 'night', label: '夜景', pad: [0.1, -0.35, -0.1] },
  { id: 'warmlight', label: '温暖光源', pad: [0.6, -0.1, 0.2] },
  { id: 'people', label: '人物', pad: [0.3, 0.1, 0.0] },
  { id: 'social', label: '社交感', pad: [0.6, 0.4, 0.2] },
  { id: 'activity', label: '活动', pad: [0.4, 0.5, 0.3] },
  { id: 'speed', label: '速度感', pad: [0.2, 0.75, 0.3] },
  { id: 'order', label: '秩序感', pad: [0.25, -0.3, 0.5] },
  { id: 'lonely', label: '孤独感', pad: [-0.3, -0.4, -0.3] },
  { id: 'ritual', label: '宗教/仪式感', pad: [0.3, -0.1, -0.2] },
  { id: 'commercial', label: '商业感', pad: [0.2, 0.35, 0.3] },
  { id: 'tech', label: '科技感', pad: [0.2, 0.5, 0.4] },
  { id: 'danger', label: '危险暗示', pad: [-0.6, 0.7, -0.5] },
]

const SIZE = 160

export interface Stats {
  n: number
  sumL: number
  sumS: number
  sumV: number
  warm: number
  hueX: number
  hueY: number
  lin: [number, number, number]
  Ls: number[]
  samples: [number, number, number][]
  green: number
  skyTop: number
  topN: number
  waterBottom: number
  bottomN: number
  warmBright: number
  skin: number
  neon: number
  red: number
}

export const newStats = (): Stats => ({
  n: 0, sumL: 0, sumS: 0, sumV: 0, warm: 0, hueX: 0, hueY: 0, lin: [0, 0, 0], Ls: [], samples: [],
  green: 0, skyTop: 0, topN: 0, waterBottom: 0, bottomN: 0, warmBright: 0, skin: 0, neon: 0, red: 0,
})

export function accumulate(st: Stats, data: Uint8ClampedArray, w: number, h: number) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const [hue, s, v] = rgbToHsv([r, g, b])
      const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b)
      const L = xyzToLab(linToXyz([lr, lg, lb]))[0]
      st.n++
      st.sumL += L
      st.sumS += s
      st.sumV += v
      st.lin[0] += lr; st.lin[1] += lg; st.lin[2] += lb
      st.warm += Math.cos(((hue - 35) * Math.PI) / 180) * s
      st.hueX += Math.cos((hue * Math.PI) / 180) * s
      st.hueY += Math.sin((hue * Math.PI) / 180) * s
      if ((x + y) % 3 === 0) st.Ls.push(L)
      if ((x * 7 + y * 13) % 5 === 0) st.samples.push([r, g, b])

      if (hue >= 65 && hue <= 170 && s > 0.18 && v > 0.15) st.green++
      if (y < h / 3) {
        st.topN++
        if ((hue >= 180 && hue <= 250 && s > 0.12 && v > 0.45) || (s < 0.12 && v > 0.82)) st.skyTop++
      }
      if (y > h / 2) {
        st.bottomN++
        if (hue >= 170 && hue <= 230 && s > 0.2 && v > 0.2) st.waterBottom++
      }
      if (hue >= 15 && hue <= 50 && s > 0.4 && v > 0.75) st.warmBright++
      if (r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15 && hue <= 35 && s > 0.2 && s < 0.6) st.skin++
      if (s > 0.6 && v > 0.6 && hue >= 180 && hue <= 320) st.neon++
      if ((hue <= 12 || hue >= 345) && s > 0.65 && v > 0.35) st.red++
    }
  }
}

function kmeans(samples: [number, number, number][], k = 5): PaletteColor[] {
  if (!samples.length) return []
  const step = Math.max(1, Math.floor(samples.length / 6000))
  const pts = samples.filter((_, i) => i % step === 0)
  // 按亮度排序后等距取初始中心，保证覆盖明暗
  const sorted = [...pts].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
  let centers = Array.from({ length: k }, (_, i) => [...sorted[Math.floor(((i + 0.5) / k) * sorted.length)]])
  let assign = new Array(pts.length).fill(0)
  for (let it = 0; it < 10; it++) {
    assign = pts.map((p) => {
      let bi = 0, bd = Infinity
      centers.forEach((c, ci) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2
        if (d < bd) { bd = d; bi = ci }
      })
      return bi
    })
    centers = centers.map((c, ci) => {
      const mem = pts.filter((_, i) => assign[i] === ci)
      if (!mem.length) return c
      return [0, 1, 2].map((j) => mem.reduce((s, m) => s + m[j], 0) / mem.length)
    })
  }
  const counts = centers.map((_, ci) => assign.filter((a) => a === ci).length)
  return centers
    .map((c, ci) => ({
      hex: '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''),
      share: counts[ci] / pts.length,
    }))
    .filter((c) => c.share > 0.01)
    .sort((a, b) => b.share - a.share)
}

export function finalize(st: Stats, extra: { motion?: number } = {}) {
  const brightness = st.sumL / st.n
  const saturation = (st.sumS / st.n) * 100
  const meanV = st.sumV / st.n
  const Ls = [...st.Ls].sort((a, b) => a - b)
  const contrast = Ls[Math.floor(Ls.length * 0.95)] - Ls[Math.floor(Ls.length * 0.05)]
  const sw = st.sumS || 1
  const complexity = (1 - Math.hypot(st.hueX, st.hueY) / sw) * 100
  const lin = st.lin.map((v) => v / st.n)
  const [X, Y, Z] = linToXyz(lin)
  const x = X / (X + Y + Z || 1), y = Y / (X + Y + Z || 1)
  const palette = kmeans(st.samples)

  // 主色：面积 × 彩度
  const scored = palette.map((c) => {
    const rgb = [1, 3, 5].map((i) => parseInt(c.hex.slice(i, i + 2), 16))
    const lab = xyzToLab(linToXyz(rgb.map(toLinear)))
    return { c, rgb, lab, score: c.share * (0.3 + Math.hypot(lab[1], lab[2]) / 60) }
  })
  const dom = scored.reduce((a, b) => (b.score > a.score ? b : a), scored[0])
  const hsv = rgbToHsv(dom.rgb)
  const mixMax = Math.max(...lin) || 1
  const mixHex = '#' + lin.map((v) => {
    const s = v / mixMax
    const g = s <= 0.0031308 ? s * 12.92 : 1.055 * s ** (1 / 2.4) - 0.055
    return Math.round(g * 255).toString(16).padStart(2, '0')
  }).join('')

  const color: ColorParams = {
    dominant: dom.c.hex,
    rgb: dom.rgb as [number, number, number],
    lab: dom.lab.map(Math.round) as [number, number, number],
    hsv: [Math.round(hsv[0]), Math.round(hsv[1] * 100), Math.round(hsv[2] * 100)],
    mix: mixHex,
    brightness,
    saturation,
    contrast,
    warmth: clamp(st.warm / st.n),
    complexity,
    x,
    y,
    cct: Math.round(clamp(mccamy(x, y), 1800, 12000) / 10) * 10,
  }

  // ── 语义元素启发式识别 ──
  const r = (v: number) => v / st.n
  const darkness = clamp((0.38 - meanV) / 0.2, 0, 1)
  const motion = extra.motion
  const conf: Record<string, number> = {
    nature: clamp(r(st.green) * 2.6 + (st.skyTop / (st.topN || 1)) * 0.4, 0, 0.95),
    open: clamp((st.skyTop / (st.topN || 1)) * 1.6, 0, 0.9),
    water: clamp((st.waterBottom / (st.bottomN || 1)) * 2, 0, 0.85),
    night: clamp(darkness, 0, 0.9),
    warmlight: clamp(r(st.warmBright) * 10 * (0.4 + darkness), 0, 0.85),
    people: clamp((r(st.skin) - 0.03) * 5, 0, 0.6),
    tech: clamp(r(st.neon) * 6 * (meanV < 0.45 ? 1 : 0.5), 0, 0.8),
    danger: clamp(r(st.red) * 4 * (contrast / 70) * (0.5 + darkness), 0, 0.7),
    order: clamp((1 - complexity / 100) * (saturation < 30 ? 0.5 : 0.2), 0, 0.5),
    speed: motion == null ? 0 : clamp((motion - 12) / 25, 0, 0.9),
    activity: motion == null ? 0 : clamp((motion - 5) / 25, 0, 0.8),
  }
  const tags: SemanticTag[] = semanticElements.map((e) => {
    const c = conf[e.id] ?? 0
    return { id: e.id, label: e.label, confidence: c, selected: c >= 0.35, auto: c >= 0.15 }
  })
  return { color, palette, tags }
}

function canvasFor(w: number, h: number) {
  const scale = SIZE / Math.max(w, h)
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * scale))
  c.height = Math.max(1, Math.round(h * scale))
  return { c, ctx: c.getContext('2d', { willReadFrequently: true })! }
}

export async function analyzeImage(file: File): Promise<VisualResult> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  await img.decode()
  const { c, ctx } = canvasFor(img.naturalWidth, img.naturalHeight)
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const st = newStats()
  accumulate(st, ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)
  return { kind: 'image', name: file.name, url, ...finalize(st) }
}

const seek = (v: HTMLVideoElement, t: number) =>
  new Promise<void>((res) => {
    const done = () => { v.removeEventListener('seeked', done); res() }
    v.addEventListener('seeked', done)
    v.currentTime = t
  })

export async function analyzeVideo(file: File, onProgress?: (p: number) => void): Promise<VisualResult> {
  const url = URL.createObjectURL(file)
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  v.src = url
  await new Promise<void>((res, rej) => {
    v.onloadeddata = () => res()
    v.onerror = () => rej(new Error('无法解码该视频格式'))
  })
  const duration = v.duration || 0
  const { c, ctx } = canvasFor(v.videoWidth, v.videoHeight)
  const st = newStats()
  const N = 12
  const keyframes: Keyframe[] = []
  let motionSum = 0
  for (let i = 0; i < N; i++) {
    const t = Math.min(duration - 0.3, (duration * (i + 0.5)) / N)
    await seek(v, Math.max(0, t))
    ctx.drawImage(v, 0, 0, c.width, c.height)
    const a = ctx.getImageData(0, 0, c.width, c.height).data
    accumulate(st, a, c.width, c.height)
    // 关键帧色彩：帧平均线性 RGB
    const fr = newStats()
    accumulate(fr, a, c.width, c.height)
    const lin = fr.lin.map((x) => x / fr.n)
    const m = Math.max(...lin) || 1
    keyframes.push({
      t,
      hex: '#' + lin.map((x) => {
        const s = x / m
        const g = s <= 0.0031308 ? s * 12.92 : 1.055 * s ** (1 / 2.4) - 0.055
        return Math.round(g * 255).toString(16).padStart(2, '0')
      }).join(''),
      brightness: fr.sumL / fr.n,
    })
    // 运动强度：相隔 0.2s 的两帧平均像素差
    await seek(v, Math.min(duration, Math.max(0, t) + 0.2))
    ctx.drawImage(v, 0, 0, c.width, c.height)
    const b = ctx.getImageData(0, 0, c.width, c.height).data
    let diff = 0
    for (let j = 0; j < a.length; j += 4) diff += Math.abs(a[j] - b[j]) + Math.abs(a[j + 1] - b[j + 1]) + Math.abs(a[j + 2] - b[j + 2])
    motionSum += diff / (a.length / 4) / 3 / 2.55
    onProgress?.((i + 1) / N)
  }
  const motion = motionSum / N
  return { kind: 'video', name: file.name, url, duration, keyframes, motion, ...finalize(st, { motion }) }
}
