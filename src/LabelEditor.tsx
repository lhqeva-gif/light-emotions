// 实发情绪标签人工修改：主情绪 + 最多 2 个次要情绪 + 备注；保存后全站实时更新
import { useState } from 'react'
import { subFamilyMeta } from './catalog'
import { emotionTargets, rankTargets, type TargetSubFamily } from './emotion'
import { familyColor } from './EmotionTargets'
import { useLedStore, type LedEntry } from './ledStore'

const subFamilies = Object.keys(subFamilyMeta) as TargetSubFamily[]

export function LabelEditor({ entry }: { entry: LedEntry }) {
  const { setLabel } = useLedStore()
  const [open, setOpen] = useState(false)
  const modelRanked = entry.modelRanked ?? entry.ranked
  const init = () => ({
    target: entry.target,
    secondary: (entry.manual?.secondary ?? entry.ranked.slice(1).map((r) => r.name)).slice(0, 2),
    note: entry.manual?.note ?? '',
  })
  const [draft, setDraft] = useState(init)
  const [mode, setMode] = useState<'primary' | 'secondary'>('primary')
  const [saved, setSaved] = useState(false)
  const all = rankTargets(entry.combined, 99)
  const matchOf = (n: string) => all.find((r) => r.target.name === n)?.match ?? 0

  const pick = (name: string) => {
    if (mode === 'primary') {
      setDraft((d) => ({ ...d, target: name, secondary: d.secondary.filter((x) => x !== name) }))
      setMode('secondary')
    } else if (name !== draft.target) {
      setDraft((d) => {
        const has = d.secondary.includes(name)
        const next = has ? d.secondary.filter((x) => x !== name) : [...d.secondary, name].slice(-2)
        return { ...d, secondary: next }
      })
    }
  }

  const save = () => {
    setLabel(entry.id, { target: draft.target, secondary: draft.secondary, note: draft.note.trim() || undefined })
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
    setOpen(false)
  }

  if (!open)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setDraft(init())
            setMode('primary')
            setOpen(true)
          }}
          className="rounded-full border border-hairline px-3 py-1.5 text-xs text-mist transition-colors hover:border-white/40 hover:text-white"
        >
          修改情绪标签
        </button>
        {entry.manual && (
          <button onClick={() => setLabel(entry.id, null)} className="rounded-full px-2 py-1.5 text-xs text-faint hover:text-white">
            恢复模型判定（{entry.modelTarget}）
          </button>
        )}
        {saved && <span className="text-xs text-emerald-200">已保存，页面数据已更新</span>}
      </div>
    )

  return (
    <div className="rounded-2xl border border-white/20 bg-ink-soft p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-faint">点击标签设为</span>
        {(['primary', 'secondary'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full border px-3 py-1 text-xs ${mode === m ? 'border-white bg-white text-ink' : 'border-hairline text-mist'}`}
          >
            {m === 'primary' ? '主情绪' : '次要情绪（≤2）'}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-faint">% 为模型匹配度 · ● 为模型建议</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {subFamilies.map((sf) => {
          const meta = subFamilyMeta[sf]
          return (
            <div key={sf} className="rounded-xl border border-hairline bg-ink/50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium" style={{ color: meta.color }}>
                  {sf}
                </span>
                <span className="font-mono text-[9px] text-faint">{meta.parent}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {emotionTargets
                  .filter((t) => t.subFamily === sf)
                  .map((t) => {
                    const isPrimary = draft.target === t.name
                    const isSecondary = draft.secondary.includes(t.name)
                    const isModel = modelRanked[0]?.name === t.name
                    return (
                      <button
                        key={t.name}
                        onClick={() => pick(t.name)}
                        title={`${t.subFamily} · ${t.desc}`}
                        className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                          isPrimary
                            ? 'border-white bg-white font-bold text-ink'
                            : isSecondary
                              ? 'border-white/60 bg-white/10 text-white'
                              : 'border-hairline text-mist hover:border-white/40 hover:text-white'
                        }`}
                      >
                        {isModel && <span className="mr-1" style={{ color: isPrimary ? undefined : familyColor[meta.parent] }}>●</span>}
                        {t.name}
                        <span className={`ml-1 font-mono text-[9px] ${isPrimary ? 'text-ink/60' : 'text-faint'}`}>{matchOf(t.name)}%</span>
                      </button>
                    )
                  })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl border border-hairline px-3 py-2 text-sm">
        <span className="text-faint">结果：</span>
        <span className="font-bold text-white">{draft.target}</span>
        {draft.secondary.length > 0 && <span className="text-mist"> · 次要 {draft.secondary.join(' / ')}</span>}
      </div>
      <input
        value={draft.note}
        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        placeholder="备注（如：主观测评 n=12 认为更接近“宁静”）"
        className="mt-3 w-full rounded-xl border border-hairline bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-faint focus:border-white/40"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={save} className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-ink hover:opacity-85">
          保存并更新页面
        </button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-hairline px-4 py-1.5 text-sm text-mist hover:text-white">
          取消
        </button>
        {entry.manual && (
          <button
            onClick={() => {
              setLabel(entry.id, null)
              setOpen(false)
            }}
            className="ml-auto rounded-full px-3 py-1.5 text-xs text-faint hover:text-white"
          >
            恢复模型判定
          </button>
        )}
      </div>
    </div>
  )
}
