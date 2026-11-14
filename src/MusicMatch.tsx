import { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeAudio, type MusicResult } from './analyze/audio'
import { checkMusic, recommendMusic, type MusicCheck, type MusicSpec } from './analyze/musicMatch'
import { familyColor } from './EmotionTargets'
import { targetInfo, type Vec } from './emotion'

// ── 生成式试听小样（Web Audio 实时合成）──
const SCALES: Record<MusicSpec['mode'], number[]> = {
  大调: [0, 2, 4, 5, 7, 9, 11],
  小调: [0, 2, 3, 5, 7, 8, 10],
  五声音阶: [0, 2, 4, 7, 9],
  环境音: [0, 7, 12, 14, 19],
}
const ROOT: Record<MusicSpec['mode'], number> = { 大调: 53, 小调: 45, 五声音阶: 50, 环境音: 48 }
const PROG: Record<MusicSpec['mode'], number[]> = { 大调: [0, 4, 5, 3], 小调: [0, 5, 2, 6], 五声音阶: [0, 3, 1, 4], 环境音: [0, 0, 1, 0] }
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
const PULSE = new Set(['活力', '欢庆', '警醒', '社交活跃', '清醒', '紧张'])

class Sketch {
  ctx = new AudioContext()
  master = this.ctx.createGain()
  filter = this.ctx.createBiquadFilter()
  timer = 0
  beat = 0
  next = 0
  spec: MusicSpec
  constructor(spec: MusicSpec) {
    this.spec = spec
    this.filter.type = 'lowpass'
    this.filter.frequency.value = (spec.centroid[0] + spec.centroid[1]) / 2
    this.filter.connect(this.master)
    this.master.connect(this.ctx.destination)
    this.master.gain.setValueAtTime(0, this.ctx.currentTime)
    this.master.gain.linearRampToValueAtTime(0.22, this.ctx.currentTime + 1.2)
    this.nature()
  }
  get bpm() {
    return (this.spec.bpm[0] + this.spec.bpm[1]) / 2
  }
  note(midi: number, t: number, dur: number, type: OscillatorType, gain: number, attack = 0.01) {
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.value = hz(midi)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.filter)
    o.start(t)
    o.stop(t + dur + 0.05)
  }
  kick(t: number) {
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.frequency.setValueAtTime(120, t)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18)
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + 0.3)
  }
  nature() {
    const amt = (this.spec.natural[0] + this.spec.natural[1]) / 200
    if (amt < 0.08) return
    const len = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02 // 褐噪声：近似风 / 水声
      d[i] = last * 3.5
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const lp = this.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const g = this.ctx.createGain()
    g.gain.value = amt * 0.5
    src.connect(lp).connect(g).connect(this.master)
    src.start()
  }
  schedule() {
    const spb = 60 / this.bpm
    const scale = SCALES[this.spec.mode]
    const root = ROOT[this.spec.mode]
    const deg = (i: number) => root + scale[((i % scale.length) + scale.length) % scale.length] + 12 * Math.floor(i / scale.length)
    const perBeat = { 低: 0.25, 中: 1, 中高: 2, 高: 4 }[this.spec.density]
    while (this.next < this.ctx.currentTime + 0.25) {
      const t = this.next
      const bar = Math.floor(this.beat / 4)
      const chord = PROG[this.spec.mode][bar % 4]
      if (this.beat % 4 === 0) {
        // 和弦 Pad：每小节一组三和弦，慢起音
        ;[0, 2, 4].forEach((k, i) => this.note(deg(chord + k), t, spb * 4.2, 'triangle', 0.09 - i * 0.015, spb * 1.2))
        this.note(deg(chord) - 12, t, spb * 4, 'sine', 0.12, 0.3)
      }
      // 琶音：按节奏密度
      const steps = Math.max(1, Math.round(perBeat))
      if (perBeat >= 1 || this.beat % 4 === 0) {
        for (let s = 0; s < steps; s++) {
          const idx = chord + [0, 2, 4, 7][(this.beat * steps + s) % 4]
          this.note(deg(idx) + 12, t + (s * spb) / steps, spb * 1.4, 'sine', 0.06, 0.005)
        }
      }
      if (PULSE.has(this.spec.target)) this.kick(t)
      this.beat++
      this.next += spb
    }
  }
  start() {
    this.next = this.ctx.currentTime + 0.1
    this.schedule()
    this.timer = window.setInterval(() => this.schedule(), 60)
  }
  stop() {
    clearInterval(this.timer)
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setValueAtTime(this.master.gain.value, t)
    this.master.gain.linearRampToValueAtTime(0, t + 0.4)
    setTimeout(() => this.ctx.close(), 600)
  }
}

// 上传音乐的检验结果按素材缓存（本次会话）
const uploads = new Map<string, MusicResult>()

export function MusicMatch({
  storeKey,
  v,
  target,
  manual,
  keywords,
  led,
  basisNote,
}: {
  storeKey: string
  v: Vec
  target: string
  manual?: boolean
  keywords?: string[]
  led?: { period: number | null; events: number; eventsPerMin: number; changeRate: number; duration: number }
  /** 覆盖依据说明，例如“设计意图（尚无灯光数据）” */
  basisNote?: string
}) {
  // 以值为依赖：父组件高频重渲染（如 LED 回放计时）不会重启试听小样
  const depKey = JSON.stringify([v.p, v.a, v.d, target, !!manual, keywords ?? [], led ?? null])
  const spec = useMemo(
    () => recommendMusic(v, target, { manual, keywords, ...led }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [depKey],
  )
  const sketch = useRef<Sketch | null>(null)
  const [playing, setPlaying] = useState(false)
  const [music, setMusic] = useState<MusicResult | null>(uploads.get(storeKey) ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const check: MusicCheck | null = music ? checkMusic(music, spec) : null
  const info = targetInfo(target)

  // 规格变化（如人工改标签）时重启小样；卸载时停止
  useEffect(() => {
    if (!playing) return
    sketch.current?.stop()
    const s = new Sketch(spec)
    s.start()
    sketch.current = s
    return () => {
      s.stop()
      sketch.current = null
    }
  }, [playing, spec])

  const onFile = async (f: File) => {
    setBusy(true)
    setError(null)
    try {
      const r = await analyzeAudio(f)
      uploads.set(storeKey, r)
      setMusic(r)
    } catch {
      setError('无法解码该音频，请尝试 MP3 / WAV / M4A')
    } finally {
      setBusy(false)
    }
  }

  const rows: [string, string][] = [
    ['BPM', `${spec.bpm[0]}–${spec.bpm[1]}`],
    ['调式 · 调性', `${spec.mode} · ${spec.key}`],
    ['播放音量', `${spec.volume[0]}–${spec.volume[1]} dB`],
    ['节奏密度', `${spec.density}（${spec.densityRate[0]}–${spec.densityRate[1]}/s）`],
    ['和声紧张度', `${spec.tension[0]}–${spec.tension[1]}`],
    ['频谱重心', `${spec.centroid[0]}–${spec.centroid[1]} Hz`],
    ['自然声占比', `${spec.natural[0]}%–${spec.natural[1]}%`],
  ]

  return (
    <section className="rounded-2xl border border-hairline bg-panel p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">MUSIC MATCH · 匹配音乐</span>
          <h3 className="mt-1 font-serif text-xl font-bold">
            匹配音乐 ·{' '}
            <span style={{ color: info ? familyColor[info.family] : undefined }}>{target}</span>
          </h3>
          <p className="mt-1 text-xs text-faint">依据：{basisNote ?? spec.basisLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-opacity ${playing ? 'border border-white text-white' : 'bg-white text-ink hover:opacity-85'}`}
          >
            {playing ? '■ 停止小样' : '▶ 试听生成小样'}
          </button>
          <input
            ref={input}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) onFile(f)
            }}
          />
          <button
            onClick={() => input.current?.click()}
            disabled={busy}
            className="rounded-full border border-hairline px-4 py-2 text-sm text-mist hover:text-white disabled:opacity-50"
          >
            {busy ? '分析中…' : music ? '更换音乐检验' : '上传音乐检验匹配'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
            {rows.map(([k, val]) => (
              <div key={k} className="min-w-0">
                <dt className="truncate text-[10px] text-faint">{k}</dt>
                <dd className="break-words font-mono text-xs tabular-nums text-white/90">{val}</dd>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['音色 / 乐器', spec.timbre],
              ['风格', spec.genre],
              ['自然声素材', spec.natureSound],
            ].map(([k, val]) => (
              <div key={k} className="min-w-0 rounded-xl border border-hairline bg-ink-soft px-3 py-2">
                <span className="text-[10px] text-faint">{k}</span>
                <p className="mt-0.5 break-words text-xs text-white/90">{val}</p>
              </div>
            ))}
          </div>
          <div>
            <span className="text-[10px] text-faint">灯光 × 音乐同步</span>
            <ul className="mt-1.5 space-y-1">
              {spec.sync.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-mist">
                  <span className="text-faint">—</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          {playing && (
            <p className="text-[11px] text-faint">
              小样为按上述规格实时合成的示意（{spec.mode} · {Math.round((spec.bpm[0] + spec.bpm[1]) / 2)} BPM · 节奏{spec.density}），用于对齐情绪方向，非成品音乐。
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-hairline bg-ink-soft p-4">
          {check && music ? (
            <div>
              <div className="flex items-center gap-4">
                <ScoreRing value={check.score} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-white/90">{music.name}</p>
                  <p className="mt-0.5 text-sm" style={{ color: check.score >= 75 ? '#6ee7b7' : check.score >= 55 ? '#a7d9ff' : '#fcd34d' }}>
                    {check.verdict}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-faint">情绪坐标一致性 {check.emotion} · 参数达标 {check.items.filter((i) => i.ok).length}/{check.items.length}</p>
                </div>
              </div>
              <audio src={music.url} controls className="mt-3 h-9 w-full" />
              <table className="mt-3 w-full text-left text-xs">
                <thead className="text-[10px] text-faint">
                  <tr>
                    <th className="pb-1.5 font-normal">参数</th>
                    <th className="pb-1.5 font-normal">实测</th>
                    <th className="pb-1.5 font-normal">建议</th>
                    <th className="pb-1.5 font-normal" />
                  </tr>
                </thead>
                <tbody>
                  {check.items.map((i) => (
                    <tr key={i.label} className="border-t border-hairline">
                      <td className="py-1.5 text-mist">{i.label}</td>
                      <td className="py-1.5 font-mono text-white/85">{i.value}</td>
                      <td className="py-1.5 font-mono text-faint">{i.expect}</td>
                      <td className={`py-1.5 text-right ${i.ok ? 'text-emerald-300' : 'text-amber-200'}`}>{i.ok ? '达标' : '偏离'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-mist">上传候选音乐，检验与该素材情绪的匹配度</p>
              <p className="text-xs text-faint">将分析 BPM、调式、节奏密度、紧张度、频谱重心与自然声占比，并给出 0–100 综合评分</p>
              {error && <p className="text-xs text-red-200">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ScoreRing({ value }: { value: number }) {
  const r = 26, c = 2 * Math.PI * r
  const color = value >= 75 ? '#6ee7b7' : value >= 55 ? '#a7d9ff' : '#fcd34d'
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="5" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="700" fill="white" className="font-mono">
        {value}
      </text>
    </svg>
  )
}
