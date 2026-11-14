import { useMemo, useRef, useState } from "react"
import { ledSourceLabels, type LedSource } from "./analyze/ledbin"
import { summarizeArousal, useCatalog } from "./catalog"
import { sourceLabels, weights as designWeights, type Vec } from "./emotion"
import { familyColor } from "./EmotionTargets"
import { DataReview } from "./DataReview"
import {
  DEFAULT_PRIOR_K,
  MAX_FEEDBACK_WEIGHT,
  fitSourceWeights,
  normalizeImport,
  mergeFeedback,
  parseFeedbackFile,
  toCSV,
  useFeedback,
  weightError,
} from "./feedback"
import { targetInfo } from "./emotion"

const fmt = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2)
const download = (name: string, text: string, type: string) => {
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + text], { type }))
  a.download = name
  a.click()
}

export function FeedbackPage({ onOpen }: { onOpen: (id: string) => void }) {
  const { items } = useCatalog()
  const {
    records: rawRecords,
    priorK,
    setPriorK,
    clear,
    importRecords,
  } = useFeedback()
  const known = new Set(items.map((i) => i.id))
  const records = rawRecords.filter((r) => known.has(r.item))
  const [notice, setNotice] = useState<{ ok: boolean ;
text: string } | null>(
    null,
  )
  const input = useRef<HTMLInputElement>(null)
  const withFb = items.filter((i) => i.stats.n > 0)
  const respondents = new Set(records.map((r) => r.respondent).filter(Boolean))
    .size
  const totalAgree =
    withFb.reduce((s, i) => s + i.stats.agreement * i.stats.n, 0) /
    Math.max(1, records.length)
  const meanDelta = withFb.length
    ? withFb.reduce((s, i) => s + i.stats.delta * i.stats.n, 0) / records.length
    : null
  const l2 = withFb.filter((i) => i.stats.level === "L2").length
  const changed = withFb.filter((i) => i.effective.target !== i.model.target)
  const arousalSum = useMemo(() => summarizeArousal(items), [items])

  // ── 来源权重拟合 ──
  const designFit = useMemo(() => {
    const samples = items
      .filter((i) => i.stats.n > 0 && i.design && i.model.basis === "design")
      .map((i) => ({
        vectors: {
          semantic: i.design!.semantic,
          color: i.design!.color,
          light: i.design!.light,
        },
        target: i.stats.mean,
        n: i.stats.n,
      }))
    const keys = ["semantic", "color", "light"] as const
    const fit = fitSourceWeights(samples, [...keys])
    return {
      samples: samples.length,
      fit,
      current: weightError(samples, designWeights),
      keys,
    }
  }, [items])
  const ledFit = useMemo(() => {
    const keys: LedSource[] = ["semantic", "color", "light", "dynamic"]
    const src = items.filter(
      (i) => i.stats.n > 0 && i.led && keys.every((k) => i.led!.vectors[k]),
    )
    const samples = src.map((i) => ({
      vectors: i.led!.vectors,
      target: i.stats.mean,
      n: i.stats.n,
    }))
    const avgW = Object.fromEntries(
      keys.map((k) => [
        k,
        src.length
          ? src.reduce((s, i) => s + (i.led!.weights[k] ?? 0), 0) / src.length
          : 0,
      ]),
    ) as Record<LedSource, number>
    return {
      samples: samples.length,
      fit: fitSourceWeights(samples, keys),
      current: weightError(samples, avgW),
      currentW: avgW,
      keys,
    }
  }, [items])

  // ── 模型 → 感知 标签对照 ──
  const pairs = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of items)
      for (const r of i.stats.labels)
        m.set(
          `${i.model.target}→${r.name}`,
          (m.get(`${i.model.target}→${r.name}`) ?? 0) + r.count,
        )
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [items])

  // ── 实验条件对比 ──
  const conditions = useMemo(() => {
    const by: Record<string, {
      n: number
      v: number
      a: number
      d: number
      c: number
      cn: number
    }> = {}
    for (const r of records) {
      const k = r.condition || "未标注"
      const o = (by[k] ??= { n: 0, v: 0, a: 0, d: 0, c: 0, cn: 0 })
      o.n++
      o.v += r.valence
      o.a += r.arousal
      o.d += r.dominance
      if (r.comfort != null) {
        o.c += r.comfort
        o.cn++
      }
    }
    return ["A", "B", "C", "未标注"]
      .filter((k) => by[k])
      .map((k) => {
        const o = by[k]
        return {
          k,
          n: o.n,
          v: o.v / o.n,
          a: o.a / o.n,
          d: o.d / o.n,
          comfort: o.cn ? o.c / o.cn : null,
        }
      })
  }, [records])
  const base = conditions.find((c) => c.k === "A")
  const pct = (x: number, b?: number | null) =>
    b ? `${x >= b ? "+" : ""}${(((x - b) / b) * 100).toFixed(1)}%` : "—"

  const onImport = async (f: File) => {
    try {
      const raw = parseFeedbackFile(f.name, await f.text())
      const { ok, errors } = normalizeImport(
        raw,
        new Set(items.map((i) => i.id)),
      )
      const added = mergeFeedback(rawRecords, ok).length - rawRecords.length
      importRecords(ok)
      setNotice({
        ok: ok.length > 0,
        text: `已新增 ${added} 条，重复 ${ok.length - added} 条${
          errors.length
            ? `，跳过 ${errors.length} 条：${errors.slice(0, 3).join("；")}${
                errors.length > 3 ? "…" : ""
              }`
            : ""
        }`,
      })
    } catch {
      setNotice({
        ok: false,
        text: "文件解析失败：请使用本页导出的 JSON / CSV 模板格式",
      })
    }
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 pb-28 pt-14 md:px-10">
      <div className="mb-8 flex flex-col gap-1 border-b border-hairline pb-5">
        <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-faint">
          USER FEEDBACK STATISTICS
        </span>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">
            用户反馈统计 · 情绪感知权重
          </h2>
          <span className="font-mono text-[11px] tracking-[0.15em] text-faint">
            在任意素材详情中提交 SAM 反馈
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["反馈总数", `${records.length}`],
          ["覆盖素材", `${withFb.length} / ${items.length}`],
          ["被试人数", respondents ? `${respondents}` : "—"],
          [
            "感知一致率",
            records.length ? `${Math.round(totalAgree * 100)}%` : "—",
          ],
          [
            "SAM 唤醒分档一致率",
            arousalSum.feedbackAccuracy == null
              ? "—"
              : `${arousalSum.feedbackAccuracy}%`,
          ],
          ["达到 L2 素材", `${l2}`],
        ].map(([k, v]) => (
          <div
            key={k}
            className="min-w-0 rounded-2xl border border-hairline bg-panel p-4"
          >
            <span className="block truncate text-[11px] text-faint">{k}</span>
            <p className="mt-1 truncate font-mono text-xl tabular-nums md:text-2xl">
              {v}
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (f) onImport(f)
          }}
        />
        <button
          onClick={() => input.current?.click()}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink hover:opacity-85"
        >
          导入反馈 JSON / CSV
        </button>
        <button
          onClick={() =>
            download(
              "情绪反馈.csv",
              toCSV(rawRecords),
              "text/csv;charset=utf-8",
            )
          }
          className="rounded-full border border-hairline px-4 py-2 text-sm text-mist hover:text-white"
        >
          {records.length ? "导出 CSV" : "下载 CSV 模板"}
        </button>
        <button
          onClick={() =>
            download(
              "情绪反馈.json",
              JSON.stringify({ records: rawRecords }, null, 2),
              "application/json",
            )
          }
          disabled={!records.length}
          className="rounded-full border border-hairline px-4 py-2 text-sm text-mist hover:text-white disabled:opacity-40"
        >
          导出 JSON
        </button>
        {records.length > 0 && (
          <button
            onClick={() =>
              window.confirm(
                `确定清空全部 ${records.length} 条反馈？此操作不可撤销，建议先导出备份。`,
              ) && clear()
            }
            className="ml-auto rounded-full px-3 py-2 text-xs text-faint hover:text-red-200"
          >
            清空全部反馈
          </button>
        )}
      </div>
      {notice && (
        <p
          className={`mt-3 text-sm ${
            notice.ok ? "text-emerald-200" : "text-red-200"
          }`}
        >
          {notice.text}
        </p>
      )}
      <p className="mt-2 text-xs text-faint">
        数据保存在本浏览器。CSV 列：item（素材 id）, perceived（情绪标签）,
        valence / arousal / dominance（1–9）, comfort（1–5）,
        condition（A/B/C）, respondent, note,
        at。多人、多设备汇总可通过导入合并。
      </p>

      {rawRecords.length > records.length && (
        <p className="mt-3 text-xs text-amber-200">
          {rawRecords.length - records.length}{" "}
          条反馈来自当前会话外的上传素材，未计入本页统计；原记录仍保留在导出数据中。
        </p>
      )}
      {/* Weight model */}
      <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border border-hairline bg-panel p-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            反馈权重 · 可信度加权
          </span>
          <p className="mt-3 font-mono text-lg">
            校准坐标 = (1 − w) · 模型 + w · 反馈均值
          </p>
          <p className="mt-1 font-mono text-sm text-mist">
            w = min({MAX_FEEDBACK_WEIGHT}, n / (n + k))
          </p>
          <label className="mt-5 block">
            <span className="flex items-baseline justify-between text-xs text-mist">
              <span>先验强度 k（模型相当于 k 位虚拟受访者）</span>
              <span className="font-mono text-xl text-white">k = {priorK}</span>
            </span>
            <input
              type="range"
              min={1}
              max={50}
              value={priorK}
              onChange={(e) => setPriorK(Number(e.target.value))}
              className="mt-2 w-full accent-white"
            />
          </label>
          <div className="mt-4">
            <span className="text-[10px] text-faint">样本量 → 反馈权重</span>
            <div className="mt-2 grid grid-cols-6 gap-2 text-center">
              {[1, 5, 10, 20, 50, 100].map((n) => {
                const w = Math.min(MAX_FEEDBACK_WEIGHT, n / (n + priorK))
                return (
                  <div
                    key={n}
                    className="rounded-lg border border-hairline px-1 py-2"
                  >
                    <div className="mx-auto h-14 w-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="w-full rounded-full bg-emerald-300/80"
                        style={{
                          height: `${w * 100}%`,
                          marginTop: `${(1 - w) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-white/85">
                      {Math.round(w * 100)}%
                    </p>
                    <p className="text-[10px] text-faint">n={n}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-faint">
            k 越大越信任模型；默认 k = {DEFAULT_PRIOR_K}。样本 ≥ 5
            且多数感知标签占比超过 50% 时，生效标签采用多数感知结果。
            {changed.length > 0 &&
              ` 当前已有 ${changed.length} 个素材的生效情绪被反馈改写。`}
          </p>
        </div>

        <div className="rounded-3xl border border-hairline bg-panel p-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            来源权重拟合 · 样本内描述
          </span>
          <p className="mt-2 text-xs text-faint">
            以各素材的反馈均值为目标，在权重单纯形上搜索使误差最小的融合权重（样本量加权）。需至少
            3 个有反馈的素材；拟合误差是训练样本内误差，不代表独立验证准确率。
          </p>
          <WeightCompare
            title="设计意图模型（库内意境）"
            keys={designFit.keys.map((k) => ({ k, label: sourceLabels[k] }))}
            current={designWeights}
            fitted={designFit.fit?.weights ?? null}
            rmse={[designFit.current, designFit.fit?.rmse ?? null]}
            samples={designFit.samples}
          />
          <WeightCompare
            title="灯光实发模型（bin 素材）"
            keys={ledFit.keys.map((k) => ({ k, label: ledSourceLabels[k] }))}
            current={ledFit.currentW}
            fitted={ledFit.fit?.weights ?? null}
            rmse={[ledFit.current, ledFit.fit?.rmse ?? null]}
            samples={ledFit.samples}
          />
        </div>
      </section>

      <div className="mt-8">
        <DataReview items={items} />
      </div>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-3xl border border-hairline bg-panel p-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            实验条件对比 · SAM 均值（1–9）
          </span>
          {conditions.length ? (
            <table className="mt-4 w-full min-w-[540px] text-left text-sm">
              <thead className="text-[11px] text-faint">
                <tr>
                  {[
                    "条件",
                    "n",
                    "愉悦",
                    "vs A",
                    "唤醒",
                    "控制",
                    "舒适度",
                    "vs A",
                  ].map((h, index) => (
                    <th key={index} className="pb-2 pr-2 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {conditions.map((c) => (
                  <tr key={c.k} className="border-t border-hairline">
                    <td className="py-2 pr-2 font-sans text-white">
                      {c.k === "A"
                        ? "A 基线"
                        : c.k === "B"
                          ? "B 色彩光"
                          : c.k === "C"
                            ? "C 多模态"
                            : c.k}
                    </td>
                    <td className="pr-2 text-mist">{c.n}</td>
                    <td className="pr-2 text-white/85">{c.v.toFixed(2)}</td>
                    <td className="pr-2 text-emerald-200">
                      {c.k === "A" ? "—" : pct(c.v, base?.v)}
                    </td>
                    <td className="pr-2 text-white/85">{c.a.toFixed(2)}</td>
                    <td className="pr-2 text-white/85">{c.d.toFixed(2)}</td>
                    <td className="pr-2 text-white/85">
                      {c.comfort != null ? c.comfort.toFixed(2) : "—"}
                    </td>
                    <td className="pr-2 text-emerald-200">
                      {c.k === "A" || c.comfort == null
                        ? "—"
                        : pct(c.comfort, base?.comfort)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-4 text-sm text-faint">
              提交反馈时标注实验条件 A / B /
              C，即可对比色彩光与多模态方案相对基线的提升。
            </p>
          )}
        </div>
        <div className="rounded-3xl border border-hairline bg-panel p-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            模型标签 → 感知标签（前 10）
          </span>
          {pairs.length ? (
            <ul className="mt-4 space-y-1.5">
              {pairs.map(([k, n]) => {
                const [m, p] = k.split("→")
                return (
                  <li
                    key={k}
                    className="grid grid-cols-[1fr_40px] items-center gap-3 text-sm"
                  >
                    <span>
                      <span
                        style={{
                          color: familyColor[targetInfo(m)?.family ?? "平衡"],
                        }}
                      >
                        {m}
                      </span>
                      <span className="mx-2 text-faint">→</span>
                      <span
                        style={{
                          color: familyColor[targetInfo(p)?.family ?? "平衡"],
                        }}
                      >
                        {p}
                      </span>
                      {m === p && (
                        <span className="ml-2 text-[10px] text-emerald-300">
                          一致
                        </span>
                      )}
                    </span>
                    <span className="text-right font-mono text-xs text-mist">
                      {n}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-faint">暂无反馈。</p>
          )}
        </div>
      </section>

      {/* Per material */}
      <section className="mt-6 overflow-x-auto rounded-3xl border border-hairline bg-panel p-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          各素材 · 模型 vs 感知 vs 校准
        </span>
        <table className="mt-4 w-full min-w-[1280px] text-left text-sm">
          <thead className="text-[11px] text-faint">
            <tr>
              {[
                "素材",
                "依据",
                "光通量 / 相对输出或 L*",
                "唤醒模型 · 光量参考吻合",
                "模型情绪",
                "n",
                "多数感知",
                "一致率",
                "反馈 PAD 均值",
                "生效情绪",
                "等级",
                "",
              ].map((h) => (
                <th key={h} className="pb-2 pr-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...items]
              .sort(
                (a, b) => b.stats.n - a.stats.n || a.name.localeCompare(b.name),
              )
              .map((i) => (
                <tr
                  key={i.id}
                  className={`border-t border-hairline ${
                    i.stats.n ? "" : "opacity-50"
                  }`}
                >
                  <td className="py-2 pr-3">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: i.accent }}
                    />
                    <span className="font-serif font-bold">{i.name}</span>
                  </td>
                  <td className="pr-3 text-xs text-faint">
                    {i.model.basis === "led" ? "灯光实发" : "设计意图"}
                  </td>
                  <td className="pr-3 font-mono text-xs tabular-nums text-mist">
                    {i.flux != null ? `${Math.round(i.flux)} lm · ` : ""}
                    {i.brightness}
                    {i.arousal.luminance != null ? "%" : " L*"}
                  </td>
                  <td className="pr-3 font-mono text-xs tabular-nums">
                    <span className="font-sans text-white/90">
                      {i.arousal.label}
                    </span>{" "}
                    <span className="text-faint">({fmt(i.arousal.a)})</span>{" "}
                    <span
                      className={
                        i.arousal.matched
                          ? "text-emerald-300"
                          : "text-amber-200"
                      }
                    >
                      {i.arousal.consistencyScore} 分
                    </span>
                  </td>
                  <td className="pr-3">{i.model.target}</td>
                  <td className="pr-3 font-mono text-xs">{i.stats.n}</td>
                  <td className="pr-3">
                    {i.stats.topLabel
                      ? `${i.stats.topLabel} ${Math.round(i.stats.topShare * 100)}%`
                      : "—"}
                  </td>
                  <td className="pr-3 font-mono text-xs">
                    {i.stats.n
                      ? `${Math.round(i.stats.agreement * 100)}%`
                      : "—"}
                  </td>
                  <td className="pr-3 font-mono text-xs text-mist">
                    {i.stats.n ? padText(i.stats.mean) : "—"}
                  </td>
                  <td
                    className="pr-3 font-medium"
                    style={{ color: familyColor[i.effective.family] }}
                  >
                    {i.effective.target}
                    {i.effective.target !== i.model.target && (
                      <span className="ml-1 text-[10px] text-amber-200">
                        已改写
                      </span>
                    )}
                  </td>
                  <td className="pr-3 font-mono text-xs">{i.stats.level}</td>
                  <td>
                    <button
                      onClick={() => onOpen(i.id)}
                      className="text-xs text-mist hover:text-white"
                    >
                      反馈 →
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}

const padText = (v: Vec) => `${fmt(v.p)} ${fmt(v.a)} ${fmt(v.d)}`

function WeightCompare<K extends string>({
  title,
  keys,
  current,
  fitted,
  rmse,
  samples,
}: {
  title: string
  keys: { k: K ;
label: string }[]
  current: Partial<Record<K, number>>
  fitted: Record<K, number> | null
  rmse: [number | null, number | null]
  samples: number
}) {
  return (
    <div className="mt-5 border-t border-hairline pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-bold">{title}</span>
        <span className="font-mono text-[11px] text-faint">
          {samples} 个素材
          {fitted &&
            rmse[0] != null &&
            rmse[1] != null &&
            ` · 误差 ${rmse[0].toFixed(3)} → ${rmse[1].toFixed(3)}`}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {keys.map(({ k, label }) => (
          <div
            key={k}
            className="grid grid-cols-[72px_1fr_96px] items-center gap-3 text-xs"
          >
            <span className="text-mist">{label}</span>
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white/60"
                  style={{ width: `${(current[k] ?? 0) * 100}%` }}
                />
              </div>
              <div className="h-1.5 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-300"
                  style={{ width: `${(fitted?.[k] ?? 0) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-right font-mono text-faint">
              {Math.round((current[k] ?? 0) * 100)}% →{" "}
              {fitted ? `${Math.round(fitted[k] * 100)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
      {!fitted && (
        <p className="mt-2 text-[11px] text-faint">
          有反馈的素材不足 3 个，暂无法拟合。
        </p>
      )}
      <p className="mt-2 text-[10px] text-faint">
        白条 = 当前模型权重 · 绿条 = 反馈拟合权重
      </p>
    </div>
  )
}
