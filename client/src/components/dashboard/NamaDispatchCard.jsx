import { useLanguage } from "../../context/LanguageContext";
import { BATCH_STAGES } from "../../utils/batchStatus";
import { C, card, sectionTitle, fmtDate, num } from "./dashTheme";

// Batches by stage: defined → under FAT → delivered to Nama
export default function NamaDispatchCard({ namaDispatchPlan }) {
  const { isArabic } = useLanguage();
  const L = (ar, en) => (isArabic ? ar : en);
  const total = namaDispatchPlan.reduce((s, b) => s + b.qty, 0);

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <h3 style={sectionTitle}>{L("الباتشات والتسليم لنماء", "Batches & delivery to Nama")}</h3>
        <span style={{ fontSize: "0.82rem", color: C.muted, fontWeight: 700 }}>
          {L(`${namaDispatchPlan.length} باتش · ${num(total)} عداد`, `${namaDispatchPlan.length} batches · ${num(total)} meters`)}
        </span>
      </div>

      {namaDispatchPlan.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: C.muted, fontWeight: 600 }}>
          {L("لا توجد باتشات مسجلة. ارفعها من صفحة الباتشات.", "No batches yet. Upload them from the Batches page.")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {BATCH_STAGES.map((st) => {
            const list = namaDispatchPlan.filter((b) => b.stage === st.key);
            const qty = list.reduce((s, b) => s + b.qty, 0);
            return (
              <div key={st.key} style={{ border: `1px solid ${C.border}`, borderTop: `4px solid ${st.color}`, borderRadius: 12, padding: 14, background: C.soft }}>
                <div style={{ fontWeight: 800, color: st.color, fontSize: "0.9rem" }}>
                  {st.icon} {isArabic ? st.ar : st.en}
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: C.navy, margin: "4px 0 8px" }}>
                  {num(qty)} <span style={{ fontSize: "0.8rem", fontWeight: 600, color: C.muted }}>{L(`عداد · ${list.length} باتش`, `meters · ${list.length} batches`)}</span>
                </div>
                {list.length === 0 ? (
                  <div style={{ fontSize: "0.8rem", color: C.muted }}>—</div>
                ) : (
                  list.map((b) => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.82rem", padding: "5px 0", borderTop: `1px dashed ${C.border}` }}>
                      <span style={{ fontWeight: 700, color: C.text }}>{b.batch}</span>
                      <span style={{ color: C.muted, whiteSpace: "nowrap" }}>
                        {num(b.qty)} · {fmtDate(b.date, isArabic, false)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
