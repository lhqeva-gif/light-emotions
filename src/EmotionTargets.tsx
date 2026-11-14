import {
  emotionTargets,
  rankTargets,
  targetInfo,
  type TargetFamily,
  type Vec,
} from "./emotion"

export const familyColor: Record<TargetFamily, string> = {
  舒缓: "#8fb8ff",
  平衡: "#9fe0b0",
  激活: "#ffb45e",
  警示: "#ff7f7f",
}

const familyHint: Record<TargetFamily, string> = {
  舒缓: "低唤醒 · 让人慢下来",
  平衡: "中等唤醒 · 稳定或氛围型",
  激活: "高唤醒 · 愉悦外放",
  警示: "高唤醒或低愉悦 · 需控时使用",
}

export function FamilyBadge({ family }: { family: TargetFamily }) {
  const c = familyColor[family]
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
      style={{ borderColor: `${c}66`, color: c }}
    >
      {family}
    </span>
  )
}

/** 主情绪标签 + 简短解释 + 次要情绪（匹配度）；override 为人工修改的标签 */
export function TargetSummary({
  v,
  size = "md",
  override,
}: {
  v: Vec
  size?: "md" | "lg"
  override?: { target: string ;
secondary: string[] ;
note?: string }
}) {
  const all = rankTargets(v, 99)
  const model = all.slice(0, 3)
  const matchOf = (n: string) =>
    all.find((r) => r.target.name === n)?.match ?? 0
  const top = override
    ? (targetInfo(override.target) ?? model[0].target)
    : model[0].target
  const topMatch = matchOf(top.name)
  const secondary = override
    ? override.secondary
        .map((n) => targetInfo(n))
        .filter(Boolean)
        .map((t) => ({ target: t!, match: matchOf(t!.name) }))
    : model.slice(1)
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h4
          className={`font-serif font-black ${
            size === "lg" ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"
          }`}
        >
          {top.name}
        </h4>
        <FamilyBadge family={top.family} />
        <span className="rounded-full border border-hairline bg-white/[0.03] px-2.5 py-0.5 text-[10px] text-mist">
          {top.subFamily}
        </span>
        {override ? (
          <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">
            人工标注
          </span>
        ) : (
          <span className="font-mono text-xs text-faint">匹配 {topMatch}%</span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/85">{top.desc}</p>
      <p className="mt-1 text-xs text-faint">
        光色倾向：{top.toneHint} · 适用：{top.use}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-faint">次要细分目标</span>
        {secondary.length ? (
          secondary.map((r) => (
            <span
              key={r.target.name}
              title={`${r.target.subFamily} · ${r.target.desc}`}
              className="rounded-full border border-hairline px-2.5 py-1 text-xs text-white/80"
            >
              {r.target.name}
              <span className="ml-1 text-[10px] text-faint">
                ({r.target.subFamily.split("·")[0]})
              </span>
              <span className="ml-1 font-mono text-[10px] text-faint">
                {r.match}%
              </span>
            </span>
          ))
        ) : (
          <span className="text-xs text-faint">—</span>
        )}
      </div>
      {override && (
        <p className="mt-2 text-[11px] text-faint">
          模型建议：
          {model.map((r) => `${r.target.name} ${r.match}%`).join(" · ")}
          {override.note ? ` ｜ 备注：${override.note}` : ""}
        </p>
      )}
    </div>
  )
}

/** 全部情绪标签释义；hits 用于高亮已命中的标签 */
export function TargetGlossary({
  hits = {},
  title = "情绪标签释义",
}: {
  hits?: Record<string, string[]>
  title?: string
}) {
  const families: TargetFamily[] = ["舒缓", "平衡", "激活", "警示"]
  return (
    <div className="mt-6 rounded-3xl border border-hairline bg-panel p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          {title} · {emotionTargets.length} 个标签 · 按 PAD 原型距离判定
        </span>
        <span className="text-[11px] text-faint">高亮 = 已有素材命中</span>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {families.map((f) => (
          <div key={f}>
            <div className="mb-3 flex flex-wrap items-baseline gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: familyColor[f] }}
              />
              <span className="font-serif text-lg font-bold">{f}</span>
              <span className="text-[11px] text-faint">{familyHint[f]}</span>
            </div>
            <ul className="space-y-2">
              {emotionTargets
                .filter((t) => t.family === f)
                .map((t) => {
                  const hit = hits[t.name]
                  return (
                    <li
                      key={t.name}
                      className={`rounded-xl border px-3.5 py-2.5 ${
                        hit?.length ? "bg-white/[0.04]" : "border-hairline"
                      }`}
                      style={
                        hit?.length
                          ? { borderColor: `${familyColor[f]}66` }
                          : undefined
                      }
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-bold text-white">{t.name}</span>
                        <span className="rounded border border-hairline px-1.5 py-0.5 text-[10px] text-mist">
                          {t.subFamily}
                        </span>
                        <span className="font-mono text-[10px] text-faint">
                          P{t.v.p >= 0 ? "+" : ""}
                          {t.v.p.toFixed(1)} A{t.v.a >= 0 ? "+" : ""}
                          {t.v.a.toFixed(1)} D{t.v.d >= 0 ? "+" : ""}
                          {t.v.d.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-mist">
                        {t.desc}
                      </p>
                      <p className="mt-1 text-[11px] text-faint">
                        基调：{t.toneHint}
                      </p>
                      {hit?.length ? (
                        <p
                          className="mt-1.5 text-[11px]"
                          style={{ color: familyColor[f] }}
                        >
                          命中：{hit.join("、")}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
