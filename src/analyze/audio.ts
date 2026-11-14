// 音乐本地分析：Web Audio 解码 + FFT 特征提取

export interface MusicResult {
  name: string
  url: string
  /** 来源：独立音乐文件 / 视频原声 */
  origin: 'file' | 'video'
  duration: number
  analyzedSeconds: number
  bpm: number | null
  beatStrength: number // 0-1 节拍清晰度
  key: string
  mode: '大调' | '小调' | '五声音阶' | '环境音'
  keyClarity: number // 0-1
  loudness: number // dBFS
  centroid: number // Hz
  density: number // 起音 / 秒
  tension: number // 0-100
  natural: number // 0-100 自然声 / 噪声型声音占比（估算）
  waveform: number[]
}

const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

function fft(re: Float32Array, im: Float32Array) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2
        const tr = re[b] * cr - im[b] * ci
        const ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr; im[b] = im[a] - ti
        re[a] += tr; im[a] += ti
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }
}

const pearson = (a: number[], b: number[]) => {
  const ma = a.reduce((s, v) => s + v, 0) / a.length
  const mb = b.reduce((s, v) => s + v, 0) / b.length
  let num = 0, da = 0, db = 0
  a.forEach((v, i) => { num += (v - ma) * (b[i] - mb); da += (v - ma) ** 2; db += (b[i] - mb) ** 2 })
  return num / Math.sqrt(da * db || 1)
}

export async function analyzeAudio(file: File, origin: 'file' | 'video' = 'file'): Promise<MusicResult> {
  const buf = await file.arrayBuffer()
  const ctx = new AudioContext()
  let audio: AudioBuffer
  try {
    audio = await ctx.decodeAudioData(buf)
  } finally {
    ctx.close()
  }
  const sr = audio.sampleRate
  // 最多分析 90 秒（从 10% 处开始，避开前奏静音）
  const maxLen = Math.min(audio.length, sr * 90)
  const start = audio.length > maxLen ? Math.floor(Math.min(audio.length - maxLen, audio.length * 0.1)) : 0
  const mono = new Float32Array(maxLen)
  for (let ch = 0; ch < audio.numberOfChannels; ch++) {
    const d = audio.getChannelData(ch)
    for (let i = 0; i < maxLen; i++) mono[i] += d[start + i] / audio.numberOfChannels
  }

  const N = 2048, HOP = 1024
  const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)))
  const re = new Float32Array(N), im = new Float32Array(N)
  let prev = new Float32Array(N / 2)
  const flux: number[] = []
  const rmsArr: number[] = []
  const chroma = new Array(12).fill(0)
  let centroidSum = 0, centroidW = 0, noisy = 0, frames = 0
  const binHz = sr / N

  for (let off = 0; off + N <= maxLen; off += HOP) {
    let rms = 0
    for (let i = 0; i < N; i++) {
      const s = mono[off + i]
      rms += s * s
      re[i] = s * win[i]
      im[i] = 0
    }
    rms = Math.sqrt(rms / N)
    rmsArr.push(rms)
    fft(re, im)
    const mag = new Float32Array(N / 2)
    let f = 0, num = 0, den = 0, logSum = 0, linSum = 0
    for (let k = 1; k < N / 2; k++) {
      const m = Math.hypot(re[k], im[k])
      mag[k] = m
      const lm = Math.log1p(m * 10)
      const d = lm - Math.log1p(prev[k] * 10)
      if (d > 0) f += d
      const hz = k * binHz
      num += hz * m; den += m
      if (hz > 100 && hz < 8000) { logSum += Math.log(m + 1e-9); linSum += m }
      if (hz >= 55 && hz <= 4000 && m > 1e-4) {
        const pc = ((Math.round(12 * Math.log2(hz / 440) + 69) % 12) + 12) % 12
        chroma[pc] += m * m
      }
    }
    prev = mag
    flux.push(f)
    if (rms > 0.005) {
      centroidSum += (num / (den || 1)) * rms
      centroidW += rms
      const bins = Math.floor((8000 - 100) / binHz)
      const flat = Math.exp(logSum / bins) / (linSum / bins || 1)
      if (flat > 0.22) noisy++
      frames++
    }
  }

  const fps = sr / HOP
  // 起音包络：去均值后的谱通量
  const W = Math.round(fps)
  const env = flux.map((v, i) => {
    let s = 0, c = 0
    for (let j = Math.max(0, i - W); j < Math.min(flux.length, i + W); j++) { s += flux[j]; c++ }
    return Math.max(0, v - s / c)
  })
  // 平滑包络，使非整数帧周期的节拍也能在自相关中对齐
  let smooth = env
  for (let pass = 0; pass < 3; pass++) {
    smooth = smooth.map((v, i) => 0.25 * (smooth[i - 1] ?? v) + 0.5 * v + 0.25 * (smooth[i + 1] ?? v))
  }
  // BPM：自相关 + 以 110BPM 为中心的对数高斯先验，抑制倍频误判
  let bestLag = 0, bestScore = 0
  const e0 = smooth.reduce((s, v) => s + v * v, 0) || 1
  const ac = (lag: number) => {
    let s = 0
    for (let i = 0; i + lag < smooth.length; i++) s += smooth[i] * smooth[i + lag]
    return s / e0
  }
  for (let lag = Math.floor((fps * 60) / 180); lag <= Math.ceil((fps * 60) / 55); lag++) {
    const bpm = (60 * fps) / lag
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 110) / 0.9) ** 2)
    const score = ac(lag) * prior
    if (score > bestScore) { bestScore = score; bestLag = lag }
  }
  // 抛物线插值求亚帧精度的周期
  let fracLag = bestLag
  if (bestLag > 1) {
    const a = ac(bestLag - 1), b = ac(bestLag), c = ac(bestLag + 1)
    const den = a - 2 * b + c
    if (den < 0) fracLag = bestLag + (0.5 * (a - c)) / den
  }
  const beatStrength = Math.min(1, bestScore * 2.2)
  const bpm = bestLag && beatStrength > 0.12 ? Math.round((60 * fps) / fracLag) : null

  // 起音密度：阈值峰值检测
  const mean = env.reduce((s, v) => s + v, 0) / env.length
  const sd = Math.sqrt(env.reduce((s, v) => s + (v - mean) ** 2, 0) / env.length)
  let onsets = 0, last = -999
  for (let i = 1; i < env.length - 1; i++) {
    if (env[i] > mean + sd && env[i] >= env[i - 1] && env[i] >= env[i + 1] && i - last > fps * 0.08) { onsets++; last = i }
  }
  const analyzedSeconds = maxLen / sr

  // 调式：Krumhansl-Schmuckler 调性轮廓相关
  let best = { r: -1, key: 0, minor: false }
  for (let k = 0; k < 12; k++) {
    const rot = chroma.map((_, i) => chroma[(i + k) % 12])
    const rM = pearson(rot, MAJOR), rm = pearson(rot, MINOR)
    if (rM > best.r) best = { r: rM, key: k, minor: false }
    if (rm > best.r) best = { r: rm, key: k, minor: true }
  }
  const total = chroma.reduce((s, v) => s + v, 0) || 1
  const penta = [0, 2, 4, 7, 9].reduce((s, i) => s + chroma[(best.key + (best.minor ? 3 : 0) + i) % 12], 0) / total
  const natural = frames ? (noisy / frames) * 100 : 0
  let mode: MusicResult['mode'] = best.minor ? '小调' : '大调'
  if (best.r < 0.45 || natural > 65) mode = '环境音'
  else if (penta > 0.78) mode = '五声音阶'

  const loud = rmsArr.filter((v) => v > 1e-4)
  const loudness = loud.length ? 20 * Math.log10(Math.sqrt(loud.reduce((s, v) => s + v * v, 0) / loud.length)) : -60

  // 波形缩略
  const bars = 120
  const waveform = Array.from({ length: bars }, (_, b) => {
    const s = Math.floor((b / bars) * rmsArr.length), e = Math.floor(((b + 1) / bars) * rmsArr.length)
    let m = 0
    for (let i = s; i < e; i++) m = Math.max(m, rmsArr[i])
    return m
  })
  const wmax = Math.max(...waveform) || 1

  return {
    name: file.name,
    url: URL.createObjectURL(file),
    origin,
    duration: audio.duration,
    analyzedSeconds,
    bpm,
    beatStrength,
    key: `${NOTE[best.key]}${best.minor ? 'm' : ''}`,
    mode,
    keyClarity: Math.max(0, best.r),
    loudness,
    centroid: centroidW ? centroidSum / centroidW : 0,
    density: onsets / analyzedSeconds,
    tension: Math.round(Math.min(100, Math.max(0, (1 - Math.max(0, best.r)) * 80 + (best.minor ? 15 : 0)))),
    natural: Math.round(natural),
    waveform: waveform.map((v) => v / wmax),
  }
}
