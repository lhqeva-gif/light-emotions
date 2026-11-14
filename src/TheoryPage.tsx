import { evidenceLevels, paramMap, references, sections } from './theory'

const refNo = Object.fromEntries(references.map((r, i) => [r.id, i + 1]))

function Cite({ ids }: { ids: string[] }) {
  if (!ids.length) return <span className="text-faint">方法学惯例</span>
  return (
    <span className="font-mono text-[11px]">
      {ids.map((id, i) => (
        <a key={id} href={`#ref-${id}`} className="text-white/70 hover:text-white" onClick={(e) => { e.preventDefault(); document.getElementById(`ref-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}>
          [{refNo[id]}]{i < ids.length - 1 ? ' ' : ''}
        </a>
      ))}
    </span>
  )
}

export function TheoryPage() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 pb-28 pt-14 md:px-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
        {/* TOC */}
        <nav className="top-24 hidden h-fit space-y-1 lg:sticky lg:block">
          <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.25em] text-faint">目录</span>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => document.getElementById(`th-${s.id}`)?.scrollIntoView({ behavior: 'smooth' })}
              className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left text-sm text-mist transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <span className="font-mono text-[10px] text-faint">{s.no}</span>
              {s.title}
            </button>
          ))}
          {[
            ['params', '参数 → 理论对照'],
            ['levels', '证据等级'],
            ['refs', '参考文献'],
          ].map(([id, t]) => (
            <button
              key={id}
              onClick={() => document.getElementById(`th-${id}`)?.scrollIntoView({ behavior: 'smooth' })}
              className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left text-sm text-mist transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <span className="font-mono text-[10px] text-faint">—</span>
              {t}
            </button>
          ))}
        </nav>

        <div>
          <header className="border-b border-hairline pb-10">
            <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-faint">THEORETICAL BASIS OF EMOTION VALIDATION</span>
            <h1 className="mt-4 font-serif text-4xl font-black leading-tight md:text-6xl">情绪验证理论论据</h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-mist md:text-lg">
              本系统不主张“某个色值 = 某种情绪”，而是以
              <span className="text-white"> 画面语义、色彩参数、空间光环境、动态参数与音乐参数 </span>
              共同形成可检验的情绪假设，再以主观量表与生理指标回写校准。以下列出每一环节的理论依据、在系统中的具体实现，以及对应文献。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
              {['画面语义', '色彩参数', '光环境', '动态光', '音乐参数', 'PAD 情绪假设', '主观 + 生理验证', '反馈加权回写'].map((t, i, a) => (
                <span key={t} className="flex items-center gap-2">
                  <span className="rounded-xl border border-hairline bg-panel px-3 py-1.5">{t}</span>
                  {i < a.length - 1 && <span className="text-faint">→</span>}
                </span>
              ))}
            </div>
          </header>

          {sections.map((s) => (
            <section key={s.id} id={`th-${s.id}`} className="scroll-mt-24 border-b border-hairline py-12">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-mono text-sm text-faint">{s.no}</span>
                <h2 className="font-serif text-3xl font-bold">{s.title}</h2>
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-faint">{s.en}</span>
              </div>
              <p className="mt-3 max-w-3xl text-mist">{s.lead}</p>
              <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
                {s.claims.map((c) => (
                  <article key={c.title} className="flex flex-col rounded-3xl border border-hairline bg-panel p-6">
                    <h3 className="font-serif text-xl font-bold">{c.title}</h3>
                    <div className="mt-4 space-y-4 text-[15px] leading-relaxed">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">理论观点</span>
                        <p className="mt-1 text-white/90">{c.point}</p>
                      </div>
                      <div className="rounded-2xl border border-hairline bg-ink-soft p-4">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-200/80">系统实现</span>
                        <p className="mt-1 text-sm text-mist">{c.impl}</p>
                      </div>
                    </div>
                    <div className="mt-auto pt-4 text-xs text-faint">
                      文献 <Cite ids={c.refs} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          <section id="th-params" className="scroll-mt-24 border-b border-hairline py-12">
            <h2 className="font-serif text-3xl font-bold">模型参数 → 理论依据对照</h2>
            <div className="mt-6 overflow-x-auto rounded-3xl border border-hairline bg-panel p-6">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-[11px] text-faint">
                  <tr>
                    {['参数', '系统公式 / 取值', '理论依据', '文献'].map((h) => (
                      <th key={h} className="pb-2 pr-4 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paramMap.map((p) => (
                    <tr key={p.param} className="border-t border-hairline">
                      <td className="py-2.5 pr-4 font-medium text-white">{p.param}</td>
                      <td className="pr-4 font-mono text-xs text-mist">{p.formula}</td>
                      <td className="pr-4 text-mist">{p.basis}</td>
                      <td className="pr-4"><Cite ids={p.refs} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="th-levels" className="scroll-mt-24 border-b border-hairline py-12">
            <h2 className="font-serif text-3xl font-bold">证据等级</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {evidenceLevels.map((l) => (
                <div key={l.level} className="rounded-2xl border border-hairline bg-panel p-5">
                  <span className="font-mono text-2xl">{l.level}</span>
                  <p className="mt-1 font-serif text-lg font-bold">{l.name}</p>
                  <p className="mt-2 text-xs leading-relaxed text-faint">{l.need}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5 text-sm leading-relaxed text-amber-100/85">
              <span className="font-bold">局限说明：</span>
              系统中的系数是依据文献中稳定趋势建立的工程化近似，并非对原研究的直接复现；色彩—情绪关联存在文化与个体差异；动态场景的彩光测量为积分值；所有模型坐标在获得足够反馈与生理数据前均为假设（L1），应以 A/B/C 对照实验逐步升级证据等级。
            </div>
          </section>

          <section id="th-refs" className="scroll-mt-24 py-12">
            <h2 className="font-serif text-3xl font-bold">参考文献</h2>
            <ol className="mt-6 space-y-2.5">
              {references.map((r, i) => (
                <li key={r.id} id={`ref-${r.id}`} className="grid scroll-mt-32 grid-cols-[40px_1fr] gap-2 text-sm leading-relaxed text-mist">
                  <span className="font-mono text-faint">[{i + 1}]</span>
                  <span>{r.text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  )
}
