import { useCatalog } from "./catalog"
import {
  emotionProfiles,
  profileById,
  quadrant,
  sourceLabels,
  type EmotionProfile,
  type Source,
  type Vec,
} from "./emotion"

const fmt = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2)

/** PAD 三维 × 四来源对照表 */
function PadTable({
  profile: p,
  className = "",
}: {
  profile: EmotionProfile
  className?: string
}) {
  const dims: { k: keyof Vec ;
label: string }[] = [
    { k: "p", label: "愉悦 P" },
    { k: "a", label: "唤醒 A" },
    { k: "d", label: "控制 D" },
  ]
  const rows: Source[] = ["semantic", "color", "light", "combined"]
  return (
    <div className={className}>
      <div className="grid grid-cols-[64px_repeat(3,minmax(0,1fr))] gap-x-2 gap-y-2.5 text-xs">
        <span />
        {dims.map((d) => (
          <span
            key={d.k}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-faint"
          >
            {d.label}
          </span>
        ))}
        {rows.map((s) => (
          <Row
            key={s}
            label={sourceLabels[s]}
            v={p[s]}
            strong={s === "combined"}
            color={p.colorParams.dominant}
          />
        ))}
      </div>
    </div>
  )
}

function Row({
  label,
  v,
  strong,
  color,
}: {
  label: string
  v: Vec
  strong?: boolean
  color: string
}) {
  return (
    <>
      <span
        className={`self-center ${
          strong ? "font-bold text-white" : "text-mist"
        }`}
      >
        {label}
      </span>
      {(["p", "a", "d"] as const).map((k) => (
        <span key={k} className="flex flex-col gap-1">
          <span
            className={`font-mono ${strong ? "text-white" : "text-white/70"}`}
          >
            {fmt(v[k])}
          </span>
          <span className="relative h-1 rounded-full bg-white/10">
            <span className="absolute left-1/2 top-[-2px] h-2 w-px bg-white/30" />
            <span
              className="absolute top-0 h-full rounded-full"
              style={{
                background: strong ? "white" : color,
                left: v[k] >= 0 ? "50%" : `${50 + v[k] * 50}%`,
                width: `${Math.abs(v[k]) * 50}%`,
              }}
            />
          </span>
        </span>
      ))}
    </>
  )
}

/** 弹窗内的完整情绪光环境验证报告 */
/** showLight=false 时省略空间光环境参数（已在意境概览的白光量化中展示） */
export function EmotionReport({
  id,
  showLight = true,
}: {
  id: string
  showLight?: boolean
}) {
  const p = profileById[id]
  const { byId } = useCatalog()
  const cat = byId[id]
  if (!p) return null
  const c = p.colorParams
  const l = p.lightParams
  const q = quadrant(p.combined)
  const warmText =
    c.warmth > 0.25
      ? "暖"
      : c.warmth > 0.05
        ? "中性偏暖"
        : c.warmth > -0.05
          ? "中性"
          : c.warmth > -0.25
            ? "中性偏冷"
            : "冷"
  const est = l.measured ? "" : "（估算）"
  const items: [string, string][] = [
    ["主色", c.dominant.toUpperCase()],
    ["RGB", c.rgb.join(", ")],
    ["Lab", c.lab.join(", ")],
    ["HSV", `${c.hsv[0]}°, ${c.hsv[1]}%, ${c.hsv[2]}%`],
    ["画面明度 L*", `${Math.round(c.brightness)} / 100`],
    ["饱和度均值", `${Math.round(c.saturation)}%`],
    ["明暗对比", `${Math.round(c.contrast)}`],
    ["冷暖倾向", warmText],
    ["色彩复杂度", `${Math.round(c.complexity)}`],
    ["混光 CIE xy", `${c.x.toFixed(4)}, ${c.y.toFixed(4)}`],
  ]
  const lights: [string, string][] = [
    [`目标 CCT${est}`, `${l.cct} K`],
    ["照度", l.lux == null ? "待实测" : `${Math.round(l.lux)} lx`],
    ["光通量", cat?.flux != null ? `${cat.flux} lm` : "待实测"],
    [`MR${est}`, `${l.mr}`],
    ["显指 Ra", l.cri == null ? "目标 90+" : `${l.cri}`],
    ["Duv", l.duv == null ? "待实测" : `${Number(l.duv.toFixed(4))}`],
    [`CIE xy${est}`, `${l.x.toFixed(4)}, ${l.y.toFixed(4)}`],
  ]
  return (
    <section className="overflow-hidden rounded-2xl border border-hairline bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 md:px-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
            EMOTION VALIDATION REPORT
          </span>
          <h3 className="font-serif text-xl font-bold">
            画面情绪光环境验证报告
          </h3>
        </div>
        <span className="rounded-full border border-white/25 px-3 py-1 font-mono text-[10px] tracking-[0.15em] text-faint">
          证据等级 L1 · 理论推断
        </span>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
          <Stat label="模型情绪目标" value={p.target} serif />
          <Stat label="坐标象限" value={q.name.replace(" · ", "·")} serif />
          <Stat
            label="三源一致性"
            value={`${Math.round(p.confidence * 100)}%`}
          />
          {cat && (
            <Stat
              label={`唤醒度 · ${cat.arousal.label}`}
              value={`${fmt(cat.arousal.a)} · 参考 ${cat.arousal.consistencyScore}分`}
              hint={cat.arousal.basisLabel}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 ">
          <MiniMap profile={p} />
          <div className="min-w-0 space-y-5">
            <PadTable profile={p} />
            <ParamGrid title="色彩参数" items={items} swatch={c.dominant} />
            {showLight && (
              <ParamGrid
                title={`空间光环境${l.measured ? " · 实测" : " · 待实测"}`}
                items={lights}
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-hairline px-5 py-5 md:px-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          销售表达
        </span>
        <p className="text-[15px] leading-loose text-mist">
          该方案以「{p.keywords.join(" / ")}」为画面语义依据，主色{" "}
          {c.dominant.toUpperCase()}、画面明度 L* {Math.round(c.brightness)}%、
          {warmText}色调，配合 {l.cct}K{l.lux != null ? ` / ${l.lux} lx` : ""}{" "}
          光环境，模型推断落于
          <span className="text-white">「{q.name}」</span>象限，情绪目标为
          <span className="text-white">「{p.target}」</span>
          （P {fmt(p.combined.p)} · A {fmt(p.combined.a)} · D{" "}
          {fmt(p.combined.d)}）。当前为理论推断，需经 A/B/C 对照实验的主观量表与
          HRV / GSR 指标验证后升级证据等级。
        </p>
        {p.review.length > 0 && (
          <p className="text-xs text-amber-200/80">
            需人工确认：{p.review.join("；")}
          </p>
        )}
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  hint,
  serif,
}: {
  label: string
  value: string
  hint?: string
  serif?: boolean
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-hairline bg-ink-soft p-3">
      <span className="block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
        {label}
      </span>
      <p
        className={`mt-1 truncate tabular-nums ${
          serif
            ? "font-serif text-base font-bold md:text-lg"
            : "font-mono text-sm md:text-base"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate font-mono text-[10px] text-faint">
          {hint}
        </p>
      )}
    </div>
  )
}

function ParamGrid({
  title,
  items,
  swatch,
}: {
  title: string
  items: [string, string][]
  swatch?: string
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        {swatch && (
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: swatch }}
          />
        )}
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          {title}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
        {items.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="truncate text-[10px] text-faint">{k}</dt>
            <dd className="break-words font-mono text-xs tabular-nums text-white/90">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** 单个意境在 P×A 平面中的定位：三个来源点汇聚成综合点 */
function MiniMap({ profile: p }: { profile: EmotionProfile }) {
  const S = 300
  const m = 24
  const x = (v: number) => m + ((v + 1) / 2) * (S - m * 2)
  const y = (v: number) => S - m - ((v + 1) / 2) * (S - m * 2)
  const parts: { s: Source ;
label: string }[] = [
    { s: "semantic", label: "语义" },
    { s: "color", label: "色彩" },
    { s: "light", label: "光环境" },
  ]
  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      className="w-full max-w-[360px] rounded-2xl border border-hairline bg-ink-soft"
    >
      <line
        x1={x(0)}
        x2={x(0)}
        y1={m}
        y2={S - m}
        stroke="white"
        strokeOpacity="0.25"
      />
      <line
        y1={y(0)}
        y2={y(0)}
        x1={m}
        x2={S - m}
        stroke="white"
        strokeOpacity="0.25"
      />
      {emotionProfiles.map((o) => (
        <circle
          key={o.id}
          cx={x(o.combined.p)}
          cy={y(o.combined.a)}
          r="2.5"
          fill="white"
          fillOpacity="0.12"
        />
      ))}
      {parts.map(({ s, label }) => (
        <g key={s}>
          <line
            x1={x(p[s].p)}
            y1={y(p[s].a)}
            x2={x(p.combined.p)}
            y2={y(p.combined.a)}
            stroke={p.colorParams.dominant}
            strokeOpacity="0.6"
            strokeDasharray="3 3"
          />
          <circle
            cx={x(p[s].p)}
            cy={y(p[s].a)}
            r="4"
            fill="none"
            stroke={p.colorParams.dominant}
            strokeWidth="1.5"
          />
          <text
            x={x(p[s].p) + 7}
            y={y(p[s].a) + 4}
            fill="white"
            fillOpacity="0.6"
            fontSize="10"
          >
            {label}
          </text>
        </g>
      ))}
      <circle
        cx={x(p.combined.p)}
        cy={y(p.combined.a)}
        r="8"
        fill={p.colorParams.dominant}
        stroke="white"
        strokeWidth="2"
      />
      <text
        x={S - m}
        y={y(0) - 6}
        fill="white"
        fillOpacity="0.45"
        fontSize="10"
        textAnchor="end"
      >
        愉悦 P →
      </text>
      <text
        x={x(0) + 6}
        y={m + 10}
        fill="white"
        fillOpacity="0.45"
        fontSize="10"
      >
        ↑ 唤醒 A
      </text>
    </svg>
  )
}
