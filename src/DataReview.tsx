import { useMemo } from "react"
import { summarizeArousal, type CatalogItem } from "./catalog"
import { auditCatalog } from "./dataAudit"

export function DataReview({ items }: { items: CatalogItem[] }) {
  const summary = useMemo(() => summarizeArousal(items), [items])
  const audit = useMemo(() => auditCatalog(items), [items])
  return (
    <section className="data-review" aria-label="数据核验">
      <div className="review-heading">
        <div>
          <span className="eyebrow">DATA VALIDATION</span>
          <h3>数据核验与依据</h3>
        </div>
        <span
          className={`validation-tag ${audit.issues.length ? "warning" : ""}`}
        >
          {audit.issues.length
            ? `${audit.issues.length} 项待检查`
            : `${audit.checked} 项结构检查通过`}
        </span>
      </div>
      <div className="review-metrics">
        <div>
          <span>光通量有值</span>
          <strong>
            {summary.withFluxCount}
            <small> / {items.length} 项</small>
          </strong>
          <p>区分实测与混色模型估算</p>
        </div>
        <div>
          <span>SAM 唤醒分档一致率</span>
          <strong>
            {summary.feedbackAccuracy == null
              ? "—"
              : `${summary.feedbackAccuracy}%`}
          </strong>
          <p>
            {summary.feedbackN
              ? `${summary.feedbackN} 条原始反馈 · 样本内对照`
              : "暂无反馈，不生成准确率"}
          </p>
        </div>
        <div>
          <span>光量参考同档</span>
          <strong>
            {summary.matchedCount}
            <small> / {items.length} 项</small>
          </strong>
          <p>启发式参考，不代表心理效应验证</p>
        </div>
      </div>
      <div className="review-bands">
        {Object.values(summary.byBand).map((row) => (
          <div key={row.band}>
            <span className={`tone-dot ${row.band}`} />
            <strong>{row.label}</strong>
            <code>{row.rangeText}</code>
            <span>{row.count} 项</span>
          </div>
        ))}
      </div>
      <p className="review-note">
        光通量（lm）、照度（lx）、LED 相对输出（%）和画面明度 L*
        分开展示，不能互相直接换算。唤醒度分档与情绪目标均为工程模型假设，需受控实验验证；同一批反馈参与校准，不能充当独立测试集。
      </p>
      {!!audit.issues.length && (
        <ul className="mt-3 space-y-1 text-xs text-amber-200">
          {audit.issues.slice(0, 8).map((x, n) => (
            <li key={n}>
              {x.item}：{x.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
