import { useState } from "react";
import { Save, X } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useLanguage } from "../../context/LanguageContext";
import { getTodayString } from "../../utils/date";
import { BATCH_STAGES, getBatchStage, getBatchStageDate } from "../../utils/batchStatus";

export default function BatchStatusModal({ batch, onClose, onSaved }) {
  const { isArabic } = useLanguage();
  const L = (ar, en) => (isArabic ? ar : en);

  const [stage, setStage] = useState(getBatchStage(batch).key);
  const [dates, setDates] = useState(() => ({
    DEFINED: getBatchStageDate(batch, "DEFINED") || getTodayString(),
    FAT: getBatchStageDate(batch, "FAT"),
    DELIVERED: getBatchStageDate(batch, "DELIVERED"),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const stageIndex = BATCH_STAGES.findIndex((s) => s.key === stage);

  function choose(key) {
    setStage(key);
    // Pre-fill today's date for a newly reached stage
    setDates((prev) => {
      const next = { ...prev };
      const idx = BATCH_STAGES.findIndex((s) => s.key === key);
      BATCH_STAGES.forEach((s, i) => {
        if (i <= idx && !next[s.key]) next[s.key] = getTodayString();
      });
      return next;
    });
  }

  async function save() {
    setError("");
    // Every reached stage needs a date, and dates must run in order
    for (let i = 0; i <= stageIndex; i++) {
      const s = BATCH_STAGES[i];
      if (!dates[s.key]) {
        setError(L(`حدد تاريخ "${s.ar}"`, `Set the date for "${s.en}"`));
        return;
      }
      if (i > 0 && dates[s.key] < dates[BATCH_STAGES[i - 1].key]) {
        setError(
          L(
            `تاريخ "${s.ar}" لا يمكن أن يكون قبل تاريخ "${BATCH_STAGES[i - 1].ar}"`,
            `"${s.en}" date cannot be before "${BATCH_STAGES[i - 1].en}"`,
          ),
        );
        return;
      }
    }

    const patch = {
      status: stage,
      defined_date: dates.DEFINED,
      // Moving a batch back clears the dates of the stages it hasn't reached
      fat_date: stageIndex >= 1 ? dates.FAT : null,
      delivered_date: stageIndex >= 2 ? dates.DELIVERED : null,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    const { error: err } = await supabase.from("shipment_batches").update(patch).eq("id", batch.id);
    setSaving(false);
    if (err) {
      const missing = /column|schema cache/i.test(err.message || "");
      setError(
        missing
          ? L("أعمدة الحالة غير موجودة في قاعدة البيانات — شغّل ملف batch_status.sql في Supabase أولاً.", "Status columns are missing — run batch_status.sql in Supabase first.")
          : L("تعذر الحفظ: ", "Save failed: ") + err.message,
      );
      return;
    }
    onSaved({ ...batch, ...patch });
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">
            {L("حالة الباتش", "Batch status")} — {batch.batch_name}
          </span>
          <button className="modal-close" onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: 10 }}>
          {error && <div className="modal-error">{error}</div>}
          <div style={{ fontSize: "0.84rem", color: "var(--gray-600)" }}>
            {L("الكمية:", "Quantity:")} <b>{(parseInt(batch.total_meters, 10) || 0).toLocaleString()}</b> {L("عداد", "meters")}
          </div>

          {BATCH_STAGES.map((s, i) => {
            const selected = stage === s.key;
            const reached = i <= stageIndex;
            return (
              <div
                key={s.key}
                onClick={() => choose(s.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "12px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  border: `2px solid ${selected ? s.color : reached ? `${s.color}66` : "var(--gray-200)"}`,
                  background: reached ? s.bg : "var(--white)",
                }}
              >
                <input type="radio" checked={selected} onChange={() => choose(s.key)} style={{ accentColor: s.color, width: 18, height: 18 }} />
                <div style={{ flex: "1 1 160px" }}>
                  <div style={{ fontWeight: 800, color: reached ? s.color : "var(--gray-500)" }}>
                    {i + 1}. {s.icon} {isArabic ? s.ar : s.en}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--gray-500)" }}>
                    {i === 0
                      ? L("التاريخ الافتراضي = تاريخ رفع الباتش للنظام", "Default = date the batch was uploaded")
                      : i === 1
                        ? L("تاريخ بدء فحص FAT", "Date FAT inspection started")
                        : L("تاريخ التسليم الفعلي لنماء", "Actual delivery date to Nama")}
                  </div>
                </div>
                <input
                  type="date"
                  value={dates[s.key] || ""}
                  disabled={!reached}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDates((prev) => ({ ...prev, [s.key]: e.target.value }))}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--gray-300)", fontWeight: 700, opacity: reached ? 1 : 0.4 }}
                />
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            {L("إلغاء", "Cancel")}
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            <Save size={15} /> {saving ? L("جارٍ الحفظ...", "Saving...") : L("حفظ الحالة", "Save status")}
          </button>
        </div>
      </div>
    </div>
  );
}
