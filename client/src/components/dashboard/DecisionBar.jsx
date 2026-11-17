import { useLanguage } from "../../context/LanguageContext";
import { C, tint, fmtDate, num, pctColor } from "./dashTheme";

function Kpi({ label, value, sub, color = C.navy, children }) {
  return (
    <div style={{ flex: "1 1 210px", minWidth: 0, padding: "16px 18px", background: "#fff", borderRadius: 12, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.muted }}>{label}</div>
      <div style={{ fontSize: "1.9rem", fontWeight: 900, color, lineHeight: 1.15, marginTop: 4, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.8rem", color: C.text, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
      {children}
    </div>
  );
}

export default function DecisionBar({ forecast: f, shiftTotals, lastCompleteDate, shiftTarget }) {
  const { isArabic } = useLanguage();
  const L = (ar, en) => (isArabic ? ar : en);

  const done = f.remaining === 0;
  const status = done || f.onTrack ? C.good : f.slipDays != null && f.slipDays <= 14 ? C.warn : C.bad;

  const overallPct = f.total ? (f.completed / f.total) * 100 : 0;
  const day = shiftTotals[lastCompleteDate] || { Morning: 0, Evening: 0, Unknown: 0 };
  const dayTotal = day.Morning + day.Evening + day.Unknown;
  const dayTarget = f.dailyTarget;
  const dayPct = dayTarget ? (dayTotal / dayTarget) * 100 : 0;

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 4px 14px rgba(15,23,42,0.06)" }}>
      <div
        style={{
          background: status,
          color: "#fff",
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontSize: "0.8rem", fontWeight: 600, opacity: 0.92 }}>
          {L(
            `محسوب حتى ${fmtDate(f.lastDataDate, true)} · الهدف ${num(dayTarget)} يومياً`,
            `Up to ${fmtDate(f.lastDataDate)} · target ${num(dayTarget)}/day`,
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 14, background: tint(status) }}>
        <Kpi
          label={L("الإنجاز الكلي", "Total completed")}
          value={`${overallPct.toFixed(1)}%`}
          sub={`${num(f.completed)} / ${num(f.total)}`}
        >
          <div style={{ height: 6, background: C.border, borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, overallPct)}%`, height: "100%", background: C.navy }} />
          </div>
        </Kpi>

        <Kpi
          label={L(`آخر يوم (${fmtDate(lastCompleteDate, true, false)})`, `Last day (${fmtDate(lastCompleteDate, false, false)})`)}
          value={num(dayTotal)}
          color={pctColor(dayPct)}
          sub={
            <>
              {L("من", "of")} {num(dayTarget)} ({dayPct.toFixed(0)}%)
              <br />
              <span style={{ color: pctColor((day.Morning / shiftTarget) * 100) }}>☀️ {num(day.Morning)}</span>
              {"  ·  "}
              <span style={{ color: pctColor((day.Evening / shiftTarget) * 100) }}>🌙 {num(day.Evening)}</span>
            </>
          }
        />

        <Kpi
          label={L("الانتهاء المتوقع", "Expected finish")}
          value={done ? L("مكتمل", "Done") : fmtDate(f.projectedFinish, isArabic)}
          color={status}
          sub={L(`الموعد المخطط ${fmtDate(f.plannedFinish, true)}`, `Planned ${fmtDate(f.plannedFinish)}`)}
        />
      </div>
    </div>
  );
}
