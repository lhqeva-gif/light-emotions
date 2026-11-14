import { useState } from "react"
import { useCatalog } from "./catalog"
import { useFeedback } from "./feedback"
import { coordinateOverride } from "./coordinateModel"
import type { Vec } from "./emotion"

export function CoordinateEditor({ id }: { id: string }) {
  const { byId } = useCatalog()
  const { coordinates, setCoordinates } = useFeedback()
  const item = byId[id]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Vec>(item.model.v)
  const [notice, setNotice] = useState("")
  const update = (v: Vec) => setDraft(coordinateOverride(v))
  return (
    <section className="rounded-2xl border border-hairline bg-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">情绪坐标控制</h3>
          <p className="mt-1 text-xs text-mist">
            模型 A {item.model.v.a.toFixed(2)} · 生效 A{" "}
            {item.effective.v.a.toFixed(2)}
            {coordinates[id] ? " · 人工坐标已应用" : ""}
          </p>
        </div>
        <button
          className="rounded-full border border-hairline px-3 py-1.5 text-xs"
          onClick={() => {
            setDraft(item.model.v)
            setEditing(!editing)
            setNotice("")
          }}
        >
          {editing ? "收起" : "编辑情绪坐标"}
        </button>
      </div>
      {editing && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <svg
            aria-label="情绪坐标编辑平面"
            viewBox="0 0 240 240"
            className="w-full touch-none rounded-xl bg-ink-soft"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              const rect = e.currentTarget.getBoundingClientRect()
              update({
                ...draft,
                p:
                  (((e.clientX - rect.left) / rect.width) * 240 - 20) / 100 - 1,
                a:
                  1 - (((e.clientY - rect.top) / rect.height) * 240 - 20) / 100,
              })
            }}
            onPointerMove={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
              const rect = e.currentTarget.getBoundingClientRect()
              update({
                ...draft,
                p:
                  (((e.clientX - rect.left) / rect.width) * 240 - 20) / 100 - 1,
                a:
                  1 - (((e.clientY - rect.top) / rect.height) * 240 - 20) / 100,
              })
            }}
            onPointerUp={(e) =>
              e.currentTarget.releasePointerCapture(e.pointerId)
            }
          >
            <rect
              x="20"
              y="20"
              width="200"
              height="200"
              fill="none"
              stroke="#ffffff25"
            />
            <path d="M20 120H220M120 20V220" stroke="#ffffff40" />
            <text x="128" y="16" fill="#aab4c2" fontSize="10">
              A 唤醒 ↑
            </text>
            <text x="160" y="235" fill="#aab4c2" fontSize="10">
              P 愉悦 →
            </text>
            <circle
              cx={120 + draft.p * 100}
              cy={120 - draft.a * 100}
              r="8"
              fill="#c9dbb3"
              stroke="white"
            />
          </svg>
          <div className="space-y-3">
            {(["p", "a", "d"] as const).map((key) => (
              <label key={key} className="block text-xs">
                <span>
                  {key === "p" ? "愉悦 P" : key === "a" ? "唤醒 A" : "控制 D"}{" "}
                  <output className="float-right font-mono">
                    {draft[key].toFixed(2)}
                  </output>
                </span>
                <input
                  aria-label={`编辑坐标 ${key.toUpperCase()}`}
                  type="range"
                  min="-1"
                  max="1"
                  step=".01"
                  value={draft[key]}
                  onChange={(e) => update({ ...draft, [key]: +e.target.value })}
                  className="mt-2 accent-white"
                />
              </label>
            ))}
            <p className="text-[11px] leading-relaxed text-faint">
              拖动平面修改
              P/A，滑杆支持键盘。应用后更新分类和反馈校准；有反馈时，生效 A
              仍按反馈权重融合。本次会话有效，原始 bin、实测数据和反馈记录不变。
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full bg-white px-3 py-2 text-xs text-ink"
                onClick={() => {
                  setCoordinates(id, draft)
                  setNotice("坐标与唤醒值已更新")
                }}
              >
                应用坐标
              </button>
              <button
                className="rounded-full border border-hairline px-3 py-2 text-xs"
                onClick={() => {
                  setCoordinates(id, null)
                  setEditing(false)
                  setNotice("已恢复原始模型")
                }}
              >
                恢复原始模型
              </button>
            </div>
          </div>
        </div>
      )}
      {notice && (
        <p role="status" className="mt-2 text-xs text-emerald-200">
          {notice}
        </p>
      )}
    </section>
  )
}
