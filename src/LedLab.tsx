import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { frameRGBA, makeClip, type LedClip } from "./analyze/ledbin"
import {
  BASE,
  loadDefaultMapping,
  snapshotFiles,
  useLedStore,
  validationMeta,
  validationOf,
  type LedEntry,
} from "./ledStore"
import { targetInfo } from "./emotion"
import { TargetGlossary, familyColor } from "./EmotionTargets"
import { GamutChart } from "./GamutChart"
import { DRIVE_GAMMA, GAMMA_RANGE, primaries } from "./lightSource"

const fmt = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2)

export function LedLab({ onOpen }: { onOpen: (id: string) => void }) {
  const {
    entries,
    mapping,
    status,
    importFiles: storeImport,
    pending,
    gamma,
  } = useLedStore()
  const [selected, setSelected] = useState<string>(entries[0].id)
  const [fpsDefault, setFpsDefault] = useState(25)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState<{
    kind: "ok" | "error"
    text: string
  } | null>(null)

  const entry = entries.find((e) => e.id === selected) ?? entries[0]

  const importFiles = async (files: File[]) => {
    setNotice(null)
    const r = await storeImport(files, { fpsDefault })
    setNotice({ kind: r.ok ? "ok" : "error", text: r.text })
    if (r.added.length) {
      const last = r.added[r.added.length - 1]
      setSelected(last.id)
      onOpen(last.design?.id ?? last.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Spec + import */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          ["灯珠", `${entry.count} 颗 · ${entry.width}×${entry.height}`],
          ["走线", mapping ? mapping.name : "dian.json · 列向蛇形"],
          ["光源", `RGB 三色混色 · 驱动 γ${gamma.toFixed(2)}`],
          ["通道", "B-R-G-W · 4 字节/灯珠"],
          [
            "素材",
            `${entries.length} 段${
              pending.length ? ` · ${pending.length} 段分析中` : ""
            }`,
          ],
        ].map(([k, v]) => (
          <span
            key={k}
            className="rounded-xl border border-hairline bg-panel px-3.5 py-2 text-sm"
          >
            <span className="mr-2 font-mono text-[10px] text-faint">{k}</span>
            {v}
          </span>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-xs text-mist">
            默认帧率
            <input
              type="number"
              min={1}
              max={120}
              value={fpsDefault}
              onChange={(e) =>
                setFpsDefault(Math.min(120, Math.max(1, Number(e.target.value) || 25)))
              }
              className="w-12 bg-transparent font-mono text-white outline-none"
            />
          </label>
          <FileButton label="导入 .bin / .json" primary onFiles={importFiles} />
        </div>
      </div>

      {/* 拖拽导入 */}
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "copy"
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node))
            setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const files = snapshotFiles(e.dataTransfer.files)
          if (files.length) importFiles(files)
        }}
        className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-dashed px-5 py-4 text-sm transition-colors ${
          dragging
            ? "border-white/70 bg-white/[0.06] text-white"
            : "border-white/15 text-mist"
        }`}
      >
        <span className="text-xl font-light">+</span>
        <span>
          将 <span className="font-mono text-white/90">.bin</span>{" "}
          灯光数据（可多选）与可选的
          <span className="font-mono text-white/90"> .json</span>{" "}
          走线一起拖到这里；未提供走线时使用 dian.json
        </span>
        <span className="ml-auto font-mono text-[11px] text-faint">
          文件名如 06雨夜_25.bin 可自动识别序号与帧率
        </span>
      </div>
      {(status || notice) && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-2.5 text-sm ${
            status
              ? "border-hairline text-white/90"
              : notice!.kind === "ok"
                ? "border-emerald-400/30 text-emerald-200"
                : "border-red-400/30 text-red-200"
          }`}
        >
          {status ?? notice!.text}
        </p>
      )}

      <CompareTable
        entries={entries}
        selected={selected}
        onSelect={(id) => setSelected(id)}
        onOpen={onOpen}
      />
      <LightSourceCard entries={entries} selected={selected} />
      <details className="rounded-3xl border border-hairline bg-panel px-6 py-4">
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.2em] text-mist hover:text-white">
          展开情绪目标标签释义与命中分布
        </summary>
        <div className="pt-2">
          <TargetGlossary
            title="实发情绪标签释义"
            hits={entries.reduce<Record<string, string[]>>(
              (m, e) => ((m[e.target] ??= []).push(e.name), m),
              {},
            )}
          />
        </div>
      </details>
    </div>
  )
}

function FileButton({
  label,
  primary,
  onFiles,
}: {
  label: string
  primary?: boolean
  onFiles: (f: File[]) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      {/* 不设置 accept：部分系统未登记 .bin 类型会导致文件在选择框中被置灰，改为按扩展名校验 */}
      <input
        ref={ref}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          // 先复制为数组：清空 value 会同步清空 FileList
          const files = Array.from(e.target.files ?? [])
          e.target.value = ""
          if (files.length) onFiles(files)
        }}
      />
      <button
        onClick={() => ref.current?.click()}
        className={`rounded-full px-4 py-1.5 text-sm transition-opacity ${
          primary
            ? "bg-white font-medium text-ink hover:opacity-85"
            : "border border-hairline text-mist hover:text-white"
        }`}
      >
        {label}
      </button>
    </>
  )
}

export function LedPlayer({
  entry,
  onTime,
  compact,
}: {
  entry: LedEntry
  onTime?: (t: number) => void
  compact?: boolean
}) {
  const { clips } = useLedStore()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [clip, setClip] = useState<LedClip | null>(clips.get(entry.id) ?? null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(true)
  const [t, setT] = useState(0)
  const tRef = useRef(0)
  const onTimeRef = useRef(onTime)
  onTimeRef.current = onTime
  const [retry, setRetry] = useState(0)
  const { id, src, fps, name } = entry

  useEffect(() => {
    tRef.current = 0
    setT(0)
    setPlaying(true)
    setError(null)
    const cached = clips.get(id)
    setClip(cached ?? null)
    if (cached) return
    if (!src) { setError("未找到 bin 文件，请重新导入"); return }
    let alive = true
    Promise.all([
      fetch(`${BASE}${src}`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.arrayBuffer()
      }),
      loadDefaultMapping(),
    ])
      .then(([buf, map]) => {
        if (!alive) return
        const c = makeClip(name, new Uint8Array(buf), map, fps)
        clips.set(id, c)
        setClip(c)
      })
      .catch((e) => alive && setError(`灯光数据加载失败：${e.message}`))
    return () => {
      alive = false
    }
  }, [id, src, fps, name, clips, retry])

  const draw = useCallback(
    (time: number) => {
      const cv = canvas.current
      if (!cv || !clip) return
      const ctx = cv.getContext("2d")!
      const f = Math.min(clip.frames - 1, Math.floor(time * clip.fps))
      const img = frameRGBA(clip, f)
      const off = document.createElement("canvas")
      off.width = clip.width
      off.height = clip.height
      off
        .getContext("2d")!
        .putImageData(
          new ImageData(
            img as unknown as Uint8ClampedArray<ArrayBuffer>,
            clip.width,
            clip.height,
          ),
          0,
          0,
        )
      const cell = cv.width / clip.width
      ctx.fillStyle = "#050507"
      ctx.fillRect(0, 0, cv.width, cv.height)
      // 漫射光晕层
      ctx.save()
      ctx.filter = `blur(${cell * 0.9}px)`
      ctx.globalAlpha = 0.55
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(off, 0, 0, cv.width, cv.height)
      ctx.restore()
      // 灯珠
      for (let y = 0; y < clip.height; y++) {
        for (let x = 0; x < clip.width; x++) {
          const p = (y * clip.width + x) * 4
          ctx.fillStyle = `rgb(${img[p]},${img[p + 1]},${img[p + 2]})`
          ctx.beginPath()
          ctx.arc(
            (x + 0.5) * cell,
            (y + 0.5) * cell,
            cell * 0.36,
            0,
            Math.PI * 2,
          )
          ctx.fill()
        }
      }
    },
    [clip],
  )

  useEffect(() => {
    if (!clip) return
    draw(tRef.current)
    if (!playing) return
    let raf = 0,
      last = performance.now(),
      lastUi = 0
    const loop = (now: number) => {
      tRef.current = (tRef.current + Math.min(now - last, 250) / 1000) % (clip.frames / clip.fps)
      last = now
      draw(tRef.current)
      if (now - lastUi > 200) {
        lastUi = now
        setT(tRef.current)
        onTimeRef.current?.(tRef.current)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [clip, playing, draw])

  const seek = (v: number) => {
    tRef.current = v
    setT(v)
    onTimeRef.current?.(v)
    draw(v)
  }
  const maxLum = Math.max(...entry.timeline.map((p) => p.luminance), 1)

  return (
    <div className="rounded-2xl border border-hairline bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        <div
          className="relative w-[130px] shrink-0 overflow-hidden rounded-xl bg-ink sm:w-[140px]"
          style={{ aspectRatio: `${entry.width} / ${entry.height}` }}
        >
          <canvas
            ref={canvas}
            width={entry.width * 20}
            height={entry.height * 20}
            className="h-full w-full"
          />
          {!clip && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-center text-xs text-faint">
              <span role="status">{error ?? "加载中…"}</span>
              {error && src && <button className="rounded border border-hairline px-2 py-1 text-white" onClick={() => setRetry((n) => n + 1)}>重试加载</button>}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            LED 矩阵回放
          </span>
          <h3 className="mt-1 truncate font-serif text-xl font-black md:text-2xl">
            {entry.name}
          </h3>
          <p className="mt-1 truncate font-mono text-[11px] text-faint">
            {entry.fileName ?? entry.name} · {entry.fps} fps · {entry.frames} 帧
            · {entry.duration}s
          </p>
          <div className="mt-auto space-y-2 pt-4">
            <div className="relative h-10 overflow-hidden rounded-md">
              <div className="absolute inset-0 flex">
                {entry.timeline.map((p) => (
                  <div
                    key={p.t}
                    className="flex-1"
                    style={{
                      background: p.hex,
                      opacity: 0.35 + (p.luminance / maxLum) * 0.65,
                    }}
                  />
                ))}
              </div>
              <svg
                viewBox={`0 0 ${entry.timeline.length} 40`}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                <polyline
                  points={entry.timeline
                    .map(
                      (p, i) =>
                        `${i + 0.5},${38 - (p.luminance / maxLum) * 34}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke="white"
                  strokeOpacity="0.85"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div
                className="absolute inset-y-0 w-0.5 bg-white"
                style={{ left: `${(t / entry.duration) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlaying(!playing)}
                disabled={!clip}
                className="h-8 w-8 shrink-0 rounded-full bg-white text-xs font-bold text-ink disabled:opacity-40"
                aria-label={playing ? "暂停" : "播放"}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <input
                aria-label="LED 回放进度"
                type="range"
                min={0}
                max={entry.duration}
                step={0.04}
                value={t}
                onChange={(e) => seek(Number(e.target.value))}
                className="flex-1 accent-white"
              />
              <span className="shrink-0 whitespace-nowrap text-right font-mono text-[11px] tabular-nums text-faint">
                {t.toFixed(1)} / {entry.duration}s
              </span>
            </div>
            <p className="text-[10px] text-faint">
              时间轴色带 = 每秒平均发光色 · 白线为原始 γ1.6 相对输出曲线
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompareTable({
  entries,
  selected,
  onSelect,
  onOpen,
}: {
  entries: LedEntry[]
  selected: string
  onSelect: (id: string) => void
  onOpen: (id: string) => void
}) {
  const rows = useMemo(
    () =>
      [...entries].sort((a, b) =>
        (a.index ?? "99").localeCompare(b.index ?? "99"),
      ),
    [entries],
  )
  const head = [
    "素材",
    "发光色",
    "CCT / Duv",
    "光通量 · Δxy",
    "输出 · 波动",
    "变化速率",
    "周期 · 突变",
    "P",
    "A",
    "D",
    "实发情绪 · 次要",
    "设计意图",
    "Δ · 验证",
    "",
  ]
  return (
    <div className="overflow-x-auto rounded-3xl border border-hairline bg-panel p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          全部灯光素材 · 情绪验证坐标对照
        </span>
        <span className="font-mono text-[11px] text-faint">
          点击任意行高亮色域 · 点击右侧“查看 / 反馈”进入完整体验
        </span>
      </div>
      <table className="mt-4 w-full min-w-[1180px] text-left text-sm">
        <thead className="text-[11px] text-faint">
          <tr>
            {head.map((h) => (
              <th key={h} className="pb-2 pr-3 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr
              key={e.id}
              onClick={() => onSelect(e.id)}
              className={`cursor-pointer border-t border-hairline transition-colors hover:bg-white/[0.03] ${
                e.id === selected ? "bg-white/[0.05]" : ""
              }`}
            >
              <td className="py-2.5 pr-3">
                <span className="mr-2 font-mono text-[11px] text-faint">
                  {e.index ?? "—"}
                </span>
                <span className="font-serif font-bold">{e.name}</span>
                {e.uploaded && (
                  <span className="ml-2 rounded-full border border-white/25 px-1.5 font-mono text-[9px] text-faint">
                    导入
                  </span>
                )}
              </td>
              <td className="pr-3">
                <span className="flex h-4 w-16 overflow-hidden rounded">
                  {e.palette.slice(0, 4).map((c) => (
                    <span
                      key={c.hex}
                      style={{ background: c.hex, flex: c.share }}
                    />
                  ))}
                </span>
              </td>
              <td className="pr-3 font-mono text-xs text-mist">
                {e.emission.cct}K · {e.emission.duv.toFixed(3)}
                <span
                  className={`ml-1.5 rounded px-1 text-[9px] ${
                    e.emission.source === "measured"
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-white/10 text-faint"
                  }`}
                >
                  {e.emission.source === "measured" ? "实测" : "模型"}
                </span>
              </td>
              <td className="pr-3 font-mono text-xs text-mist">
                {Math.round(e.emission.flux)}lm ·{" "}
                {e.emission.dxy != null ? e.emission.dxy.toFixed(3) : "—"}
              </td>
              <td className="pr-3 font-mono text-xs text-mist">
                {e.emission.luminance}% · ±{e.emission.fluctuation}%
              </td>
              <td className="pr-3 font-mono text-xs text-mist">
                {e.emission.changeRate}%/s
              </td>
              <td className="pr-3 font-mono text-xs text-mist">
                {e.emission.period ? `${e.emission.period}s` : "—"} ·{" "}
                {e.emission.events}
              </td>
              {(["p", "a", "d"] as const).map((k) => (
                <td key={k} className="pr-3 font-mono text-xs text-white/85">
                  {fmt(e.combined[k])}
                </td>
              ))}
              <td className="pr-3" title={targetInfo(e.target)?.desc}>
                <span
                  className="font-medium"
                  style={{
                    color: familyColor[targetInfo(e.target)?.family ?? "平衡"],
                  }}
                >
                  {e.target}
                </span>
                {e.manual && (
                  <span
                    className="ml-1.5 rounded bg-amber-300/15 px-1 text-[9px] text-amber-200"
                    title={`模型判定：${e.modelTarget}`}
                  >
                    人工
                  </span>
                )}
                {e.ranked && (
                  <span className="ml-1.5 text-[11px] text-faint">
                    {e.ranked
                      .slice(1)
                      .map((r) => r.name)
                      .join(" / ")}
                  </span>
                )}
              </td>
              <td className="pr-3 text-mist">
                {e.design ? e.design.target : "—"}
              </td>
              <td
                className="pr-3 font-mono text-xs"
                style={{ color: validationMeta[validationOf(e)].color }}
                title={validationMeta[validationOf(e)].hint}
              >
                {e.design ? `${e.design.delta.toFixed(2)} · ` : ""}
                {validationMeta[validationOf(e)].label}
              </td>
              <td className="text-right">
                <button
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onOpen(e.design?.id ?? e.id)
                  }}
                  className="rounded-full border border-hairline px-3 py-1 text-xs text-mist transition-colors hover:border-white/40 hover:text-white"
                >
                  查看 / 反馈 →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs leading-relaxed text-faint">
        实发坐标 = 画面语义（库内情绪词）+ 发光色彩（Valdez–Mehrabian）+
        光色参数（优先采用彩光实测 CCT / Ra / Duv，无实测时由 RGB
        三色混色模型推算）+
        动态参数（变化速率、亮度波动、突变事件、均匀度）融合；Δ
        为与库内设计意图坐标的 PAD 欧氏距离，&gt; 0.35 建议校准。证据等级 L1。
      </p>
    </div>
  )
}

/** 光源：RGB 三色混色 —— 单色实测参数 + 色域内各素材的实测 / 模型色度 */
function LightSourceCard({
  entries,
  selected,
}: {
  entries: LedEntry[]
  selected: string
}) {
  const { gamma } = useLedStore()
  const points = entries.flatMap((e) => {
    const pts: Parameters<typeof GamutChart>[0]["points"] = [
      {
        id: e.id,
        label: e.design?.name ?? e.name,
        x: e.emission.model.x,
        y: e.emission.model.y,
        color: e.emission.meanHex,
        kind: "model",
        pair: e.id,
        active: e.id === selected,
      },
    ]
    if (e.emission.measured)
      pts.push({
        id: e.id,
        label: e.design?.name ?? e.name,
        x: e.emission.measured.x,
        y: e.emission.measured.y,
        color: e.emission.meanHex,
        kind: "measured",
        pair: e.id,
        active: e.id === selected,
      })
    return pts
  })
  const withMeas = entries.filter((e) => e.emission.dxy != null)
  const meanDxy = withMeas.length
    ? withMeas.reduce((s, e) => s + e.emission.dxy!, 0) / withMeas.length
    : null
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 rounded-3xl border border-hairline bg-panel p-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="min-w-0">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          光源 · RGB 三色混色 · 单色实测
        </span>
        <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-[11px] text-faint">
            <tr>
              {["通道", "x, y", "光通量", "功率", "光效", "CCT", "Ra"].map(
                (h) => (
                  <th key={h} className="pb-2 pr-3 font-normal">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {primaries.map((p) => (
              <tr
                key={p.key}
                className="border-t border-hairline font-mono text-xs text-mist"
              >
                <td className="py-2.5 pr-3">
                  <span
                    className="inline-flex items-center gap-2 font-sans text-sm font-bold"
                    style={{ color: p.hex }}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: p.hex }}
                    />
                    {p.key}
                  </span>
                </td>
                <td className="pr-3">
                  {p.x}, {p.y}
                </td>
                <td className="pr-3">{p.flux} lm</td>
                <td className="pr-3">{p.power} W</td>
                <td className="pr-3">{p.efficacy}</td>
                <td className="pr-3">{p.cct} K</td>
                <td className="pr-3">{p.cri}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="mt-5 space-y-2 text-xs leading-relaxed text-faint">
          <p>
            混色模型：灯珠驱动值 d → 相对光强 (d/255)<sup>γ</sup>（当前 γ ={" "}
            {gamma.toFixed(2)}），整灯 XYZ = Σ 通道光强 × 单色满载 XYZ（Y
            即光通量）。满白合计{" "}
            {Math.round(primaries.reduce((s, p) => s + p.flux, 0))} lm /{" "}
            {Math.round(primaries.reduce((s, p) => s + p.power, 0))} W。
          </p>
          <p>
            {meanDxy != null
              ? `当前 γ 下 ${withMeas.length} 段有实测素材的平均 Δxy = ${meanDxy.toFixed(4)}；`
              : ""}
            有实测的场景，情绪坐标中的光色参数采用实测值。
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-hairline bg-ink-soft p-4">
        <GamutChart points={points} width={380} />
        <p className="mt-1 text-[10px] text-faint">
          ● 彩光实测 · ○ 混色模型推算 · 虚线连接同一素材 · 白线为黑体轨迹
        </p>
      </div>
      <GammaControl entries={entries} />
    </div>
  )
}

/** 驱动 γ 调节：滑杆 + 拟合误差曲线 + 各素材偏差 */
function GammaControl({ entries }: { entries: LedEntry[] }) {
  const { gamma, setGamma, gammaFit } = useLedStore()
  const { curve, best, bestMax, count } = gammaFit
  const W2 = 520,
    H2 = 170,
    P2 = 30
  const maxErr = Math.max(0.02, ...curve.map((c) => c.max))
  const gx = (g: number) =>
    P2 +
    ((g - GAMMA_RANGE.min) / (GAMMA_RANGE.max - GAMMA_RANGE.min)) *
      (W2 - P2 * 2)
  const gy = (e: number) => H2 - P2 - (e / maxErr) * (H2 - P2 * 1.6)
  const cur = curve.reduce(
    (a, b) => (Math.abs(b.gamma - gamma) < Math.abs(a.gamma - gamma) ? b : a),
    curve[0],
  )
  const measuredRows = entries.filter((e) => e.emission.dxy != null)
  const modelOnly = entries.filter((e) => e.emission.source === "model")

  return (
    <div className="border-t border-hairline pt-6 lg:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            驱动伽马 γ · 驱动值 → 光强
          </span>
          <p className="mt-1 font-mono text-2xl font-medium tabular-nums md:text-3xl">
            γ {gamma.toFixed(2)}
            {cur && (
              <span className="ml-3 text-sm text-mist">
                平均 Δxy {cur.mean.toFixed(4)} · 最大 {cur.max.toFixed(4)}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {best != null && (
            <button
              onClick={() => setGamma(best)}
              className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-ink transition-opacity hover:opacity-85"
            >
              最小平均误差 γ{best.toFixed(2)}
            </button>
          )}
          {bestMax != null && (
            <button
              onClick={() => setGamma(bestMax)}
              className="rounded-full border border-white/40 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
            >
              最小最大误差 γ{bestMax.toFixed(2)}
            </button>
          )}
          {[1, 2.2].map((g) => (
            <button
              key={g}
              onClick={() => setGamma(g)}
              className="rounded-full border border-hairline px-3 py-1.5 text-xs text-mist hover:text-white"
            >
              {g === 1 ? "线性 γ1.0" : "sRGB 近似 γ2.2"}
            </button>
          ))}
          <button
            onClick={() => setGamma(DRIVE_GAMMA)}
            className="rounded-full border border-hairline px-3 py-1.5 text-xs text-mist hover:text-white"
          >
            默认 γ{DRIVE_GAMMA}
          </button>
        </div>
      </div>

      <input
        type="range"
        min={GAMMA_RANGE.min}
        max={GAMMA_RANGE.max}
        step={GAMMA_RANGE.step}
        value={gamma}
        onChange={(e) => setGamma(Number(e.target.value))}
        className="mt-4 w-full accent-white"
        aria-label="驱动伽马"
      />
      <div className="flex justify-between font-mono text-[10px] text-faint">
        <span>{GAMMA_RANGE.min.toFixed(1)} 线性</span>
        <span>2.0</span>
        <span>{GAMMA_RANGE.max.toFixed(1)}</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-hairline bg-ink-soft p-3">
          <span className="px-1 font-mono text-[10px] text-faint">
            拟合误差曲线 · {count} 段有彩光实测的素材
          </span>
          {curve.length > 0 ? (
            <svg
              viewBox={`0 0 ${W2} ${H2}`}
              className="w-full cursor-pointer"
              onClick={(ev) => {
                const r =
                  (ev.currentTarget as SVGSVGElement).getBoundingClientRect()
                const g =
                  GAMMA_RANGE.min +
                  ((((ev.clientX - r.left) / r.width) * W2 - P2) /
                    (W2 - P2 * 2)) *
                    (GAMMA_RANGE.max - GAMMA_RANGE.min)
                setGamma(Math.round(g / GAMMA_RANGE.step) * GAMMA_RANGE.step)
              }}
            >
              {[0, 0.02, 0.04, 0.06, 0.08]
                .filter((v) => v <= maxErr)
                .map((v) => (
                  <g key={v}>
                    <line
                      x1={P2}
                      x2={W2 - P2}
                      y1={gy(v)}
                      y2={gy(v)}
                      stroke="white"
                      strokeOpacity="0.06"
                    />
                    <text
                      x={P2 - 4}
                      y={gy(v) + 3}
                      fontSize="9"
                      fill="white"
                      fillOpacity="0.4"
                      textAnchor="end"
                    >
                      {v}
                    </text>
                  </g>
                ))}
              {[1, 1.5, 2, 2.5, 3].map((g) => (
                <text
                  key={g}
                  x={gx(g)}
                  y={H2 - 10}
                  fontSize="9"
                  fill="white"
                  fillOpacity="0.4"
                  textAnchor="middle"
                >
                  γ{g}
                </text>
              ))}
              <polyline
                points={curve
                  .map((c) => `${gx(c.gamma)},${gy(c.max)}`)
                  .join(" ")}
                fill="none"
                stroke="white"
                strokeOpacity="0.35"
                strokeDasharray="3 3"
              />
              <polyline
                points={curve
                  .map((c) => `${gx(c.gamma)},${gy(c.mean)}`)
                  .join(" ")}
                fill="none"
                stroke="#6ee7b7"
                strokeWidth="2"
              />
              {best != null && (
                <g>
                  <circle
                    cx={gx(best)}
                    cy={gy(curve.find((c) => c.gamma === best)!.mean)}
                    r="4.5"
                    fill="#6ee7b7"
                  />
                  <text
                    x={gx(best)}
                    y={gy(curve.find((c) => c.gamma === best)!.mean) + 16}
                    fontSize="9.5"
                    fill="#6ee7b7"
                    textAnchor="middle"
                  >
                    均值最优 γ{best}
                  </text>
                </g>
              )}
              {bestMax != null && (
                <g>
                  <circle
                    cx={gx(bestMax)}
                    cy={gy(curve.find((c) => c.gamma === bestMax)!.max)}
                    r="4"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                  <text
                    x={gx(bestMax)}
                    y={gy(curve.find((c) => c.gamma === bestMax)!.max) - 8}
                    fontSize="9.5"
                    fill="white"
                    fillOpacity="0.75"
                    textAnchor="middle"
                  >
                    最差最优 γ{bestMax}
                  </text>
                </g>
              )}
              <line
                x1={gx(gamma)}
                x2={gx(gamma)}
                y1={P2 * 0.6}
                y2={H2 - P2}
                stroke="white"
                strokeWidth="1.5"
              />
              <text
                x={gx(gamma) + 4}
                y={P2 * 0.6 + 8}
                fontSize="9.5"
                fill="white"
              >
                当前
              </text>
              <text
                x={W2 - P2}
                y={14}
                fontSize="9"
                fill="white"
                fillOpacity="0.5"
                textAnchor="end"
              >
                — 平均 Δxy　┄ 最大 Δxy
              </text>
            </svg>
          ) : (
            <p className="p-4 text-sm text-faint">
              暂无带彩光实测的素材，无法拟合。
            </p>
          )}
        </div>

        <div>
          <span className="font-mono text-[10px] text-faint">
            各素材在当前 γ 下的模型偏差
          </span>
          <ul className="mt-2 space-y-1.5">
            {measuredRows.map((e) => (
              <li
                key={e.id}
                className="grid grid-cols-[72px_1fr_120px] items-center gap-3 text-xs"
              >
                <span className="truncate text-white/85">{e.name}</span>
                <span className="relative h-1.5 rounded-full bg-white/10">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${Math.min(100, (e.emission.dxy! / 0.06) * 100)}%`,
                      background:
                        e.emission.dxy! <= 0.01
                          ? "#6ee7b7"
                          : e.emission.dxy! <= 0.025
                            ? "#a7d9ff"
                            : "#fcd34d",
                    }}
                  />
                </span>
                <span className="text-right font-mono text-mist">
                  {e.emission.dxy!.toFixed(4)} ·{" "}
                  {e.emission.model.cct >= 25000
                    ? "≥25k"
                    : e.emission.model.cct}
                  K
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            误差曲线较平：均值最优与最差最优之间取默认 γ{DRIVE_GAMMA}{" "}
            作折中。亮场景通常更贴近较大 γ，暗场景更贴近线性——单一 γ
            无法完全吻合，可能源于测量时段或通道调光曲线差异。
            有实测的素材情绪坐标采用实测光色，不随 γ 改变；
            {modelOnly.length
              ? `${modelOnly.length} 段无实测素材的光色维度与情绪坐标会随 γ 实时重算。`
              : "新导入的无实测素材，其光色维度与情绪坐标会随 γ 实时重算。"}
          </p>
        </div>
      </div>
    </div>
  )
}
