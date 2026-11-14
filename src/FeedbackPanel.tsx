import { useEffect, useRef, useState } from "react"
import { subFamilyMeta, useCatalog } from "./catalog"
import {
  emotionTargets,
  targetInfo,
  type TargetFamily,
  type TargetSubFamily,
  type Vec,
} from "./emotion"
import { familyColor } from "./EmotionTargets"
import { useFeedback, type FeedbackRecord } from "./feedback"

const fmt = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2)
const families: TargetFamily[] = ["舒缓", "平衡", "激活", "警示"]
const SAM: {
  key: "valence" | "arousal" | "dominance"
  label: string
  lo: string
  hi: string
}[] = [
  { key: "valence", label: "愉悦度", lo: "不愉快", hi: "愉快" },
  { key: "arousal", label: "唤醒度", lo: "平静", hi: "兴奋" },
  { key: "dominance", label: "控制感", lo: "被支配", hi: "可掌控" },
]

const subFamilies = Object.keys(subFamilyMeta) as TargetSubFamily[]

export function FeedbackPanel({
  itemId,
  onNext,
  autoFocus,
}: {
  itemId: string
  onNext?: () => void
  autoFocus?: boolean
}) {
  const { byId } = useCatalog()
  const { add, remove, byItem, priorK } = useFeedback()
  const item = byId[itemId]
  const [form, setForm] = useState({
    perceived: "",
    valence: 5,
    arousal: 5,
    dominance: 5,
    comfort: 3,
    condition: "" as FeedbackRecord["condition"],
    respondent: "",
    note: "",
  })
  const [famTab, setFamTab] = useState<TargetFamily | "all">("all")
  const [done, setDone] = useState(false)
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!autoFocus) return
    const frame = requestAnimationFrame(() => {
      panel.current
        ?.querySelector<HTMLButtonElement>("[data-perceived]")
        ?.focus({ preventScroll: true })
      if (window.matchMedia("(max-width: 1023px)").matches)
        panel.current?.scrollIntoView({ block: "start" })
    })
    return () => cancelAnimationFrame(frame)
  }, [autoFocus])
  if (!item) return null
  const s = item.stats
  const records = byItem[itemId] ?? []
  const visibleSubFamilies = subFamilies.filter(
    (sf) => famTab === "all" || subFamilyMeta[sf].parent === famTab,
  )

  const submit = () => {
    if (!form.perceived) return
    add({
      item: itemId,
      ...form,
      respondent: form.respondent.trim() || undefined,
      note: form.note.trim() || undefined,
    })
    setForm((f) => ({ ...f, perceived: "", note: "" }))
    setDone(true)
  }

  return (
    <section
      id="feedback-panel"
      ref={panel}
      className={`overflow-hidden rounded-2xl border bg-panel transition-colors ${
        autoFocus ? "border-white/35" : "border-hairline"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
            USER FEEDBACK · SAM
          </span>
          <h3 className="font-serif text-xl font-bold">情绪感知反馈</h3>
        </div>
        <span className="rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 font-mono text-[10px] tracking-[0.15em] text-mist">
          {s.n} 条反馈 · {s.level}
        </span>
      </div>

      <div className="space-y-6 p-5">
        {/* Form */}
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-white/90">
                1. 选择感受到的细分情绪目标{" "}
                <span className="text-red-200">*</span>
              </span>
              <span className="text-[10px] text-faint">
                按第一感受选择，无标准答案
              </span>
            </div>
            {/* 情绪类别快速筛选 */}
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <button
                onClick={() => setFamTab("all")}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                  famTab === "all"
                    ? "border-white/70 bg-white/15 text-white"
                    : "border-hairline text-faint hover:text-white"
                }`}
              >
                全部类别 ({emotionTargets.length})
              </button>
              {families.map((f) => (
                <button
                  key={f}
                  onClick={() => setFamTab(famTab === f ? "all" : f)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                    famTab === f
                      ? "border-white/70 bg-white/15 text-white"
                      : "border-hairline text-mist hover:text-white"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: familyColor[f] }}
                  />
                  {f}
                </button>
              ))}
            </div>
            <div className="mt-2 space-y-2 rounded-2xl border border-hairline bg-ink-soft p-3">
              {visibleSubFamilies.map((sf) => {
                const meta = subFamilyMeta[sf]
                return (
                  <div
                    key={sf}
                    className="grid grid-cols-1 min-[420px]:grid-cols-[106px_minmax(0,1fr)] items-start gap-2 border-b border-hairline/60 pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="pt-1">
                      <span
                        className="block font-mono text-[10px] font-medium"
                        style={{ color: meta.color }}
                      >
                        {sf}
                      </span>
                      <span className="font-mono text-[9px] text-faint">
                        {meta.parent}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {emotionTargets
                        .filter((t) => t.subFamily === sf)
                        .map((t) => (
                          <button
                            key={t.name}
                            data-perceived={t.name}
                            aria-pressed={form.perceived === t.name}
                            title={`${t.subFamily} · ${t.desc}（适用：${t.use}）`}
                            onClick={() =>
                              setForm((x) => ({ ...x, perceived: t.name }))
                            }
                            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                              form.perceived === t.name
                                ? "border-white bg-white font-bold text-ink"
                                : "border-hairline text-mist hover:border-white/40 hover:text-white"
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-white/90">
                2. 感受强度自评（SAM 1–9）与舒适度
              </span>
              <span className="font-mono text-[10px] text-faint">
                1 = 平静，9 = 兴奋；舒适度单独按 1–5 评分
              </span>
            </div>
            <div className="space-y-2.5 rounded-2xl border border-hairline bg-ink-soft p-3.5">
              {SAM.map((q) => (
                <label
                  key={q.key}
                  className="grid grid-cols-[48px_40px_1fr_40px_18px] items-center gap-2 text-xs"
                >
                  <span className="text-white/85">{q.label}</span>
                  <span className="text-right text-[11px] text-faint">
                    {q.lo}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={9}
                    step={1}
                    value={form[q.key]}
                    onChange={(e) =>
                      setForm((x) => ({
                        ...x,
                        [q.key]: Number(e.target.value),
                      }))
                    }
                    className="accent-white"
                  />
                  <span className="text-[11px] text-faint">{q.hi}</span>
                  <span className="text-right font-mono text-white">
                    {form[q.key]}
                  </span>
                </label>
              ))}
              <label className="grid grid-cols-[48px_40px_1fr_40px_18px] items-center gap-2 border-t border-hairline pt-2.5 text-xs">
                <span className="text-white/85">舒适度</span>
                <span className="text-right text-[11px] text-faint">不适</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={form.comfort}
                  onChange={(e) =>
                    setForm((x) => ({ ...x, comfort: Number(e.target.value) }))
                  }
                  className="accent-white"
                />
                <span className="text-[11px] text-faint">舒适</span>
                <span className="text-right font-mono text-white">
                  {form.comfort}
                </span>
              </label>
            </div>
          </div>

          <details className="rounded-2xl border border-hairline px-3.5 py-2.5 text-xs">
            <summary className="cursor-pointer text-mist hover:text-white">
              3. 实验条件 / 被试编号 / 备注（可选）
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={form.condition}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    condition: e.target.value as FeedbackRecord["condition"],
                  }))
                }
                className="rounded-xl border border-hairline bg-ink-soft px-3 py-2 text-xs text-white outline-none"
              >
                <option value="">实验条件</option>
                <option value="A">A 基线白光</option>
                <option value="B">B 色彩光</option>
                <option value="C">C 多模态</option>
              </select>
              <input
                value={form.respondent}
                onChange={(e) =>
                  setForm((x) => ({ ...x, respondent: e.target.value }))
                }
                placeholder="被试编号"
                className="rounded-xl border border-hairline bg-transparent px-3 py-2 text-xs text-white outline-none placeholder:text-faint focus:border-white/40"
              />
              <input
                value={form.note}
                onChange={(e) =>
                  setForm((x) => ({ ...x, note: e.target.value }))
                }
                placeholder="主观测评备注"
                className="rounded-xl border border-hairline bg-transparent px-3 py-2 text-xs text-white outline-none placeholder:text-faint focus:border-white/40"
              />
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={submit}
              disabled={!form.perceived}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              提交情绪反馈
            </button>
            {!form.perceived && (
              <span className="text-xs text-faint">请先选择感受到的情绪</span>
            )}
            {done && (
              <div role="status" className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-emerald-200">
                  已记录并更新校准
                </span>
                {onNext && (
                  <button
                    onClick={onNext}
                    className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200 transition-colors hover:bg-emerald-300/20"
                  >
                    评价下一意境 →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats：先看大家的感受，校准明细按需展开 */}
        <div className="space-y-3 border-t border-hairline pt-5">
          <div className="rounded-2xl border border-hairline bg-ink-soft p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-faint">
                当前标签与本浏览器反馈
              </span>
              <span className="font-mono text-[10px] text-faint">
                {s.n
                  ? `一致率 ${Math.round(s.agreement * 100)}% · 舒适度 ${
                      s.comfort != null ? s.comfort.toFixed(1) : "—"
                    }/5`
                  : "等待首条反馈"}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <span
                className="font-serif text-2xl font-bold"
                style={{ color: familyColor[item.effective.family] }}
              >
                {item.effective.target}
              </span>
              <span className="rounded-full border border-hairline bg-white/[0.03] px-2 py-0.5 text-[10px] text-mist">
                {item.effective.family} · {item.effective.subFamily}
              </span>
              <span className="text-[11px] text-faint">
                {s.finalBasis === "majority"
                  ? `多数感知（${Math.round(s.topShare * 100)}%）`
                  : s.finalBasis === "calibrated"
                    ? "校准坐标最近标签（无严格多数）"
                    : `模型判定 · 暂无反馈`}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-white/[0.02] px-3 py-2 text-[11px]">
              <span className="min-w-0 truncate text-mist">
                唤醒度划分：
                <span className="font-medium text-white">
                  {item.arousal.label}
                </span>
                <span className="ml-1 font-mono text-[10px] text-faint">
                  (A {fmt(item.arousal.a)} / 基准 {fmt(item.arousal.refA)})
                </span>
              </span>
              <span
                className={`shrink-0 font-mono text-[11px] ${
                  item.arousal.matched ? "text-emerald-300" : "text-amber-200"
                }`}
                title={`参考依据：${item.arousal.basisLabel}`}
              >
                光量参考吻合 {item.arousal.consistencyScore} 分
              </span>
            </div>
            {s.n > 0 ? (
              <ul className="mt-4 space-y-1.5">
                {s.labels.slice(0, 6).map((l) => (
                  <li
                    key={l.name}
                    className="grid grid-cols-[64px_1fr_56px] items-center gap-2 text-xs"
                  >
                    <span className="text-white/85">{l.name}</span>
                    <span className="h-1.5 rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${l.share * 100}%`,
                          background:
                            familyColor[targetInfo(l.name)?.family ?? "平衡"],
                        }}
                      />
                    </span>
                    <span className="text-right font-mono text-faint">
                      {l.count} · {Math.round(l.share * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-faint">
                暂无反馈记录，提交您的第一感受即可参与实时校准。
              </p>
            )}
          </div>

          <details className="rounded-2xl border border-hairline px-4 py-3 text-xs">
            <summary className="cursor-pointer text-mist hover:text-white">
              校准明细 · 反馈权重 {Math.round(s.weight * 100)}%
              {s.n > 0 ? ` · PAD 偏差 Δ ${s.delta.toFixed(2)}` : ""}
            </summary>
            <div className="mt-4 space-y-4">
              <div
                className="h-2 overflow-hidden rounded-full bg-white/10"
                title="模型 / 反馈权重"
              >
                <div
                  className="h-full rounded-full bg-emerald-300/80"
                  style={{ width: `${s.weight * 100}%` }}
                />
              </div>
              <p className="-mt-2 text-[11px] text-faint">
                模型 {Math.round((1 - s.weight) * 100)}% · 反馈{" "}
                {Math.round(s.weight * 100)}%（模型视作 {priorK}{" "}
                位虚拟受访者，可在“用户反馈统计”页调整）
              </p>
              <div className="grid grid-cols-[64px_repeat(3,1fr)] gap-x-3 gap-y-2">
                <span />
                {["P", "A", "D"].map((d) => (
                  <span key={d} className="font-mono text-[10px] text-faint">
                    {d}
                  </span>
                ))}
                <PadRow
                  label={item.model.basis === "led" ? "实发模型" : "设计模型"}
                  v={item.model.v}
                />
                {s.n > 0 && (
                  <PadRow
                    label="反馈均值"
                    v={s.mean}
                    ci={s.n > 1 ? s.ci : undefined}
                  />
                )}
                <PadRow label="校准结果" v={s.calibrated} strong />
              </div>
              <p className="text-[10px] leading-relaxed text-faint">
                ± 为正态近似 95% 区间，小样本仅供描述；单条反馈不报告区间。L2
                仅表示反馈达到 5 条，不代表完成受控实验。
              </p>
            </div>
          </details>

          {records.length > 0 && (
            <details className="rounded-2xl border border-hairline px-4 py-3 text-xs">
              <summary className="cursor-pointer text-mist hover:text-white">
                本素材反馈记录（{records.length}）
              </summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1">
                {[...records].reverse().map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-2 border-t border-hairline py-1.5 text-faint"
                  >
                    <span className="text-white/85">{r.perceived}</span>
                    <span className="font-mono">
                      V{r.valence} A{r.arousal} D{r.dominance}
                      {r.condition ? ` · ${r.condition}` : ""}
                    </span>
                    {r.respondent && <span>#{r.respondent}</span>}
                    <span className="ml-auto">
                      {new Date(r.at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => remove(r.id)}
                      className="text-faint hover:text-red-200"
                      aria-label="删除"
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </section>
  )
}

function PadRow({
  label,
  v,
  ci,
  strong,
}: {
  label: string
  v: Vec
  ci?: Vec
  strong?: boolean
}) {
  return (
    <>
      <span
        className={`truncate ${strong ? "font-bold text-white" : "text-mist"}`}
      >
        {label}
      </span>
      {(["p", "a", "d"] as const).map((k) => (
        <span key={k} className="flex min-w-0 flex-col gap-1">
          <span
            className={`truncate font-mono text-[11px] tabular-nums ${
              strong ? "text-white" : "text-white/75"
            }`}
          >
            {fmt(v[k])}
            {ci && (
              <span className="block text-[10px] text-faint">
                ±{ci[k].toFixed(2)}
              </span>
            )}
          </span>
          <span className="relative h-1 rounded-full bg-white/10">
            <span
              className={`absolute top-0 h-full rounded-full ${
                strong ? "bg-emerald-300" : "bg-white/60"
              }`}
              style={{
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
