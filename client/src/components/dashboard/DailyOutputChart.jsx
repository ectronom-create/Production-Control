import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import ExecutiveBurnupChart from "./ExecutiveBurnupChart";
import { C, card, sectionTitle, fmtDate, num } from "./dashTheme";

// Last 30 days: stacked Morning / Evening bars against the daily target line.
function Bars({ series, target, isArabic }) {
  const [hover, setHover] = useState(null);
  const W = 900, H = 260, P = { t: 16, r: 16, b: 34, l: 52 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const max = Math.max(target * 1.25, ...series.filter((d) => !d.isLump).map((d) => d.total), 1);
  const bw = iw / Math.max(series.length, 1);
  const y = (v) => P.t + ih - (Math.min(v, max) / max) * ih;
  const ty = y(target);
  const ticks = [0, Math.round(max / 2), Math.round(max)];
  const h = hover != null ? series[hover] : null;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", direction: "ltr" }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke={C.border} />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={C.muted}>{num(t)}</text>
          </g>
        ))}
        {series.map((d, i) => {
          const x = P.l + i * bw + bw * 0.15;
          const w = bw * 0.7;
          const miss = d.total < target && !d.isToday;
          const mY = y(d.morning);
          const eY = y(d.morning + d.evening);
          const oY = y(d.total);
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
              <rect x={P.l + i * bw} y={P.t} width={bw} height={ih} fill={hover === i ? "#f1f5f9" : "transparent"} />
              {d.isLump ? (
                <rect x={x} y={P.t} width={w} height={ih} fill="#e2e8f0" />
              ) : (
                <>
                  <rect x={x} y={mY} width={w} height={P.t + ih - mY} fill={miss ? "#f59e0b" : C.navy} opacity={d.isToday ? 0.45 : 1} />
                  <rect x={x} y={eY} width={w} height={mY - eY} fill={miss ? "#fbbf24" : "#4b6a9b"} opacity={d.isToday ? 0.45 : 1} />
                  {d.other > 0 && <rect x={x} y={oY} width={w} height={eY - oY} fill="#94a3b8" />}
                  {d.total === 0 && !d.isToday && <text x={x + w / 2} y={P.t + ih - 4} textAnchor="middle" fontSize="11" fill={C.bad}>✕</text>}
                </>
              )}
              {(i % 5 === 0 || i === series.length - 1) && (
                <text x={P.l + i * bw + bw / 2} y={H - 12} textAnchor="middle" fontSize="11" fill={C.muted}>
                  {d.date.slice(8)}/{d.date.slice(5, 7)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={P.l} x2={W - P.r} y1={ty} y2={ty} stroke={C.bad} strokeWidth="2" strokeDasharray="6 4" />
        <text x={W - P.r} y={ty - 6} textAnchor="end" fontSize="11" fontWeight="700" fill={C.bad}>
          {isArabic ? `الهدف ${num(target)}` : `Target ${num(target)}`}
        </text>
      </svg>
      {h && (
        <div style={{ position: "absolute", top: 4, insetInlineStart: 60, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: "0.8rem", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", pointerEvents: "none" }}>
          <b>{fmtDate(h.date, isArabic)}</b>
          {h.isLump ? (
            <div>{isArabic ? "إجمالي أغسطس–سبتمبر (غير يومي)" : "Aug–Sep lump total (not daily)"}</div>
          ) : (
            <>
              <div>☀️ {num(h.morning)} · 🌙 {num(h.evening)}{h.other ? ` · ? ${num(h.other)}` : ""}</div>
              <div style={{ fontWeight: 800, color: h.total >= target ? C.good : C.bad }}>
                {isArabic ? "المجموع" : "Total"} {num(h.total)} / {num(target)}
                {h.isToday ? (isArabic ? " (اليوم — جاري)" : " (today — in progress)") : ""}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DailyOutputChart({ series, target, burnupData, overallCompleted, overallTarget }) {
  const { isArabic } = useLanguage();
  const [view, setView] = useState("daily");
  const days = series.filter((d) => !d.isToday && !d.isLump);
  const hit = days.filter((d) => d.total >= target).length;
  const avg = days.length ? days.reduce((s, d) => s + d.total, 0) / days.length : 0;

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setView(key)}
      style={{
        padding: "6px 12px",
        border: "none",
        borderRadius: 8,
        fontWeight: 700,
        fontSize: "0.8rem",
        cursor: "pointer",
        background: view === key ? C.navy : "transparent",
        color: view === key ? "#fff" : C.muted,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <div>
          <h3 style={sectionTitle}>{isArabic ? "الإنتاج اليومي — آخر 30 يوم" : "Daily output — last 30 days"}</h3>
          {view === "daily" && (
            <div style={{ fontSize: "0.8rem", color: C.muted, marginTop: 2 }}>
              {isArabic
                ? `حققنا الهدف في ${hit} من ${days.length} يوم · المتوسط ${num(avg)} يومياً`
                : `Target hit on ${hit} of ${days.length} days · average ${num(avg)}/day`}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, background: C.soft, padding: 3, borderRadius: 10, border: `1px solid ${C.border}` }}>
          {tabBtn("daily", isArabic ? "يومي" : "Daily")}
          {tabBtn("cumulative", isArabic ? "تراكمي" : "Cumulative")}
        </div>
      </div>
      {view === "daily" ? (
        <>
          <Bars series={series} target={target} isArabic={isArabic} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.76rem", color: C.muted, marginTop: 6 }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.navy, marginInlineEnd: 4 }} />{isArabic ? "صباحي" : "Morning"}</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#4b6a9b", marginInlineEnd: 4 }} />{isArabic ? "مسائي" : "Evening"}</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f59e0b", marginInlineEnd: 4 }} />{isArabic ? "يوم تحت الهدف" : "Below target"}</span>
            <span style={{ color: C.bad }}>✕ {isArabic ? "لا يوجد إنتاج" : "No output"}</span>
          </div>
        </>
      ) : (
        <ExecutiveBurnupChart burnupData={burnupData} overallCompleted={overallCompleted} overallTarget={overallTarget} embedded />
      )}
    </div>
  );
}
