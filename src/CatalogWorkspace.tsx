import { useMemo, useState } from "react"
import {
  dimValues,
  groupDims,
  groupKey,
  subBandMeta,
  subFamilyMeta,
  type CatalogItem,
  type GroupDim,
} from "./catalog"
import {
  countGroups,
  emptyFilters,
  filterCatalog,
  type CatalogFilters,
} from "./catalogView"
import { emotionTargets } from "./emotion"
import { scenes } from "./scenes"
import { paletteGradient, proposalScenes } from "./proposal"
import { familyColor } from "./EmotionTargets"
import { DataReview } from "./DataReview"

export function CatalogWorkspace({
  items,
  onOpen,
}: {
  items: CatalogItem[]
  onOpen: (id: string, feedback: boolean, queue: string[]) => void
}) {
  const [filters, setFilters] = useState<CatalogFilters>(emptyFilters)
  const [dim, setDim] = useState<GroupDim>("band")
  const [mobileFilters, setMobileFilters] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const set = (key: keyof CatalogFilters, value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === "band" ? { subBand: "all" } : {}),
      ...(key === "family" ? { subFamily: "all", target: "all" } : {}),
      ...(key === "subFamily" ? { target: "all" } : {}),
    }))
  const visible = useMemo(() => filterCatalog(items, filters), [items, filters])
  const values =
    dim === "target"
      ? emotionTargets.map((t) => ({
          key: t.name,
          label: t.name,
          color: familyColor[t.family],
          hint: t.subFamily,
        }))
      : dimValues[dim]
  const groups = values
    .map((v) => ({
      ...v,
      items: visible.filter((i) => groupKey(i, dim) === v.key),
    }))
    .filter((g) => g.items.length)
  const queue = groups.flatMap((g) => g.items.map((i) => i.id))
  const covered = items.filter((i) => i.stats.n > 0).length
  const ledCount = items.filter((i) => i.led).length
  const measured = items.filter((i) => i.fluxSource === "measured").length
  const allFeedback = items.reduce((s, i) => s + i.stats.n, 0)
  const activeCount = Object.entries(filters).filter(
    ([key, val]) => key !== "query" && val !== "all",
  ).length
  const bandCounts = countGroups(
    filterCatalog(items, { ...filters, band: "all", subBand: "all" }),
    "band",
  )
  const familyCounts = countGroups(
    filterCatalog(items, {
      ...filters,
      family: "all",
      subFamily: "all",
      target: "all",
    }),
    "family",
  )
  const subBands = Object.entries(subBandMeta).filter(
    ([, m]) => filters.band === "all" || m.parent === filters.band,
  )
  const subFamilies = Object.entries(subFamilyMeta).filter(
    ([, m]) => filters.family === "all" || m.parent === filters.family,
  )
  const targets = emotionTargets.filter(
    (t) =>
      (filters.family === "all" || t.family === filters.family) &&
      (filters.subFamily === "all" || t.subFamily === filters.subFamily),
  )
  const reset = () => setFilters({ ...emptyFilters })

  return (
    <main className="catalog-workspace">
      <div className="collection-heading">
        <div>
          <span className="eyebrow">
            <span className="live-point" /> MOOD COLOR LIBRARY / 01
          </span>
          <h1>
            光有万象，<span>情绪有迹。</span>
          </h1>
          <p>找到一种意境，感受光的变化，留下你的真实感受。</p>
        </div>
        <button
          className="review-link"
          onClick={() => setReviewOpen(!reviewOpen)}
          aria-expanded={reviewOpen}
        >
          <span className="validation-mark">✓</span>
          <span>
            数据核验
            <span className="block text-[11px] text-faint">
              实测与推断，分开看
            </span>
          </span>
          <span>{reviewOpen ? "−" : "↗"}</span>
        </button>
      </div>
      <div className="collection-stats">
        <div>
          <span>意境素材</span>
          <strong>
            {String(items.length).padStart(2, "0")}
            <small>项</small>
          </strong>
        </div>
        <div>
          <span>灯光已接入</span>
          <strong>
            {String(ledCount).padStart(2, "0")}
            <small>/ {items.length}</small>
          </strong>
        </div>
        <div>
          <span>彩光通量实测</span>
          <strong>
            {String(measured).padStart(2, "0")}
            <small>项</small>
          </strong>
        </div>
        <div>
          <span>反馈覆盖</span>
          <strong>
            {String(covered).padStart(2, "0")}
            <small>项 · {allFeedback} 条反馈</small>
          </strong>
        </div>
      </div>
      {reviewOpen && <DataReview items={items} />}
      <div className="collection-body">
        <button
          className="mobile-filter-toggle"
          onClick={() => setMobileFilters(!mobileFilters)}
          aria-expanded={mobileFilters}
        >
          分类与筛选 {activeCount ? `(${activeCount})` : ""}{" "}
          <span>{mobileFilters ? "收起 −" : "展开 +"}</span>
        </button>
        <aside
          className={`catalog-sidebar ${mobileFilters ? "is-open" : ""}`}
          aria-label="意境筛选"
        >
          <div className="sidebar-heading">
            <span>筛选意境</span>
            <button onClick={reset}>重置</button>
          </div>
          <section className="filter-section">
            <div className="filter-title">
              <span>01</span>
              <h2>情绪基调</h2>
              <small>3 大类 / {Object.keys(subBandMeta).length} 细分</small>
            </div>
            <div className="filter-rows">
              {[
                { key: "all", label: "全部基调", color: "#c5c8d0" },
                ...dimValues.band,
              ].map((b) => (
                <button
                  key={b.key}
                  className={filters.band === b.key ? "selected" : ""}
                  aria-pressed={filters.band === b.key}
                  onClick={() => set("band", b.key)}
                >
                  <span
                    className="filter-dot"
                    style={{ background: b.color }}
                  />
                  <span>{b.label}</span>
                  <code>
                    {b.key === "all"
                      ? Object.values(bandCounts).reduce((a, b) => a + b, 0)
                      : (bandCounts[b.key] ?? 0)}
                  </code>
                </button>
              ))}
            </div>
            <label className="filter-select-label">
              细分基调
              <select
                aria-label="细分基调"
                value={filters.subBand}
                onChange={(e) => set("subBand", e.target.value)}
              >
                <option value="all">全部细分基调</option>
                {subBands.map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="filter-section">
            <div className="filter-title">
              <span>02</span>
              <h2>情绪类别</h2>
              <small>4 大类 / {Object.keys(subFamilyMeta).length} 细分</small>
            </div>
            <div className="family-filter">
              {["all", ...dimValues.family.map((f) => f.key)].map((f) => (
                <button
                  key={f}
                  aria-pressed={filters.family === f}
                  className={filters.family === f ? "selected" : ""}
                  onClick={() => set("family", f)}
                >
                  {f === "all" ? "全部" : f}
                  <small>{f === "all" ? "" : (familyCounts[f] ?? 0)}</small>
                </button>
              ))}
            </div>
            <label className="filter-select-label">
              细分类别
              <select
                aria-label="细分类别"
                value={filters.subFamily}
                onChange={(e) => set("subFamily", e.target.value)}
              >
                <option value="all">全部细分类别</option>
                {subFamilies.map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="filter-section">
            <div className="filter-title">
              <span>03</span>
              <h2>情绪目标</h2>
              <small>{emotionTargets.length} 项</small>
            </div>
            <label className="filter-select-label">
              感受与意图
              <select
                aria-label="情绪目标"
                value={filters.target}
                onChange={(e) => set("target", e.target.value)}
              >
                <option value="all">全部情绪目标</option>
                {targets.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} · {t.subFamily.split("·")[0]}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="filter-section status-filters">
            <label className="filter-select-label">
              灯光数据
              <select
                aria-label="灯光数据"
                value={filters.led}
                onChange={(e) => set("led", e.target.value)}
              >
                <option value="all">全部状态</option>
                <option value="linked">已接入 LED</option>
                <option value="missing">待补充 LED</option>
              </select>
            </label>
            <label className="filter-select-label">
              反馈状态
              <select
                aria-label="反馈状态"
                value={filters.feedback}
                onChange={(e) => set("feedback", e.target.value)}
              >
                <option value="all">全部反馈状态</option>
                <option value="pending">待反馈</option>
                <option value="done">已有反馈</option>
              </select>
            </label>
          </section>
          <div className="sidebar-note">
            <span className="live-point" />
            <p>
              分类是模型假设，不是效果承诺。你的真实感受，是校准的下一步依据。
            </p>
          </div>
        </aside>
        <div className="catalog-results">
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <input
                aria-label="搜索意境"
                placeholder="搜索名称、情绪或关键词…"
                value={filters.query}
                onChange={(e) => set("query", e.target.value)}
              />
            </label>
            <label className="group-select">
              分组
              <select
                aria-label="分组方式"
                value={dim}
                onChange={(e) => setDim(e.target.value as GroupDim)}
              >
                {groupDims.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="result-caption">
            <span>
              显示 <strong>{visible.length}</strong> 项意境
              {activeCount > 0 && ` · ${activeCount} 项筛选生效`}
            </span>
            <button
              disabled={!visible.length}
              onClick={() =>
                onOpen(
                  (visible.find((i) => !i.stats.n) ?? visible[0]).id,
                  true,
                  queue,
                )
              }
            >
              开始连续反馈 <span>↗</span>
            </button>
          </div>
          {groups.map((g, index) => (
            <section key={g.key} className="catalog-group">
              <div className="catalog-group-heading">
                <span className="filter-dot" style={{ background: g.color }} />
                <h2>{g.label}</h2>
                <span className="group-count">
                  {String(g.items.length).padStart(2, "0")} 项
                </span>
                <span className="group-line" />
                <span className="group-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              {dim === "arousal" && (
                <p className="mb-4 text-xs text-mist">
                  {g.hint}。光通量与明度仅作参考，不等同于实证准确率。
                </p>
              )}
              <div className="scene-grid">
                {g.items.map((i) => (
                  <SceneTile
                    key={i.id}
                    item={i}
                    onOpen={(feedback) => onOpen(i.id, feedback, queue)}
                  />
                ))}
              </div>
            </section>
          ))}
          {!visible.length && (
            <div className="catalog-empty">
              <span>没有匹配的意境</span>
              <p>试试更换基调、类别或关键词，也可以清除全部条件。</p>
              <button onClick={reset}>清除筛选</button>
            </div>
          )}
          <div className="collection-end">
            <span />
            本页数据来自素材库与本浏览器反馈
            <span />
          </div>
        </div>
      </div>
    </main>
  )
}

function SceneTile({
  item: i,
  onOpen,
}: {
  item: CatalogItem
  onOpen: (feedback: boolean) => void
}) {
  const mood = scenes.find((s) => s.id === i.id)
  const proposal = proposalScenes.find((s) => s.id === i.id)
  const gradient =
    mood?.gradient ??
    (proposal
      ? paletteGradient(proposal.palette)
      : `linear-gradient(135deg, ${i.led?.timeline.map((t) => t.hex).join(", ") || "#282a33, #111218"})`)
  const keywords =
    mood?.emotion.keywords ??
    proposal?.emotion.keywords ??
    i.led?.keywords ??
    []
  return (
    <article className="scene-tile">
      <button
        className="scene-art"
        onClick={() => onOpen(false)}
        aria-label={`查看${i.name}`}
      >
        <div className="scene-gradient" style={{ background: gradient }} />
        <div className="scene-art-shade" />
        <span className="scene-type">
          {i.kind === "mood"
            ? "自然意境"
            : i.kind === "proposal"
              ? "光效提案"
              : "灯光实发"}
        </span>
        <span className={`scene-led ${i.led ? "connected" : ""}`}>
          <span />
          {i.led ? "LED 已接入" : "LED 待补充"}
        </span>
        <div className="scene-art-title">
          <span>
            {mood?.pinyin ?? proposal?.elements.join(" / ") ?? "LED EMISSION"}
          </span>
          <h3>{i.name}</h3>
        </div>
        <span className="scene-open-arrow">↗</span>
      </button>
      <div className="scene-content">
        <div className="scene-emotion">
          <span
            className="scene-target"
            style={{ color: familyColor[i.effective.family] }}
          >
            {i.effective.target}
          </span>
          <span>{i.effective.subFamily.split("·")[0]}</span>
        </div>
        <p className="scene-keywords">
          {keywords.join(" · ") || i.subBandLabel}
        </p>
        <div className="scene-data">
          <div>
            <span>
              光通量{" "}
              <small>
                {i.fluxSource === "measured"
                  ? "实测"
                  : i.fluxSource === "model"
                    ? "估算"
                    : "未实测"}
              </small>
            </span>
            <strong>
              {i.flux == null ? "—" : Math.round(i.flux).toLocaleString()}
              <small>{i.flux == null ? "" : " lm"}</small>
            </strong>
          </div>
          <div>
            <span>{i.arousal.brightnessKind}</span>
            <strong>
              {i.brightness}
              <small>{i.arousal.luminance != null ? " %" : " / 100"}</small>
            </strong>
          </div>
          <div>
            <span>模型唤醒度</span>
            <strong className="arousal-value">
              {i.arousal.label}
              <small>
                {" "}
                A{i.arousal.a >= 0 ? "+" : ""}
                {i.arousal.a.toFixed(2)}
              </small>
            </strong>
          </div>
        </div>
        <div className="scene-footer">
          <span>
            {i.stats.n
              ? `${i.stats.n} 条反馈 · 本地记录`
              : "等待你的第一份感受"}
          </span>
          <button onClick={() => onOpen(true)}>
            反馈感受 <span>→</span>
          </button>
        </div>
      </div>
    </article>
  )
}
