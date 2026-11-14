import { useEffect, useMemo, useRef, useState } from "react"
import { scenes, type Band, type Scene } from "./scenes"
import { proposalScenes, paletteGradient, type ProposalScene } from "./proposal"
import { EmotionReport } from "./EmotionMap"
import { UploadLab } from "./UploadLab"
import { LedLab } from "./LedLab"
import { useLedStore, type LedEntry } from "./ledStore"
import { LedValidation, SceneMusic } from "./LedGallery"
import { GamutChart } from "./GamutChart"
import { primaries } from "./lightSource"
import { useCatalog } from "./catalog"
import { CatalogWorkspace } from "./CatalogWorkspace"
import { CoordinateEditor } from './CoordinateEditor'
import { nextSceneId } from "./catalogView"
import { familyColor } from "./EmotionTargets"
import { FeedbackPanel } from "./FeedbackPanel"
import { FeedbackPage } from "./FeedbackPage"
import { TheoryPage } from "./TheoryPage"

type Page = "home" | "feedback" | "theory" | "lab"
const pageFromHash = (): Page =>
  location.hash === "#/lab"
    ? "lab"
    : location.hash === "#/theory"
      ? "theory"
      : location.hash === "#/feedback"
        ? "feedback"
        : "home"
function usePage(): [Page, (p: Page) => void] {
  const [page, setPage] = useState<Page>(pageFromHash)
  useEffect(() => {
    const on = () => setPage(pageFromHash())
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  return [
    page,
    (p) => {
      location.hash = p === "home" ? "#/" : `#/${p}`
      window.scrollTo({ top: 0 })
    },
  ]
}

type GalleryItem = { kind: "mood" ;
band: Band ;
id: string ;
scene: Scene } | {
  kind: "proposal"
  band: Band
  id: string
  scene: ProposalScene
} | { kind: "led" ;
band: Band ;
id: string ;
entry: LedEntry }

const fmtSign = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2)

export default function App() {
  const [page, setPage] = usePage()
  const [modalId, setModalId] = useState<string | null>(null)
  const [modalQueue, setModalQueue] = useState<string[]>([])
  const [focusFeedback, setFocusFeedback] = useState(false)
  const [labTab, setLabTab] = useState<"led" | "upload">("led")
  useEffect(() => {
    const openLab = () => {
      setLabTab("led")
      setPage("lab")
    }
    window.addEventListener("nvc:open-led-lab", openLab)
    return () => window.removeEventListener("nvc:open-led-lab", openLab)
  }, [setPage])
  const { entries } = useLedStore()
  const { items } = useCatalog()
  const gallery = useMemo<GalleryItem[]>(
    () => [
      ...scenes.map(
        (scene): GalleryItem => ({
          kind: "mood",
          id: scene.id,
          band: scene.band,
          scene,
        }),
      ),
      ...proposalScenes.map(
        (scene): GalleryItem => ({
          kind: "proposal",
          id: scene.id,
          band: scene.band,
          scene,
        }),
      ),
      ...entries
        .filter((entry) => !entry.linkedId)
        .map(
          (entry): GalleryItem => ({
            kind: "led",
            id: entry.id,
            band:
              entry.color.warmth > 0.1
                ? "warm"
                : entry.color.warmth < -0.1
                  ? "cool"
                  : "neutral",
            entry,
          }),
        ),
    ],
    [entries],
  )
  const openModal = (
    id: string,
    feedback = false,
    queue = items.map((i) => i.id),
  ) => {
    setModalQueue(queue.includes(id) ? [...queue] : [id, ...queue])
    setFocusFeedback(feedback)
    setModalId(id)
  }
  const closeModal = () => setModalId(null)
  const stepModal = (dir: -1 | 1) => {
    if (modalId) setModalId(nextSceneId(modalQueue, modalId, dir))
  }
  const openItem = gallery.find((g) => g.id === modalId)
  const fbSceneCount = items.filter((i) => i.stats.n > 0).length

  useEffect(() => {
    if (!modalId) return
    const previous = document.body.style.overflow
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalId(null)
        return
      }
      if (
        (e.target as HTMLElement)?.closest(
          'input, textarea, select, [contenteditable="true"], [role="tablist"]',
        )
      )
        return
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault()
        setModalId((id) =>
          id
            ? nextSceneId(modalQueue, id, e.key === "ArrowLeft" ? -1 : 1)
            : null,
        )
      }
    }
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKey)
    }
  }, [modalId, modalQueue])

  return (
    <div className="min-h-screen bg-ink text-white">
      <Header
        page={page}
        onNavigate={setPage}
        fbSceneCount={fbSceneCount}
        totalCount={items.length}
      />
      {page === "home" && <CatalogWorkspace items={items} onOpen={openModal} />}
      {page === "theory" && <TheoryPage />}
      {page === "feedback" && (
        <FeedbackPage onOpen={(id) => openModal(id, true)} />
      )}
      {page === "lab" && (
        <main
          id="led-lab"
          className="mx-auto max-w-[1400px] px-5 py-10 md:px-10"
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-5">
            <div>
              <span className="eyebrow">ENGINEERING LAB / 02</span>
              <h1 className="mt-2 font-serif text-3xl">实验室与数据校准</h1>
              <p className="mt-3 text-sm text-mist">
                工程参数与上传分析集中于此，不打断意境浏览。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["led", "upload"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLabTab(tab)}
                  aria-pressed={labTab === tab}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    labTab === tab
                      ? "bg-white text-ink"
                      : "border-hairline text-mist"
                  }`}
                >
                  {tab === "led" ? "灯光实发与 γ 校准" : "多模态上传分析"}
                </button>
              ))}
            </div>
          </div>
          <div hidden={labTab !== "led"}>
            <LedLab onOpen={(id) => openModal(id)} />
          </div>
          <div hidden={labTab !== "upload"}>
            <UploadLab onOpen={(id) => openModal(id)} />
          </div>
        </main>
      )}
      <Footer />
      {openItem && (
        <Modal onClose={closeModal}>
          <DetailView
            key={openItem.id}
            item={openItem}
            initialTab="overview"
            focusFeedback={focusFeedback}
            index={modalQueue.indexOf(openItem.id)}
            total={modalQueue.length}
            onPrev={() => stepModal(-1)}
            onNext={() => stepModal(1)}
            onClose={closeModal}
          />
        </Modal>
      )}
    </div>
  )
}

type ViewTab = "overview" | "led" | "emotion"

/** 素材详情与反馈工作台：左侧查看（意境光学 / 灯光与音乐 / 模型验证依据），右侧常驻情绪感知反馈，支持连续切换意境 */
function DetailView({
  item,
  initialTab,
  focusFeedback,
  index,
  total,
  onPrev,
  onNext,
  onClose,
}: {
  item: GalleryItem
  initialTab: ViewTab
  focusFeedback?: boolean
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  const { byId } = useCatalog()
  const cat = byId[item.id]
  const isLed = item.kind === "led"
  const [tab, setTab] = useState<ViewTab>(
    isLed && initialTab === "emotion" ? "overview" : !isLed && cat?.led && initialTab === "overview" ? "led" : initialTab,
  )

  const head =
    item.kind === "mood"
      ? {
          gradient: item.scene.gradient,
          kicker: `${item.scene.pinyin} · ${item.scene.elements}`,
          name: item.scene.name,
          keywords: item.scene.emotion.keywords,
          accent: item.scene.accent,
        }
      : item.kind === "proposal"
        ? {
            gradient: paletteGradient(item.scene.palette),
            kicker: `${String(item.scene.index).padStart(2, "0")} · 第${
              item.scene.batch === 1 ? "一" : "二"
            }批 · ${item.scene.elements.join(" / ")}`,
            name: item.scene.name,
            keywords: item.scene.emotion.keywords,
            accent: item.scene.palette[0],
          }
        : {
            gradient: `linear-gradient(90deg, ${item.entry.timeline.map((p) => p.hex).join(", ")})`,
            kicker: `${item.entry.index ?? "—"} · 灯光实发素材 · 未归档至库内意境`,
            name: item.entry.name,
            keywords: item.entry.keywords,
            accent: item.entry.timeline[0]?.hex ?? "#ffffff",
          }

  const n = cat?.stats.n ?? 0
  const tabs: { id: ViewTab ;
label: string }[] = isLed
    ? [
        { id: "overview", label: "灯光实发验证" },
        { id: "led", label: "匹配音乐" },
      ]
    : [
        { id: "overview", label: "意境与光学" },
        { id: "led", label: "灯光与音乐" },
        { id: "emotion", label: "模型验证依据" },
      ]

  return (
    <div className="detail-workspace rounded-3xl border border-hairline bg-panel">
      {/* 顶部视觉摘要横幅：包含意境切换器、标题、关键词与生效情绪 */}
      <div className="relative min-h-[190px] overflow-hidden md:min-h-[220px]">
        <div
          className="absolute inset-0"
          style={{
            background: head.gradient,
            animation: "drift 22s ease-in-out infinite",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-panel via-panel/45 to-black/35"
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-between gap-6 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs tracking-[0.3em] text-white/80">
              {head.kicker}
            </span>
            <div className="flex items-center gap-2">
              {total > 1 && (
                <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-ink/70 p-1 backdrop-blur-md">
                  <button
                    onClick={onPrev}
                    title="上一意境（键盘 ←）"
                    className="rounded-full px-3 py-1 text-xs text-mist transition-colors hover:bg-white/10 hover:text-white"
                  >
                    ← 上一意境
                  </button>
                  <span className="px-2 font-mono text-[11px] text-faint">
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {String(total).padStart(2, "0")}
                  </span>
                  <button
                    onClick={onNext}
                    title="下一意境（键盘 →）"
                    className="rounded-full px-3 py-1 text-xs text-mist transition-colors hover:bg-white/10 hover:text-white"
                  >
                    下一意境 →
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                aria-label="关闭"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-ink/70 text-base text-white backdrop-blur-md transition-colors hover:bg-white hover:text-ink"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="scene-dialog-title"
                className="break-words font-serif text-3xl font-black tracking-wider drop-shadow-lg md:text-4xl"
              >
                {head.name}
              </h2>
              {head.keywords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {head.keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded-full border bg-ink/50 px-3 py-0.5 font-serif text-xs font-bold backdrop-blur-sm md:text-sm"
                      style={{
                        borderColor: `${head.accent}99`,
                        color: head.accent,
                      }}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {cat && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-ink/70 px-4 py-2.5 backdrop-blur-md">
                <div>
                  <span className="block font-mono text-[10px] text-faint">
                    {cat.subBandLabel} · {cat.effective.family}（
                    {cat.effective.subFamily}）
                  </span>
                  <span
                    className="font-serif text-lg font-bold md:text-xl"
                    style={{ color: familyColor[cat.effective.family] }}
                  >
                    {cat.effective.target}
                  </span>
                  {cat.effective.secondary.length > 0 && (
                    <span className="ml-2 text-xs text-mist">
                      次要：
                      {cat.effective.secondary.map((s) => s.name).join(" / ")}
                    </span>
                  )}
                </div>
                <span className="h-7 w-px bg-hairline" />
                <div className="font-mono text-xs tabular-nums text-mist">
                  <span className="block text-[10px] text-faint">
                    唤醒度评估（{cat.arousal.basisLabel}）
                  </span>
                  <span className="font-sans font-medium text-white">
                    {cat.arousal.label}
                  </span>{" "}
                  <span>A{fmtSign(cat.arousal.a)}</span> ·{" "}
                  <span
                    className={
                      cat.arousal.matched
                        ? "text-emerald-300"
                        : "text-amber-200"
                    }
                  >
                    参考吻合 {cat.arousal.consistencyScore} 分
                  </span>
                </div>
                <span className="hidden h-7 w-px bg-hairline sm:block" />
                <div className="font-mono text-xs text-mist">
                  <span className="block text-[10px] text-faint">反馈状态</span>
                  {n
                    ? `${n} 条反馈 · 一致 ${Math.round(cat.stats.agreement * 100)}%`
                    : "暂无反馈 · 待测评"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 双栏主体：左侧查看（意境光学 / 灯光与音乐 / 模型验证依据），右侧常驻情绪感知反馈 */}
      <div className="grid grid-cols-1 gap-6 border-t border-hairline bg-ink/40 p-4 md:p-6 lg:grid-cols-[1.32fr_1fr]">
        {/* 左侧：查看区 */}
        <div className="min-w-0 space-y-4">
          <CoordinateEditor id={item.id} />
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-hairline bg-panel px-3 py-2"
            role="tablist"
          >
            <div className="flex flex-wrap gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors md:text-sm ${
                    tab === t.id
                      ? "bg-white text-ink"
                      : "text-mist hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span className="hidden pr-2 font-mono text-[10px] text-faint sm:inline">
              左侧查看体验 · 右侧同步打分反馈
            </span>
          </div>

          <div className="space-y-4" role="tabpanel">
            {tab === "overview" &&
              (item.kind === "mood" ? (
                <Spotlight scene={item.scene} />
              ) : item.kind === "proposal" ? (
                <ProposalSpotlight scene={item.scene} />
              ) : (
                <LedValidation
                  sceneId={null}
                  sceneName={item.entry.name}
                  fps={item.entry.fps}
                  entryOverride={item.entry}
                  onClose={onClose}
                />
              ))}
            {tab === "emotion" && !isLed && (
              <EmotionReport id={item.id} showLight={item.kind !== "mood"} />
            )}
            {tab === "led" &&
              (item.kind === "led" ? (
                <SceneMusic sceneId={null} entryOverride={item.entry} />
              ) : (
                <div className="space-y-4">
                  <LedValidation
                    sceneId={item.id}
                    sceneName={item.scene.name}
                    fps={item.kind === "mood" ? item.scene.playback.fps : 25}
                    onClose={onClose}
                  />
                  <SceneMusic sceneId={item.id} />
                </div>
              ))}
          </div>
        </div>

        {/* 右侧：常驻反馈面板 */}
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <FeedbackPanel
            itemId={item.id}
            autoFocus={focusFeedback}
            onNext={total > 1 ? onNext : undefined}
          />
        </div>
      </div>
    </div>
  )
}

function Header({
  page,
  onNavigate,
  fbSceneCount,
  totalCount,
}: {
  page: Page
  onNavigate: (p: Page) => void
  fbSceneCount: number
  totalCount: number
}) {
  const links: { id: Page ;
label: string ;
badge?: string }[] = [
    { id: "home", label: "意境光谱" },
    { id: "lab", label: "实验室" },
    {
      id: "feedback",
      label: "用户反馈统计",
      badge: fbSceneCount ? `${fbSceneCount}/${totalCount}` : undefined,
    },
    { id: "theory", label: "理论论据" },
  ]
  return (
    <header className="app-header">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <button
            onClick={() => onNavigate("home")}
            className="flex items-baseline gap-3"
          >
            <span className="font-serif text-xl font-bold tracking-tight">
              雷士照明
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-faint">
              NVC
            </span>
          </button>
          <span className="hidden font-mono text-[11px] tracking-[0.2em] text-faint sm:inline">
            情绪光环境研究库
          </span>
        </div>
        <nav className="flex items-center gap-1 rounded-full border border-hairline bg-panel p-1">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => onNavigate(l.id)}
              aria-current={page === l.id ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors ${
                page === l.id
                  ? "bg-white text-ink"
                  : "text-mist hover:text-white"
              }`}
            >
              {l.label}
              {l.badge && (
                <span
                  className={`rounded-full px-1.5 font-mono text-[10px] ${
                    page === l.id ? "bg-ink/10" : "bg-white/10"
                  }`}
                >
                  {l.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}

function Spotlight({ scene }: { scene: Scene }) {
  return (
    <section key={scene.id} className="w-full">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-panel">
        {/* Body */}
        <div className="grid grid-cols-1 gap-6 p-5  md:p-6">
          <div className="space-y-6">
            <Block label="意境描述">
              <p className="text-[15px] leading-loose text-mist">
                {scene.description}
              </p>
            </Block>

            <Block label="情绪语义" accent={scene.accent}>
              <p className="text-[15px] leading-loose text-mist">
                {scene.emotion.semantic}
              </p>
            </Block>

            <Block label="适用情绪场景" accent={scene.accent}>
              <ul className="flex flex-wrap gap-2.5">
                {scene.scenarios.map((s) => (
                  <li
                    key={s}
                    className="rounded-lg border border-hairline bg-white/[0.03] px-3.5 py-2 text-sm text-white/85"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </Block>
          </div>

          {/* Metrics */}
          <div className="space-y-4">
            <ArousalEvalCard id={scene.id} accent={scene.accent} />
            <div className="rounded-2xl border border-hairline bg-ink-soft p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                  白光量化 · 伴生适然光
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-3">
                <Metric
                  label="实测色温"
                  value={scene.metrics.cct}
                  unit="K"
                  big
                  accent={scene.accent}
                />
                <Metric
                  label="综合照度"
                  value={Math.round(scene.metrics.lux)}
                  unit="lx"
                  big
                  accent={scene.accent}
                />
                <Metric label="综合显指 Ra" value={scene.metrics.cri} />
                <Metric label="综合 R9" value={scene.metrics.r9} />
                <Metric
                  label="综合 MR 值"
                  value={Number(scene.metrics.mr.toFixed(3))}
                />
                <Metric
                  label="Duv"
                  value={Number(scene.metrics.duv.toFixed(4))}
                />
                <Metric
                  label="色坐标 x"
                  value={Number(scene.metrics.x.toFixed(4))}
                />
                <Metric
                  label="色坐标 y"
                  value={Number(scene.metrics.y.toFixed(4))}
                />
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-hairline pt-3 font-mono text-[11px] text-faint">
                <span>无限循环</span>
                <span>·</span>
                <span>{scene.playback.fps} 帧/秒</span>
                <span>·</span>
                <span>时长 {scene.playback.duration}</span>
              </div>
            </div>
          </div>
        </div>
        {scene.colorLight && <ColorLightPanel scene={scene} />}
      </div>
    </section>
  )
}

function Block({
  label,
  accent,
  children,
}: {
  label: string
  accent?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span
          className="h-3 w-[3px] rounded-full"
          style={{ background: accent ?? "rgba(255,255,255,0.5)" }}
        />
        <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-white/80">
          {label}
        </h3>
      </div>
      {children}
    </div>
  )
}

function Metric({
  label,
  value,
  unit,
  big,
  accent,
}: {
  label: string
  value: number
  unit?: string
  big?: boolean
  accent?: string
}) {
  return (
    <div className="min-w-0">
      <dt className="mb-0.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
        {label}
      </dt>
      <dd
        className={`break-words font-mono font-medium tabular-nums ${
          big ? "text-base md:text-lg" : "text-xs md:text-sm"
        }`}
        style={big && accent ? { color: accent } : undefined}
      >
        {value}
        {unit && <span className="ml-0.5 text-[11px] text-faint">{unit}</span>}
      </dd>
    </div>
  )
}

function ProposalSpotlight({ scene }: { scene: ProposalScene }) {
  const accent = scene.palette[0]
  return (
    <section key={scene.id} className="w-full">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-panel">
        <div className="grid grid-cols-1 gap-6 p-5  md:p-6">
          <div className="space-y-6">
            <Block label="意境描述">
              <p className="text-[15px] leading-loose text-mist">
                {scene.description}
              </p>
            </Block>

            <Block label="情绪语义" accent={accent}>
              <p className="text-[15px] leading-loose text-mist">
                {scene.emotion.semantic}
              </p>
            </Block>

            <Block label="适用情绪场景" accent={accent}>
              <ul className="flex flex-wrap gap-2.5">
                {scene.scenarios.map((s) => (
                  <li
                    key={s}
                    className="rounded-lg border border-hairline bg-white/[0.03] px-3.5 py-2 text-sm text-white/85"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </Block>
          </div>

          <div className="space-y-4">
            <ArousalEvalCard id={scene.id} accent={accent} />
            <div className="rounded-2xl border border-hairline bg-ink-soft p-4 md:p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                色彩板 · PALETTE
              </span>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {scene.palette.map((c) => (
                  <div key={c} className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-6 w-6 shrink-0 rounded-full border border-white/20"
                      style={{ background: c }}
                    />
                    <span className="truncate font-mono text-xs uppercase text-mist">
                      {c}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Modal({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const el = container.current!
    if (!el.contains(document.activeElement))
      el
        .querySelector<HTMLButtonElement>("button")
        ?.focus({ preventScroll: true })
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const focusable = [
        ...el.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, textarea, a[href], [tabindex="0"]',
        ),
      ].filter((node) => node.getClientRects().length > 0)
      const first = focusable[0],
        last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first && last) {
        e.preventDefault()
        last.focus()
      }
      if (!e.shiftKey && document.activeElement === last && first) {
        e.preventDefault()
        first.focus()
      }
    }
    el.addEventListener("keydown", trap)
    return () => {
      el.removeEventListener("keydown", trap)
      previous?.focus({ preventScroll: true })
    }
  }, [])
  return (
    <div
      ref={container}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/75 p-3 backdrop-blur-md md:p-6"
      style={{ animation: "rise 0.25s ease" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scene-dialog-title"
    >
      <div
        className="relative w-full max-w-[1280px]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <span className="font-serif text-lg font-bold">
          雷士照明 · 伴生适然光
        </span>
        <span className="font-mono text-[11px] tracking-[0.2em] text-faint">
          柔光情绪彩 · 动态光效提案 · 情绪语义体系
        </span>
      </div>
    </footer>
  )
}

/** 彩光实测（RGB 三色混色光源） */
function ColorLightPanel({ scene }: { scene: Scene }) {
  const c = scene.colorLight!
  const items: [string, string, string?][] = [
    ["实测色温", `${c.cct}`, "K"],
    ["光通量", `${Math.round(c.flux)}`, "lm"],
    ["功率", `${c.power}`, "W"],
    ["光效", `${c.efficacy}`, "lm/W"],
    ["显指 Ra", `${c.cri}`],
    ["R9", `${c.r9}`],
    ["SDCM", `${c.sdcm}`],
    ["Duv", `${Number(c.duv.toFixed(4))}`],
    ["色坐标 x", `${Number(c.x.toFixed(4))}`],
    ["色坐标 y", `${Number(c.y.toFixed(4))}`],
  ]
  return (
    <div className="grid grid-cols-1 gap-5 border-t border-hairline p-5  md:p-6">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span
            className="h-3 w-[3px] rounded-full"
            style={{ background: scene.accent }}
          />
          <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-white/80">
            彩光实测 · RGB 三色混色
          </h3>
          <span className="rounded-full border border-white/25 px-2 py-0.5 font-mono text-[9px] tracking-[0.2em] text-faint">
            素材 {String(c.index).padStart(2, "0")}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-3 sm:grid-cols-3 ">
          {items.map(([k, v, u], i) => (
            <div key={k} className="min-w-0">
              <dt className="mb-0.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                {k}
              </dt>
              <dd
                className={`break-words font-mono font-medium tabular-nums ${
                  i < 2 ? "text-base md:text-lg" : "text-xs md:text-sm"
                }`}
                style={i < 2 ? { color: scene.accent } : undefined}
              >
                {v}
                {u && (
                  <span className="ml-0.5 text-[11px] text-faint">{u}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-faint">
          光源由 R / G / B 三色 LED 混色：
          {primaries
            .map((p) => ` ${p.key} (${p.x}, ${p.y}) ${p.flux} lm`)
            .join(" ·")}
          。动态场景为积分测量值，白光量化数据为伴生适然光白光模式。
        </p>
      </div>
      <div className="min-w-0 rounded-2xl border border-hairline bg-ink-soft p-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          CIE 1931 色度 · RGB 色域
        </span>
        <GamutChart
          width={340}
          points={[
            {
              id: "white",
              label: "白光",
              x: scene.metrics.x,
              y: scene.metrics.y,
              color: "#ffffff",
              kind: "model",
            },
            {
              id: scene.id,
              label: `${scene.name} 彩光`,
              x: c.x,
              y: c.y,
              color: scene.accent,
              kind: "measured",
              active: true,
            },
          ]}
        />
        <p className="mt-1 text-[10px] text-faint">
          ● 彩光实测 · ○ 白光量化 · 虚线三角 = RGB 混色可达色域
        </p>
      </div>
    </div>
  )
}

/** 素材详情内：单个素材的唤醒度划分指标与光通量/亮度参考准确率卡 */
function ArousalEvalCard({ id, accent }: { id: string ;
accent: string }) {
  const { byId } = useCatalog()
  const item = byId[id]
  if (!item) return null
  const ar = item.arousal
  return (
    <div className="rounded-2xl border border-hairline bg-ink-soft p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          唤醒度划分评估 · 参考光通量 / 亮度
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] tabular-nums ${
            ar.matched
              ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200"
              : "border-amber-300/35 bg-amber-300/10 text-amber-200"
          }`}
        >
          启发式吻合 {ar.consistencyScore} 分 ·{" "}
          {ar.matched ? "与参考同档" : "与参考跨档"}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
        <div className="min-w-0">
          <dt className="truncate font-mono text-[10px] text-faint">
            当前唤醒度划分
          </dt>
          <dd
            className="mt-0.5 truncate font-serif text-base font-bold md:text-lg"
            style={{ color: accent }}
          >
            {ar.label}{" "}
            <span className="font-mono text-xs font-normal tabular-nums text-white/85">
              A {fmtSign(ar.a)}
            </span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate font-mono text-[10px] text-faint">
            光强参考唤醒度
          </dt>
          <dd className="mt-0.5 truncate font-mono text-xs tabular-nums text-white/90 md:text-sm">
            {ar.refLabel}{" "}
            <span className="text-faint">({fmtSign(ar.refA)})</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate font-mono text-[10px] text-faint">
            参考光通量 ·{" "}
            {item.fluxSource === "measured"
              ? "实测"
              : item.fluxSource === "model"
                ? "估算"
                : "缺失"}
          </dt>
          <dd className="mt-0.5 truncate font-mono text-xs tabular-nums text-white/90 md:text-sm">
            {ar.flux != null ? `${ar.flux} lm` : "待实测"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate font-mono text-[10px] text-faint">
            {ar.brightnessKind}
          </dt>
          <dd className="mt-0.5 truncate font-mono text-xs tabular-nums text-white/90 md:text-sm">
            {ar.brightness}
            {ar.luminance != null ? "%" : " / 100"}{" "}
            <span className="text-[11px] text-faint">
              (
              {ar.luminance != null
                ? `LED ${ar.luminance}%`
                : `画面 ${ar.visualBrightness}%`}
              )
            </span>
          </dd>
        </div>
      </dl>
    </div>
  )
}
