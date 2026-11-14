// 画廊整合：卡片上的灯光实发状态条、弹窗中的灯光实发验证 / 预留位、未归档灯光素材卡片
import { useRef, useState } from "react"
import { targetInfo } from "./emotion"
import { scenes } from "./scenes"
import { familyColor, TargetSummary } from "./EmotionTargets"
import { LedPlayer } from "./LedLab"
import { LabelEditor } from "./LabelEditor"
import { MusicMatch } from "./MusicMatch"
import { profileById } from "./emotion"
import { useCatalog } from "./catalog"
import { useFeedback } from './feedback'
import {
  snapshotFiles,
  useLedStore,
  validationMeta,
  validationOf,
  type LedEntry,
} from "./ledStore"

export type LedStatus = keyof typeof validationMeta

export function useSceneLed(
  sceneId: string,
): { entry: LedEntry | null ;
status: LedStatus } {
  const { byScene, pending } = useLedStore()
  const entry = byScene[sceneId] ?? null
  if (entry) return { entry, status: validationOf(entry) }
  if (pending.some((p) => p.scene === sceneId))
    return { entry: null, status: "pending" }
  return { entry: null, status: "missing" }
}

export function StatusPill({ status }: { status: LedStatus }) {
  const m = validationMeta[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px]"
      style={{ color: m.color }}
      title={m.hint}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "pending" ? "animate-pulse" : ""
        }`}
        style={{
          background: status === "missing" ? "transparent" : m.color,
          border: status === "missing" ? `1px dashed ${m.color}` : undefined,
        }}
      />
      {m.label}
    </span>
  )
}

/** 画廊卡片底部：灯光实发数据状态条 */
export function LedStrip({ sceneId }: { sceneId: string }) {
  const { entry, status } = useSceneLed(sceneId)
  return <LedStripView entry={entry} status={status} />
}

export function LedStripView({
  entry,
  status,
}: {
  entry: LedEntry | null
  status: LedStatus
}) {
  if (!entry)
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-white/12 px-2.5 py-2">
        <span className="font-mono text-[10px] tracking-[0.1em] text-faint">
          LED · 预留
        </span>
        <StatusPill status={status} />
      </div>
    )
  return (
    <div className="space-y-1.5 rounded-lg border border-hairline bg-white/[0.02] px-2.5 py-2">
      <div className="flex h-1.5 overflow-hidden rounded-full">
        {entry.timeline.map((p) => (
          <span key={p.t} className="flex-1" style={{ background: p.hex }} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-[10px] tabular-nums text-mist">
          {Math.round(entry.emission.flux)}lm · 亮度
          {Math.round(entry.emission.luminance)}% · {entry.emission.cct}K
          {entry.manual && (
            <span className="ml-1 rounded bg-amber-300/15 px-1 font-sans text-[9px] text-amber-200">
              人工
            </span>
          )}
        </span>
        <StatusPill status={status} />
      </div>
    </div>
  )
}

function ImportButton({
  sceneId,
  fps,
  label,
  onDone,
}: {
  sceneId: string | null
  fps: number
  label: string
  onDone: (r: { ok: boolean ;
text: string }) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const { importFiles, status } = useLedStore()
  return (
    <>
      <input
        ref={ref}
        type="file"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = snapshotFiles(e.target.files)
          e.target.value = ""
          if (files.length)
            onDone(await importFiles(files, { sceneId, fpsDefault: fps }))
        }}
      />
      <button
        onClick={() => ref.current?.click()}
        disabled={!!status}
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {status ? "解析中…" : label}
      </button>
    </>
  )
}

const fmt = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2)

/** 弹窗：灯光实发验证（已有数据）或预留位（待补充） */
export function LedValidation({
  sceneId,
  sceneName,
  index,
  fps,
  entryOverride,
  onClose,
  /** 未归档灯光素材直接传入 */
  /** 跳转到图谱前关闭弹窗 */
}: {
  sceneId: string | null
  sceneName: string
  index?: number
  fps: number
  entryOverride?: LedEntry
  onClose?: () => void
}) {
  const scene = useSceneLed(sceneId ?? "")
  const entry = entryOverride ?? scene.entry
  const { byId } = useCatalog()
  const { coordinates } = useFeedback()
  const catalogId = sceneId ?? entry?.linkedId ?? entry?.id ?? ''
  const edited = !!coordinates[catalogId]
  const model = byId[catalogId]?.model
  const vector = model?.v ?? entry?.combined
  const status: LedStatus = entry
    ? validationOf(entry)
    : sceneId
      ? scene.status
      : "missing"
  const [notice, setNotice] = useState<{ ok: boolean ;
text: string } | null>(
    null,
  )
  const colorLight = sceneId
    ? scenes.find((sc) => sc.id === sceneId)?.colorLight
    : undefined
  const idx = index ?? colorLight?.index
  const suggested = `${
    idx != null ? String(idx).padStart(2, "0") : "NN"
  }${sceneName}_${fps}.bin`

  return (
    <section className="overflow-hidden rounded-2xl border border-hairline bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 md:px-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
            LED EMISSION VALIDATION
          </span>
          <h3 className="font-serif text-xl font-bold">灯光实发验证</h3>
        </div>
        <StatusPill status={status} />
      </div>

      {entry ? (
        <div className="space-y-6 p-5 md:p-6">
          <LedPlayer key={entry.id} entry={entry} />
          <div className="space-y-5">
            <TargetSummary v={vector!} override={edited ? undefined : entry.manual} />
            <LabelEditor key={entry.id} entry={entry} />
            <p className="font-mono text-xs text-white/70">
              {edited ? '人工坐标' : '实发模型'} P {fmt(vector!.p)} · A {fmt(vector!.a)} · D{" "}
              {fmt(vector!.d)}
            </p>
            {entry.design ? (
              <div className="grid grid-cols-3 gap-2.5">
                <Cell label="设计意图" value={entry.design.target} />
                <Cell label={edited ? "人工模型情绪" : "实发情绪"} value={model?.target ?? entry.target} />
                <Cell
                  label="原始 PAD 偏差 Δ"
                  value={entry.design.delta.toFixed(2)}
                  color={validationMeta[status].color}
                />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-hairline px-4 py-3 text-sm text-faint">
                未关联库内意境，仅以实发数据推断情绪。
              </p>
            )}
            <dl className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-hairline pt-4 sm:grid-cols-3">
              {([
                [
                  "平均发光色",
                  entry.emission.meanHex.toUpperCase(),
                  entry.emission.meanHex,
                ],
                [
                  `CCT（${
                    entry.emission.source === "measured" ? "实测" : "模型"
                  }）`,
                  `${entry.emission.cct} K`,
                ],
                [
                  "光通量 · 功率",
                  `${Math.round(entry.emission.flux)} lm · ${entry.emission.power} W`,
                ],
                [
                  "相对输出 · 原始γ峰值",
                  `${entry.emission.luminance}% · 峰 ${entry.emission.peakLuminance}%`,
                ],
                ["亮度波动", `±${entry.emission.fluctuation}%`],
                [
                  "速率 · 周期",
                  `${entry.emission.changeRate}%/s · ${
                    entry.emission.period
                      ? `${entry.emission.period}s`
                      : "非周期"
                  }`,
                ],
              ] as [string, string, string?][]).map(([k, v, sw]) => (
                <div key={k} className="min-w-0">
                  <dt className="truncate text-[10px] text-faint">{k}</dt>
                  <dd className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-white/90">
                    {sw && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: sw }}
                      />
                    )}
                    <span className="truncate">{v}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-faint">
              {validationMeta[status].hint} · 来源{" "}
              {entry.fileName ?? entry.name}
              {entry.uploaded ? "（本次会话导入）" : ""}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {sceneId && (
                <ImportButton
                  sceneId={sceneId}
                  fps={fps}
                  label="替换 bin"
                  onDone={setNotice}
                />
              )}
              <button
                onClick={() => {
                  onClose?.()
                  window.dispatchEvent(new Event("nvc:open-led-lab"))
                  // 等弹窗卸载、恢复页面滚动后再定位
                  setTimeout(
                    () =>
                      document
                        .getElementById("led-lab")
                        ?.scrollIntoView({ behavior: "smooth" }),
                    50,
                  )
                }}
                className="text-sm text-mist underline-offset-4 hover:text-white hover:underline"
              >
                在灯光校准台中查看 →
              </button>
            </div>
            {notice && (
              <p
                className={`text-sm ${
                  notice.ok ? "text-emerald-200" : "text-red-200"
                }`}
              >
                {notice.text}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[160px_1fr] md:p-6">
          <LedSkeleton pulse={status === "pending"} />
          <div className="space-y-4">
            <h4 className="font-serif text-xl font-bold">
              {status === "pending" ? "灯光数据分析中…" : "预留灯光实发数据位"}
            </h4>
            {colorLight && (
              <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] px-4 py-3 text-sm text-emerald-100/90">
                已有彩光实测：{colorLight.cct}K · Ra {colorLight.cri} ·{" "}
                {colorLight.flux} lm · xy ({colorLight.x}, {colorLight.y})。补放
                bin 后将与实测数据对照验证混色模型与动态情绪。
              </p>
            )}
            <p className="text-sm leading-relaxed text-mist">
              补放该意境的 LED
              发光数据后，这里将显示矩阵回放、实发情绪坐标，以及与设计意图的偏差验证结果；画廊卡片的状态也会同步更新。
            </p>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-hairline px-4 py-3">
                <dt className="text-[10px] text-faint">建议文件名</dt>
                <dd className="mt-0.5 font-mono text-white/90">{suggested}</dd>
              </div>
              <div className="rounded-xl border border-hairline px-4 py-3">
                <dt className="text-[10px] text-faint">数据格式</dt>
                <dd className="mt-0.5 font-mono text-white/90">
                  352 灯珠 · B-R-G-W · {fps} fps
                </dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed text-faint">
              长期补放：将 bin 放入{" "}
              <span className="font-mono text-white/70">public/led/</span>，并在{" "}
              <span className="font-mono text-white/70">
                public/led/manifest.json
              </span>{" "}
              登记
              <span className="font-mono text-white/70">{` { "file", "name", "scene": "${sceneId ?? ""}" } `}</span>
              ，页面会自动分析。临时预览可直接导入（仅本次会话有效）。
            </p>
            {sceneId && (
              <ImportButton
                sceneId={sceneId}
                fps={fps}
                label="导入 bin 预览"
                onDone={setNotice}
              />
            )}
            {notice && (
              <p
                className={`text-sm ${
                  notice.ok ? "text-emerald-200" : "text-red-200"
                }`}
              >
                {notice.text}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function Cell({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-hairline bg-ink-soft px-3 py-2">
      <span className="block truncate text-[10px] text-faint">{label}</span>
      <p
        className="mt-0.5 truncate font-serif text-sm font-bold md:text-base"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  )
}

/** 16×22 灯珠占位骨架 */
function LedSkeleton({ pulse }: { pulse?: boolean }) {
  return (
    <div
      className={`grid aspect-[16/22] w-[150px] gap-[3px] rounded-xl border border-dashed border-white/15 bg-ink p-2.5 ${
        pulse ? "animate-pulse" : ""
      }`}
      style={{ gridTemplateColumns: "repeat(16, 1fr)" }}
      aria-hidden
    >
      {Array.from({ length: 352 }, (_, i) => (
        <span key={i} className="aspect-square rounded-full bg-white/[0.07]" />
      ))}
    </div>
  )
}

/** 未归档灯光素材在画廊中的卡片 */
export function LedOnlyCard({
  entry,
  onSelect,
}: {
  entry: LedEntry
  onSelect: () => void
}) {
  const info = targetInfo(entry.target)
  const { byId } = useCatalog()
  const item = byId[entry.id]
  const fam = item?.effective.family ?? info?.family ?? "平衡"
  const target = item?.effective.target ?? entry.target
  const n = item?.stats.n ?? 0
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-dashed border-white/20 bg-panel text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/40"
    >
      <div className="relative h-40 overflow-hidden">
        <div
          className="absolute inset-0 flex transition-transform duration-700 group-hover:scale-110"
          aria-hidden
        >
          {entry.timeline.map((p) => (
            <span key={p.t} className="flex-1" style={{ background: p.hex }} />
          ))}
        </div>
        <div
          className="absolute inset-0 bg-gradient-to-t from-panel/90 to-transparent"
          aria-hidden
        />
        <div className="absolute bottom-3 left-4 right-4">
          <span className="font-mono text-[10px] tracking-[0.25em] text-white/70">
            {entry.index ?? "—"} · LED 实发 · {entry.fps} fps
          </span>
          <h3 className="truncate font-serif text-xl font-bold tracking-wide md:text-2xl">
            {entry.name}
          </h3>
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[10px] tabular-nums text-white/85 backdrop-blur-sm">
          {Math.round(entry.emission.flux)}lm · 亮度
          {Math.round(entry.emission.luminance)}%
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 bg-panel p-4">
        <div className="flex flex-wrap gap-1.5">
          {entry.keywords.map((k) => (
            <span
              key={k}
              className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/85"
            >
              {k}
            </span>
          ))}
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-mist">
          {info?.desc}
        </p>
        <LedStripView entry={entry} status={validationOf(entry)} />
        <div className="mt-auto space-y-2 border-t border-hairline pt-3 text-[11px]">
          {item && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-mist">
              <span className="rounded border border-hairline bg-white/[0.03] px-1.5 py-0.5">
                {item.subBandLabel}
              </span>
              <span className="text-faint">›</span>
              <span className="rounded border border-hairline bg-white/[0.03] px-1.5 py-0.5">
                {item.effective.subFamily}
              </span>
              <span className="text-faint">›</span>
              <span className="font-medium" style={{ color: familyColor[fam] }}>
                {target}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-mono text-[10px] tabular-nums text-faint">
              {item
                ? `${item.arousal.label} · 参考吻合 ${item.arousal.consistencyScore}分`
                : `生效情绪 ${target}`}
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 font-mono text-faint">
              <span>{n ? `反馈 ${n}` : "待反馈"}</span>
              <span className="rounded-full border border-hairline px-2 py-0.5 font-sans text-[10px] text-mist transition-colors group-hover:border-white/40 group-hover:text-white">
                查看 / 反馈 →
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 弹窗中的匹配音乐：有灯光实发数据时依据实发情绪（含人工标签），否则依据设计意图 */
export function SceneMusic({
  sceneId,
  entryOverride,
}: {
  sceneId: string | null
  entryOverride?: LedEntry
}) {
  const { byScene } = useLedStore()
  const entry = entryOverride ?? (sceneId ? byScene[sceneId] : undefined)
  const profile = sceneId ? profileById[sceneId] : undefined
  return (
    <div>
      {entry ? (
        <MusicMatch
          storeKey={entry.id}
          v={entry.combined}
          target={entry.target}
          manual={!!entry.manual}
          keywords={entry.keywords}
          led={{
            period: entry.emission.period,
            events: entry.emission.events,
            eventsPerMin: entry.emission.eventsPerMin,
            changeRate: entry.emission.changeRate,
            duration: entry.duration,
          }}
        />
      ) : profile ? (
        <MusicMatch
          storeKey={`design-${profile.id}`}
          v={profile.combined}
          target={profile.target}
          keywords={profile.keywords}
          basisNote="设计意图坐标（尚无灯光实发数据，补放 bin 后自动切换为实发情绪）"
        />
      ) : null}
    </div>
  )
}
