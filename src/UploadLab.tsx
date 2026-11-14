import { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeAudio, type MusicResult } from './analyze/audio'
import { analyzeImage, analyzeVideo, type SemanticTag, type VisualResult } from './analyze/visual'
import { fuse, fusionLabels, reportText, salesText, warmText, type FusionSource } from './analyze/fuse'
import { emotionProfiles, type Vec } from './emotion'
import { TargetSummary } from './EmotionTargets'

const fmt = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2)

/** 色温 → 近似 sRGB（Tanner Helland 拟合），用于光色预览 */
function cctToHex(k: number) {
  const t = k / 100
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
}

type Status = { state: 'idle' | 'busy' | 'error'; msg?: string; progress?: number }

export function UploadLab({ onOpen }: { onOpen: (id: string) => void }) {
  const [visual, setVisual] = useState<VisualResult | null>(null)
  const [music, setMusic] = useState<MusicResult | null>(null)
  const [tags, setTags] = useState<SemanticTag[]>([])
  const [vStatus, setVStatus] = useState<Status>({ state: 'idle' })
  const [mStatus, setMStatus] = useState<Status>({ state: 'idle' })
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => fuse(visual, music, tags), [visual, music, tags])

  const onVisual = async (file: File) => {
    const isVideo = file.type.startsWith('video/')
    if (!isVideo && !file.type.startsWith('image/')) {
      setVStatus({ state: 'error', msg: '请上传图片或视频文件' })
      return
    }
    setVStatus({ state: 'busy', msg: isVideo ? '正在抽帧分析视频…' : '正在分析画面…', progress: 0 })
    try {
      const r = isVideo
        ? await analyzeVideo(file, (p) => setVStatus({ state: 'busy', msg: '正在抽帧分析视频…', progress: p }))
        : await analyzeImage(file)
      setVisual(r)
      setTags(r.tags)
      setVStatus({ state: 'idle' })
      // 视频原声：无独立音乐时自动分析
      if (isVideo && (!music || music.origin === 'video')) {
        setMStatus({ state: 'busy', msg: '正在分析视频原声…' })
        analyzeAudio(file, 'video')
          .then((m) => { setMusic(m); setMStatus({ state: 'idle' }) })
          .catch(() => setMStatus({ state: 'idle' }))
      }
    } catch (e) {
      setVStatus({ state: 'error', msg: e instanceof Error ? e.message : '分析失败' })
    }
  }

  const onMusic = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      setMStatus({ state: 'error', msg: '请上传音频文件' })
      return
    }
    setMStatus({ state: 'busy', msg: '正在解码并提取音乐特征…' })
    try {
      setMusic(await analyzeAudio(file, 'file'))
      setMStatus({ state: 'idle' })
    } catch {
      setMStatus({ state: 'error', msg: '无法解码该音频格式，请尝试 MP3 / WAV / M4A' })
    }
  }

  const toggleTag = (id: string) =>
    setTags((ts) => ts.map((t) => (t.id === id ? { ...t, selected: !t.selected, auto: t.selected ? t.auto : false } : t)))

  const report = result ? reportText(result, visual, music) : ''
  const copy = async () => {
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }))
    a.download = '情绪光环境验证报告.txt'
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <DropZone
          title="画面 / 视频"
          hint="JPG · PNG · WEBP · MP4 · WEBM · MOV"
          accept="image/*,video/*"
          status={vStatus}
          onFile={onVisual}
          onClear={visual ? () => { setVisual(null); setTags([]); if (music?.origin === 'video') setMusic(null) } : undefined}
        >
          {visual &&
            (visual.kind === 'image' ? (
              <img src={visual.url} alt={visual.name} className="h-full w-full object-cover" />
            ) : (
              <video src={visual.url} className="h-full w-full object-cover" controls muted loop playsInline />
            ))}
        </DropZone>
        <DropZone
          title="音乐"
          hint="MP3 · WAV · M4A · OGG · 上传视频时自动分析原声"
          accept="audio/*"
          status={mStatus}
          onFile={onMusic}
          onClear={music ? () => setMusic(null) : undefined}
        >
          {music && <MusicPreview music={music} />}
        </DropZone>
      </div>

      {result ? (
        <div className="mt-6 space-y-6" style={{ animation: 'rise 0.4s ease' }}>
          {/* Headline */}
          <div className="grid grid-cols-1 gap-6 rounded-3xl border border-hairline bg-panel p-6 md:p-8 lg:grid-cols-[340px_1fr]">
            <ResultMap vectors={result.vectors} combined={result.combined} accent={visual?.color.dominant ?? '#ffffff'} />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">情绪分析结果 · EMOTION OUTPUT</span>
              <div className="mt-3">
                <TargetSummary v={result.combined} size="lg" />
              </div>
              <p className="mt-2 text-sm text-mist">坐标象限：{result.quadrant}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Big label="愉悦 P" value={fmt(result.combined.p)} />
                <Big label="唤醒 A" value={fmt(result.combined.a)} />
                <Big label="控制 D" value={fmt(result.combined.d)} />
                <Big label="多源一致性" value={`${Math.round(result.confidence * 100)}%`} />
              </div>
              <SourceTable result={result} className="mt-6" />
              {result.coherence != null && (
                <p className="mt-4 text-sm text-mist">
                  音乐 × 画面一致性评分 <span className="font-mono text-white">{result.coherence}</span> / 100
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {visual && (
              <Panel title="画面语义元素" note="点击标签人工确认 / 取消">
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        t.selected ? 'border-white bg-white text-ink' : 'border-hairline text-mist hover:border-white/40 hover:text-white'
                      }`}
                    >
                      {t.label}
                      {t.auto && t.confidence > 0 && (
                        <span className={`ml-1.5 font-mono text-[10px] ${t.selected ? 'text-ink/60' : 'text-faint'}`}>
                          {Math.round(t.confidence * 100)}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-faint">
                  百分比为本地色彩/空间分布识别的置信度；未带百分比的标签可人工补充（如秩序感、孤独感、商业感等抽象语义）。
                </p>
              </Panel>
            )}

            {visual && (
              <Panel title="色彩参数" note={visual.kind === 'video' ? `视频 · ${visual.duration?.toFixed(1)} s · 12 帧采样` : '画面'}>
                <div className="mb-5 flex h-8 overflow-hidden rounded-lg border border-hairline">
                  {visual.palette.map((c) => (
                    <div key={c.hex} style={{ background: c.hex, flex: c.share }} title={`${c.hex} · ${Math.round(c.share * 100)}%`} />
                  ))}
                </div>
                <Params
                  items={[
                    ['主色', visual.color.dominant.toUpperCase(), visual.color.dominant],
                    ['RGB', visual.color.rgb.join(', ')],
                    ['Lab', visual.color.lab.join(', ')],
                    ['HSV', `${visual.color.hsv[0]}°, ${visual.color.hsv[1]}%, ${visual.color.hsv[2]}%`],
                    ['平均亮度', `${Math.round(visual.color.brightness)}%`],
                    ['饱和度均值', `${Math.round(visual.color.saturation)}%`],
                    ['明暗对比', `${Math.round(visual.color.contrast)}`],
                    ['冷暖倾向', warmText(visual.color.warmth)],
                    ['色彩复杂度', `${Math.round(visual.color.complexity)}`],
                    ['CIE xy', `${visual.color.x.toFixed(4)}, ${visual.color.y.toFixed(4)}`],
                    ['画面色温', `${visual.color.cct} K`],
                    ...(visual.kind === 'video' ? ([['运动强度', `${Math.round(visual.motion ?? 0)} / 100`]] as [string, string][]) : []),
                  ]}
                />
                {visual.keyframes && (
                  <div className="mt-5">
                    <span className="text-[10px] text-faint">色彩时间轴</span>
                    <div className="mt-1.5 flex h-6 overflow-hidden rounded-md">
                      {visual.keyframes.map((k) => (
                        <div key={k.t} className="flex-1" style={{ background: k.hex }} title={`${k.t.toFixed(1)}s · ${k.hex}`} />
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            )}

            <Panel
              title={music ? '音乐参数' : '推荐音乐方案'}
              note={music ? (music.origin === 'video' ? '来源：视频原声' : `分析 ${Math.round(music.analyzedSeconds)} s`) : '未上传音乐 · 按情绪坐标推荐'}
            >
              {music ? (
                <Params
                  items={[
                    ['BPM', music.bpm ? `${music.bpm}` : '无明显节拍'],
                    ['节拍清晰度', `${Math.round(music.beatStrength * 100)}%`],
                    ['调式', `${music.key} · ${music.mode}`],
                    ['响度', `${music.loudness.toFixed(1)} dBFS`],
                    ['频谱重心', `${Math.round(music.centroid)} Hz`],
                    ['节奏密度', `${music.density.toFixed(2)} 次/秒`],
                    ['和声紧张度', `${music.tension} / 100`],
                    ['自然声占比', `${music.natural}%（估算）`],
                    ['建议播放音量', result.musicPlan.volume],
                  ]}
                />
              ) : (
                <Params
                  items={[
                    ['BPM', result.musicPlan.bpm],
                    ['调式', result.musicPlan.mode],
                    ['音量', result.musicPlan.volume],
                    ['节奏', result.musicPlan.density],
                    ['自然声占比', result.musicPlan.natural],
                  ]}
                />
              )}
            </Panel>

            <Panel title="空间光环境方案" note="输出给灯具控制">
              <div className="mb-5 flex items-center gap-4">
                <span
                  className="h-14 w-14 shrink-0 rounded-full border border-white/20"
                  style={{ background: cctToHex(result.light.cct), boxShadow: `0 0 40px ${cctToHex(result.light.cct)}66` }}
                />
                {result.light.keyColors.length > 0 && (
                  <div>
                    <span className="text-[10px] text-faint">动态主光色</span>
                    <div className="mt-1 flex gap-1.5">
                      {result.light.keyColors.map((c) => (
                        <span key={c} className="h-6 w-6 rounded-full border border-white/20" style={{ background: c }} title={c} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Params
                items={[
                  ['CCT', `${result.light.cct} K`],
                  ['水平照度', `${result.light.horizontalLux} lx`],
                  ['墙面照度', `${result.light.wallLux} lx`],
                  ['显色', result.light.ra],
                  ['主光色 CIE xy', `${result.light.x.toFixed(3)}, ${result.light.y.toFixed(3)}`],
                  ['目标 MR', `${result.light.mr}`],
                  ['亮度动态', `±${result.light.dynamicAmp}%`],
                  ['动态周期', result.light.dynamicPeriod],
                  ['PWM', result.light.pwm],
                ]}
              />
            </Panel>

            <Panel title="心理假设 · 验证指标">
              <ul className="space-y-2">
                {result.hypotheses.map((h) => (
                  <li key={h} className="flex gap-2 text-[15px] text-white/90">
                    <span className="text-faint">—</span>
                    {h}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                {result.indicators.map((i) => (
                  <span key={i} className="rounded-lg border border-hairline bg-white/[0.03] px-3 py-1.5 text-xs text-mist">
                    {i}
                  </span>
                ))}
              </div>
            </Panel>

            <Panel title="匹配库内意境" note="按 PAD 坐标距离">
              <div className="space-y-2">
                {result.matches.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => onOpen(m.id)}
                    className="flex w-full items-center gap-4 rounded-xl border border-hairline px-4 py-3 text-left transition-colors hover:border-white/40"
                  >
                    <span className="font-mono text-xs text-faint">0{i + 1}</span>
                    <span className="h-6 w-6 rounded-full" style={{ background: m.dominant }} />
                    <span className="font-serif text-lg font-bold">{m.name}</span>
                    <span className="ml-auto font-mono text-xs text-faint">Δ {m.distance.toFixed(2)}</span>
                    <span className="text-faint">→</span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>

          <div className="rounded-3xl border border-hairline bg-panel p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">销售表达 · 证据等级 L1</span>
              <div className="flex gap-2">
                <button onClick={copy} className="rounded-full border border-hairline px-4 py-2 text-sm text-mist hover:text-white">
                  {copied ? '已复制' : '复制报告'}
                </button>
                <button onClick={download} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink hover:opacity-85">
                  下载报告 TXT
                </button>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-loose text-white/90">{salesText(result)}</p>
            {result.review.length > 0 && (
              <div className="mt-4 space-y-1">
                {result.review.map((r) => (
                  <p key={r} className="text-xs text-amber-200/80">· {r}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-hairline px-6 py-8 text-center text-sm text-faint">
          上传任意画面、视频或音乐，即可生成 PAD 情绪坐标、光环境方案与验证报告；三者同时上传时融合结果最完整。
        </p>
      )}
    </div>
  )
}

function DropZone({
  title,
  hint,
  accept,
  status,
  onFile,
  onClear,
  children,
}: {
  title: string
  hint: string
  accept: string
  status: Status
  onFile: (f: File) => void
  onClear?: () => void
  children?: React.ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const has = !!children
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
      className={`relative overflow-hidden rounded-3xl border transition-colors ${over ? 'border-white/60 bg-white/[0.04]' : 'border-hairline bg-panel'}`}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <div>
          <h3 className="font-serif text-xl font-bold">{title}</h3>
          <span className="font-mono text-[10px] tracking-[0.1em] text-faint">{hint}</span>
        </div>
        <div className="flex gap-2">
          {onClear && (
            <button onClick={onClear} className="rounded-full border border-hairline px-3 py-1.5 text-xs text-mist hover:text-white">
              移除
            </button>
          )}
          {has && (
            <button onClick={() => input.current?.click()} className="rounded-full border border-hairline px-3 py-1.5 text-xs text-mist hover:text-white">
              替换
            </button>
          )}
        </div>
      </div>
      <div className="m-5 h-52 overflow-hidden rounded-2xl">
        {has ? (
          children
        ) : (
          <button
            onClick={() => input.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-mist transition-colors hover:border-white/40 hover:text-white"
          >
            <span className="text-3xl font-light">+</span>
            <span className="text-sm">拖拽文件到这里，或点击选择</span>
          </button>
        )}
      </div>
      {status.state !== 'idle' && (
        <div className="absolute inset-x-5 bottom-5 rounded-xl bg-ink/85 px-4 py-3 backdrop-blur">
          <p className={`text-sm ${status.state === 'error' ? 'text-red-300' : 'text-white/90'}`}>{status.msg}</p>
          {status.state === 'busy' && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-white ${status.progress == null ? 'w-1/3 animate-pulse' : 'transition-[width]'}`}
                style={status.progress != null ? { width: `${Math.max(8, status.progress * 100)}%` } : undefined}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MusicPreview({ music }: { music: MusicResult }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl bg-ink-soft p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm text-white/90">{music.name}</span>
        <span className="shrink-0 font-mono text-[11px] text-faint">
          {Math.floor(music.duration / 60)}:{String(Math.round(music.duration % 60)).padStart(2, '0')}
        </span>
      </div>
      <div className="flex h-20 items-center gap-[2px]">
        {music.waveform.map((v, i) => (
          <span key={i} className="flex-1 rounded-full bg-white/60" style={{ height: `${Math.max(4, v * 100)}%` }} />
        ))}
      </div>
      <audio src={music.url} controls className="h-9 w-full" />
    </div>
  )
}

function ResultMap({ vectors, combined, accent }: { vectors: Partial<Record<FusionSource, Vec>>; combined: Vec; accent: string }) {
  const S = 340, m = 28
  const x = (v: number) => m + ((v + 1) / 2) * (S - m * 2)
  const y = (v: number) => S - m - ((v + 1) / 2) * (S - m * 2)
  const [pulse, setPulse] = useState(0)
  useEffect(() => setPulse((p) => p + 1), [combined.p, combined.a])
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-2xl border border-hairline bg-ink-soft">
      <line x1={x(0)} x2={x(0)} y1={m} y2={S - m} stroke="white" strokeOpacity="0.25" />
      <line y1={y(0)} y2={y(0)} x1={m} x2={S - m} stroke="white" strokeOpacity="0.25" />
      {[
        ['愉悦·激活', S - m - 4, m + 12, 'end'],
        ['愉悦·舒缓', S - m - 4, S - m - 6, 'end'],
        ['不悦·激活', m + 4, m + 12, 'start'],
        ['不悦·低唤醒', m + 4, S - m - 6, 'start'],
      ].map(([t, qx, qy, an]) => (
        <text key={t as string} x={qx as number} y={qy as number} fill="white" fillOpacity="0.3" fontSize="10" textAnchor={an as 'end' | 'start'}>
          {t}
        </text>
      ))}
      {emotionProfiles.map((o) => (
        <circle key={o.id} cx={x(o.combined.p)} cy={y(o.combined.a)} r="3" fill={o.colorParams.dominant} fillOpacity="0.35" />
      ))}
      {(Object.keys(vectors) as FusionSource[]).map((k) => {
        const v = vectors[k]!
        return (
          <g key={k}>
            <line x1={x(v.p)} y1={y(v.a)} x2={x(combined.p)} y2={y(combined.a)} stroke="white" strokeOpacity="0.4" strokeDasharray="3 3" />
            <circle cx={x(v.p)} cy={y(v.a)} r="4.5" fill="none" stroke="white" strokeOpacity="0.8" strokeWidth="1.5" />
            <text x={x(v.p) + 7} y={y(v.a) + 4} fill="white" fillOpacity="0.65" fontSize="10">{fusionLabels[k]}</text>
          </g>
        )
      })}
      <circle key={pulse} cx={x(combined.p)} cy={y(combined.a)} r="10" fill={accent} stroke="white" strokeWidth="2.5">
        <animate attributeName="r" from="16" to="10" dur="0.5s" fill="freeze" />
      </circle>
      <text x={S - m} y={y(0) - 6} fill="white" fillOpacity="0.5" fontSize="10" textAnchor="end">愉悦 P →</text>
      <text x={x(0) + 6} y={m - 8} fill="white" fillOpacity="0.5" fontSize="10">↑ 唤醒 A</text>
    </svg>
  )
}

function SourceTable({ result, className = '' }: { result: NonNullable<ReturnType<typeof fuse>>; className?: string }) {
  const keys = Object.keys(result.vectors) as FusionSource[]
  return (
    <div className={`grid grid-cols-[88px_48px_repeat(3,1fr)] gap-x-3 gap-y-2 text-xs ${className}`}>
      <span />
      <span className="font-mono text-[10px] text-faint">权重</span>
      {['P', 'A', 'D'].map((d) => (
        <span key={d} className="font-mono text-[10px] text-faint">{d}</span>
      ))}
      {keys.map((k) => (
        <SourceRow key={k} label={fusionLabels[k]} w={result.weights[k]!} v={result.vectors[k]!} />
      ))}
    </div>
  )
}

function SourceRow({ label, w, v }: { label: string; w: number; v: Vec }) {
  return (
    <>
      <span className="text-mist">{label}</span>
      <span className="font-mono text-faint">{Math.round(w * 100)}%</span>
      {(['p', 'a', 'd'] as const).map((k) => (
        <span key={k} className="flex flex-col gap-1">
          <span className="font-mono text-white/80">{fmt(v[k])}</span>
          <span className="relative h-1 rounded-full bg-white/10">
            <span
              className="absolute top-0 h-full rounded-full bg-white/70"
              style={{ left: v[k] >= 0 ? '50%' : `${50 + v[k] * 50}%`, width: `${Math.abs(v[k]) * 50}%` }}
            />
          </span>
        </span>
      ))}
    </>
  )
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-ink-soft p-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-faint">{label}</span>
      <p className="mt-1 font-mono text-2xl">{value}</p>
    </div>
  )
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-hairline bg-panel p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h4 className="font-serif text-lg font-bold">{title}</h4>
        {note && <span className="font-mono text-[10px] text-faint">{note}</span>}
      </div>
      {children}
    </div>
  )
}

function Params({ items }: { items: ([string, string] | [string, string, string])[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {items.map(([k, v, sw]) => (
        <div key={k}>
          <dt className="text-[10px] text-faint">{k}</dt>
          <dd className="flex items-center gap-1.5 font-mono text-sm text-white/90">
            {sw && <span className="h-3 w-3 rounded-full" style={{ background: sw }} />}
            {v}
          </dd>
        </div>
      ))}
    </dl>
  )
}
