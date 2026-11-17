import { Printer, X } from "lucide-react";
import { printReportDocument } from "../../utils/printReport";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { findStage } from "../../constants/defectStages";
import { buildAlerts } from "./AttentionList";
import { C, fmtDate, num, pctColor } from "./dashTheme";

// ── Print-friendly building blocks (inline styles survive the print iframe) ──
const sx = {
  page: { background: "#fff", color: "#0f172a", padding: "18px 24px", fontSize: 11, lineHeight: 1.45 },
  h2: { fontSize: 12, fontWeight: 800, color: C.navy, margin: "10px 0 5px", paddingBottom: 2, borderBottom: `2px solid ${C.navy}` },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 10.5 },
  th: { background: "#f1f5f9", color: C.text, fontWeight: 700, padding: "3px 7px", border: `1px solid ${C.border}`, textAlign: "start" },
  td: { padding: "3px 7px", border: `1px solid ${C.border}`, verticalAlign: "top" },
  // numbers always read left-to-right, even inside Arabic text
  numCell: { fontFamily: "JetBrains Mono, Consolas, monospace", fontWeight: 700, textAlign: "center", direction: "ltr", unicodeBidi: "isolate" },
};

const stageName = (id, ar) => {
  const s = id ? findStage(id) : null;
  return s ? (ar ? s.arabic : s.name) : id || "—";
};

function StatusChip({ color, children }) {
  return (
    <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 10, fontSize: 10.5, fontWeight: 800, color, background: `${color}18`, border: `1px solid ${color}55`, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Kpi({ label, value, sub, color = C.navy, text = false }) {
  return (
    <div style={{ flex: 1, border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`, borderRadius: 6, padding: "6px 9px" }}>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{label}</div>
      <div
        style={{
          fontSize: text ? 15 : 17,
          fontWeight: 900,
          color,
          lineHeight: 1.3,
          ...(text ? {} : { fontFamily: "JetBrains Mono, Consolas, monospace", direction: "ltr", unicodeBidi: "isolate" }),
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: C.text }}>{sub}</div>
    </div>
  );
}

// Simple 14-day bar chart drawn in SVG (prints crisply)
function MiniBars({ series, target }) {
  const data = series.filter((d) => !d.isLump && !d.isToday).slice(-14);
  if (!data.length) return null;
  const W = 700, H = 84, P = { l: 34, r: 8, t: 12, b: 18 };
  const max = Math.max(target * 1.2, ...data.map((d) => d.total));
  const bw = (W - P.l - P.r) / data.length;
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", direction: "ltr" }}>
      {data.map((d, i) => {
        const x = P.l + i * bw + bw * 0.18;
        const c = d.total >= target ? C.navy : d.total === 0 ? C.bad : C.warn;
        return (
          <g key={d.date}>
            <rect x={x} y={y(d.total)} width={bw * 0.64} height={Math.max(0, H - P.b - y(d.total))} fill={c} />
            <text x={x + bw * 0.32} y={y(d.total) - 3} textAnchor="middle" fontSize="9" fill={C.text}>{d.total ? num(d.total) : "0"}</text>
            <text x={x + bw * 0.32} y={H - 6} textAnchor="middle" fontSize="9" fill={C.muted}>{d.date.slice(8)}/{d.date.slice(5, 7)}</text>
          </g>
        );
      })}
      <line x1={P.l} x2={W - P.r} y1={y(target)} y2={y(target)} stroke={C.bad} strokeDasharray="5 3" strokeWidth="1.5" />
      <text x={P.l - 4} y={y(target) + 3} textAnchor="end" fontSize="9" fill={C.bad} fontWeight="700">{num(target)}</text>
    </svg>
  );
}

export default function ManagementReportModal({ isOpen, onClose, data: d }) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  if (!isOpen || !d) return null;
  const L = (ar, en) => (isArabic ? ar : en);
  const f = d.forecast;
  const target = d.targets.dailyProd;
  const shiftTarget = d.targets.shiftProd;

  // ── Figures ──
  const day = d.shiftTotals[d.lastCompleteDate] || { Morning: 0, Evening: 0, Unknown: 0, fw: 0 };
  const dayTotal = day.Morning + day.Evening + day.Unknown;
  const last7 = d.dailySeries.filter((x) => !x.isToday && !x.isLump && x.date <= d.lastCompleteDate).slice(-7);
  const w7 = last7.reduce((s, x) => s + x.total, 0);
  const w7Target = target * last7.length;
  const ra = d.recoveryAnalysis;
  const monthLabel = fmtDate(`${ra.selectedRecoveryMonth}-01`, isArabic).replace(/^1 /, "");
  const overallPct = f.total ? (f.completed / f.total) * 100 : 0;
  const status = f.remaining === 0 || f.onTrack ? C.good : f.slipDays != null && f.slipDays <= 14 ? C.warn : C.bad;
  const statusText =
    f.remaining === 0
      ? L("مكتمل", "Completed")
      : status === C.good
        ? L("على المسار", "On track")
        : status === C.warn
          ? L("يحتاج متابعة", "Needs attention")
          : L("متأخر عن الخطة", "Behind plan");

  const rows = [
    { label: L(`آخر يوم (${fmtDate(d.lastCompleteDate, true)})`, `Last day (${fmtDate(d.lastCompleteDate)})`), target, actual: dayTotal },
    { label: L(`آخر ${last7.length} أيام`, `Last ${last7.length} days`), target: w7Target, actual: w7 },
    { label: L(`شهر ${monthLabel} حتى الآن (${ra.elapsedDays} يوم)`, `${monthLabel} to date (${ra.elapsedDays} days)`), target: ra.targetInPeriod, actual: ra.actualInPeriod },
    { label: L(`منذ بداية المشروع (${f.elapsedDays} يوم)`, `Since project start (${f.elapsedDays} days)`), target: f.targetToDate, actual: f.completedToDate },
  ];

  const kitDays = Math.floor(d.kitRunwayMetrics.runwayDays || 0);
  const nextKit = d.kitMetrics.nearestIncomingDays;
  const dt = d.downtimeSummary;
  const top3 = (d.topDefectCodes.top4 || []).slice(0, 3);
  const byStage = (k) => d.namaDispatchPlan.filter((s) => s.stage === k);
  const sumQty = (list) => list.reduce((s, x) => s + x.qty, 0);
  const delivered = byStage("DELIVERED");
  const inFat = byStage("FAT");
  const defined = byStage("DEFINED");

  const alerts = buildAlerts({
    forecast: f,
    shiftTotals: d.shiftTotals,
    lastCompleteDate: d.lastCompleteDate,
    shiftTarget,
    downtime: dt,
    kitRunway: d.kitRunwayMetrics,
    kitMetrics: d.kitMetrics,
    topDefects: d.topDefectCodes,
    isArabic,
  })
    .filter((a) => a.level !== "good")
    .slice(0, 5);

  // Plain-language executive summary
  const summary = [
    L(
      `تم إنتاج ${num(f.completed)} عداد من أصل ${num(f.total)} (${overallPct.toFixed(1)}%).`,
      `${num(f.completed)} of ${num(f.total)} meters produced (${overallPct.toFixed(1)}%).`,
    ),
    f.variance >= 0
      ? L(`الإنتاج متقدم على الخطة بـ ${num(f.variance)} عداد.`, `Output is ${num(f.variance)} meters ahead of plan.`)
      : L(
          `الإنتاج متأخر عن الخطة بـ ${num(-f.variance)} عداد (ما يعادل ${Math.abs(f.varianceDays).toFixed(1)} يوم إنتاج).`,
          `Output is ${num(-f.variance)} meters behind plan (${Math.abs(f.varianceDays).toFixed(1)} production days).`,
        ),
    f.remaining > 0 && f.projectedFinish
      ? L(
          `بمعدل آخر 7 أيام (${num(f.recentRate)} يومياً) يتوقع الانتهاء في ${fmtDate(f.projectedFinish, true)}، والموعد المخطط ${fmtDate(f.plannedFinish, true)}.`,
          `At the last-7-day pace (${num(f.recentRate)}/day) completion is expected on ${fmtDate(f.projectedFinish)}; planned date is ${fmtDate(f.plannedFinish)}.`,
        )
      : "",
    f.remaining > 0 && f.daysLeftToPlan > 0 && f.requiredRate > target
      ? L(`للالتزام بالموعد يلزم إنتاج ${num(f.requiredRate)} عداد يومياً.`, `Meeting the plan requires ${num(f.requiredRate)} meters per day.`)
      : "",
  ].filter(Boolean);

  const handlePrint = () => printReportDocument("mgmt-report-printable-area", { orientation: "portrait" });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-xl" style={{ maxWidth: 900, maxHeight: "94vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: "14px 20px" }}>
          <span className="modal-title">{L("تقرير الإدارة — معاينة", "Management Report — Preview")}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" onClick={handlePrint}>
              <Printer size={16} /> {L("طباعة / حفظ PDF", "Print / Save PDF")}
            </button>
            <button className="btn-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: "auto", background: "#e2e8f0", padding: 18 }}>
          <div id="mgmt-report-printable-area" className="report-document" dir={isArabic ? "rtl" : "ltr"} style={{ ...sx.page, maxWidth: 794, margin: "0 auto", boxShadow: "0 4px 18px rgba(0,0,0,0.12)" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingBottom: 10, borderBottom: `3px solid ${C.navy}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={`${window.location.origin}/ectron-logo.png`} alt="ECTRON" style={{ height: 38 }} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: C.navy }}>{L("تقرير الإنتاج للإدارة", "Management Production Report")}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {L("عدادات ثلاثية الطور — العقد 300,000 عداد", "3-Phase smart meters — 300,000-unit contract")}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: C.text, textAlign: isArabic ? "left" : "right", lineHeight: 1.6 }}>
                <div>
                  <b>{L("البيانات حتى:", "Data up to:")}</b> {fmtDate(d.lastCompleteDate, isArabic)}
                </div>
                <div>
                  <b>{L("تاريخ الإصدار:", "Issued:")}</b> {fmtDate(d.todayStr, isArabic)}
                </div>
                <div>
                  <b>{L("أصدره:", "Issued by:")}</b> {user?.name || "—"}
                </div>
              </div>
            </div>

            {/* Executive summary */}
            <div style={{ marginTop: 10, border: `1px solid ${status}66`, background: `${status}0d`, borderInlineStart: `5px solid ${status}`, borderRadius: 6, padding: "7px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <b style={{ fontSize: 12.5, color: C.navy }}>{L("الملخص التنفيذي", "Executive summary")}</b>
                <StatusChip color={status}>{statusText}</StatusChip>
              </div>
              {summary.map((s, i) => (
                <div key={i} style={{ fontSize: 12 }}>• {s}</div>
              ))}
            </div>

            {/* KPIs */}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Kpi label={L("الإنجاز الكلي", "Total completed")} value={`${overallPct.toFixed(1)}%`} sub={`${num(f.completed)} / ${num(f.total)}`} />
              <Kpi
                label={L("آخر يوم", "Last day")}
                value={num(dayTotal)}
                color={pctColor((dayTotal / target) * 100)}
                sub={`${L("الهدف", "Target")} ${num(target)} · ☀️ ${num(day.Morning)} · 🌙 ${num(day.Evening)}`}
              />
              <Kpi
                label={L("متوسط آخر 7 أيام", "7-day average")}
                value={num(last7.length ? w7 / last7.length : 0)}
                color={pctColor(w7Target ? (w7 / w7Target) * 100 : 0)}
                sub={L(`مقابل ${num(target)} يومياً`, `vs ${num(target)}/day`)}
              />
              <Kpi
                label={L("الانتهاء المتوقع", "Expected finish")}
                value={f.remaining === 0 ? L("مكتمل", "Done") : fmtDate(f.projectedFinish, isArabic)}
                color={status}
                text
                sub={`${L("المخطط", "Planned")} ${fmtDate(f.plannedFinish, isArabic)}`}
              />
            </div>

            {/* 1. Production vs target */}
            <div style={sx.h2}>1. {L("الإنتاج مقابل الهدف", "Production vs target")}</div>
            <table style={sx.table}>
              <thead>
                <tr>
                  <th style={sx.th}>{L("الفترة", "Period")}</th>
                  <th style={{ ...sx.th, textAlign: "center" }}>{L("الهدف", "Target")}</th>
                  <th style={{ ...sx.th, textAlign: "center" }}>{L("الفعلي", "Actual")}</th>
                  <th style={{ ...sx.th, textAlign: "center" }}>{L("الفرق", "Difference")}</th>
                  <th style={{ ...sx.th, textAlign: "center" }}>{L("الإنجاز", "Achieved")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pct = r.target ? (r.actual / r.target) * 100 : 0;
                  const diff = r.actual - r.target;
                  return (
                    <tr key={r.label}>
                      <td style={{ ...sx.td, fontWeight: 600 }}>{r.label}</td>
                      <td style={{ ...sx.td, ...sx.numCell, fontWeight: 500 }}>{num(r.target)}</td>
                      <td style={{ ...sx.td, ...sx.numCell }}>{num(r.actual)}</td>
                      <td style={{ ...sx.td, ...sx.numCell, color: diff >= 0 ? C.good : C.bad }}>
                        {diff >= 0 ? "+" : "−"}
                        {num(Math.abs(diff))}
                      </td>
                      <td style={{ ...sx.td, textAlign: "center" }}>
                        <StatusChip color={pctColor(pct)}>{pct.toFixed(0)}%</StatusChip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9.5, color: C.muted, marginBottom: 2 }}>
                {L("الإنتاج اليومي لآخر 14 يوم — الخط الأحمر المتقطع = الهدف اليومي", "Daily output, last 14 days — red dashed line = daily target")}
              </div>
              <MiniBars series={d.dailySeries} target={target} />
            </div>

            {/* 2. Operations */}
            <div style={sx.h2}>2. {L("مؤشرات التشغيل", "Operational indicators")}</div>
            <table style={sx.table}>
              <thead>
                <tr>
                  <th style={{ ...sx.th, width: "24%" }}>{L("المؤشر", "Indicator")}</th>
                  <th style={sx.th}>{L("الوضع", "Status")}</th>
                  <th style={{ ...sx.th, width: "14%", textAlign: "center" }}>{L("التقييم", "Rating")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...sx.td, fontWeight: 600 }}>{L("مخزون الكيت", "Kit stock")}</td>
                  <td style={sx.td}>
                    {L(
                      `متبقي ${num(d.kitRunwayMetrics.remaining)} كيت يكفي ${kitDays} يوم بمعدل ${num(d.kitRunwayMetrics.dailyRate)} يومياً${nextKit != null ? ` · الدفعة القادمة بعد ${nextKit} يوم` : " · لا توجد دفعة قادمة مسجلة"}`,
                      `${num(d.kitRunwayMetrics.remaining)} kits left, ${kitDays} days at ${num(d.kitRunwayMetrics.dailyRate)}/day${nextKit != null ? ` · next delivery in ${nextKit} days` : " · no delivery scheduled"}`,
                    )}
                  </td>
                  <td style={{ ...sx.td, textAlign: "center" }}>
                    {nextKit != null && kitDays < nextKit ? (
                      <StatusChip color={C.bad}>{L("نقص متوقع", "Shortage risk")}</StatusChip>
                    ) : kitDays < 14 ? (
                      <StatusChip color={C.warn}>{L("منخفض", "Low")}</StatusChip>
                    ) : (
                      <StatusChip color={C.good}>{L("كافٍ", "OK")}</StatusChip>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ ...sx.td, fontWeight: 600 }}>{L("التوقفات (آخر 7 أيام)", "Downtime (last 7 days)")}</td>
                  <td style={sx.td}>
                    {L(`${num(dt.weekMinutes)} دقيقة`, `${num(dt.weekMinutes)} min`)}
                    {dt.topStage7 ? L(` · أكثرها في ${stageName(dt.topStage7.stage, true)} (${num(dt.topStage7.minutes)} دقيقة)`, ` · mostly at ${stageName(dt.topStage7.stage, false)} (${num(dt.topStage7.minutes)} min)`) : ""}
                  </td>
                  <td style={{ ...sx.td, textAlign: "center" }}>
                    <StatusChip color={dt.weekMinutes >= 300 ? C.bad : dt.weekMinutes >= 120 ? C.warn : C.good}>
                      {dt.weekMinutes >= 300 ? L("مرتفع", "High") : dt.weekMinutes >= 120 ? L("متوسط", "Medium") : L("منخفض", "Low")}
                    </StatusChip>
                  </td>
                </tr>
                <tr>
                  <td style={{ ...sx.td, fontWeight: 600 }}>{L("العدادات المعطلة", "Defective meters")}</td>
                  <td style={sx.td}>
                    {L(
                      `${num(d.defectMetrics.liveLoggedDefects)} عداد لم يعد للخط (تحت الفحص / الإصلاح / هالك)`,
                      `${num(d.defectMetrics.liveLoggedDefects)} meters not back on the line (inspection / repair / scrap)`,
                    )}
                  </td>
                  <td style={{ ...sx.td, textAlign: "center" }}>—</td>
                </tr>
                <tr>
                  <td style={{ ...sx.td, fontWeight: 600 }}>{L("الباتشات والتسليم لنماء", "Batches & delivery to Nama")}</td>
                  <td style={sx.td}>
                    {L(
                      `تم التسليم: ${delivered.length} باتش (${num(sumQty(delivered))} عداد) · قيد الفحص FAT: ${inFat.length} (${num(sumQty(inFat))}) · محدد: ${defined.length} (${num(sumQty(defined))})`,
                      `Delivered: ${delivered.length} batches (${num(sumQty(delivered))} meters) · Under FAT: ${inFat.length} (${num(sumQty(inFat))}) · Defined: ${defined.length} (${num(sumQty(defined))})`,
                    )}
                  </td>
                  <td style={{ ...sx.td, textAlign: "center" }}>—</td>
                </tr>
              </tbody>
            </table>

            {/* 3. Quality */}
            {top3.length > 0 && (
              <>
                <div style={sx.h2}>3. {L("أكثر أعطال الجودة تكراراً", "Most frequent quality failures")}</div>
                <table style={sx.table}>
                  <thead>
                    <tr>
                      <th style={{ ...sx.th, width: "8%", textAlign: "center" }}>#</th>
                      <th style={sx.th}>{L("كود العطل", "Failure code")}</th>
                      <th style={sx.th}>{L("المحطة", "Station")}</th>
                      <th style={{ ...sx.th, textAlign: "center" }}>{L("الحالات", "Cases")}</th>
                      <th style={{ ...sx.th, textAlign: "center" }}>{L("النسبة من العيوب", "Share")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top3.map((it) => (
                      <tr key={it.code}>
                        <td style={{ ...sx.td, textAlign: "center", fontWeight: 800 }}>{it.rank}</td>
                        <td style={{ ...sx.td, ...sx.numCell, textAlign: "start" }}>{it.code}</td>
                        <td style={sx.td}>{it.stationBadge}</td>
                        <td style={{ ...sx.td, ...sx.numCell }}>{num(it.qty)}</td>
                        <td style={{ ...sx.td, ...sx.numCell }}>{it.pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* 4. Points for management */}
            <div style={sx.h2}>
              {top3.length > 0 ? 4 : 3}. {L("نقاط تحتاج قرار أو متابعة", "Points for decision / follow-up")}
            </div>
            {alerts.length === 0 ? (
              <div style={{ color: C.good, fontWeight: 700 }}>✓ {L("لا توجد نقاط حرجة — العمل يسير حسب الخطة.", "No critical points — work is on plan.")}</div>
            ) : (
              <ol style={{ margin: 0, paddingInlineStart: 20 }}>
                {alerts.map((a, i) => (
                  <li key={i} style={{ marginBottom: 3, color: a.level === "bad" ? C.bad : C.text, fontWeight: a.level === "bad" ? 700 : 500 }}>
                    {a.text}
                  </li>
                ))}
              </ol>
            )}

            {/* Signatures */}
            <div className="report-sign-block" style={{ display: "flex", gap: 24, marginTop: 12 }}>
              {[L("أعده", "Prepared by"), L("راجعه", "Reviewed by"), L("اعتمده", "Approved by")].map((t) => (
                <div key={t} style={{ flex: 1, textAlign: "center", fontSize: 11 }}>
                  <div style={{ fontWeight: 700, color: C.text }}>{t}</div>
                  <div style={{ height: 22 }} />
                  <div style={{ borderTop: `1px solid ${C.muted}`, paddingTop: 3, color: C.muted }}>{L("الاسم / التوقيع / التاريخ", "Name / Signature / Date")}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, paddingTop: 5, borderTop: `1px solid ${C.border}`, fontSize: 9.5, color: C.muted, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>
                {L(
                  `الهدف ${num(target)} عداد يومياً، 7 أيام في الأسبوع. اليوم يُحتسب بعد اكتمال الورديتين.`,
                  `Target ${num(target)} meters/day, 7 days a week. A day counts once both shifts are complete.`,
                )}
              </span>
              <span>ECTRON Production Control</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
