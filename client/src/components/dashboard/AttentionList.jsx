import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { findStage } from "../../constants/defectStages";
import { C, card, sectionTitle, fmtDate, num, tint } from "./dashTheme";

const stageName = (id, isArabic) => {
  const s = id ? findStage(id) : null;
  return s ? (isArabic ? s.arabic : s.name) : id || "—";
};

// Turns the dashboard numbers into a short list of plain-language alerts
export function buildAlerts({ forecast: f, shiftTotals, lastCompleteDate, shiftTarget, downtime, kitRunway, kitMetrics, topDefects, isArabic }) {
  const L = (ar, en) => (isArabic ? ar : en);
  const out = [];
  const add = (level, text) => out.push({ level, text });
  const dayLbl = fmtDate(lastCompleteDate, isArabic, false);

  // 1. Line stopped right now
  if (downtime.ongoing.length) {
    add("bad", L(
      `الخط متوقف الآن في: ${downtime.ongoing.map((s) => stageName(s, true)).join("، ")}`,
      `Line stopped now at: ${downtime.ongoing.map((s) => stageName(s, false)).join(", ")}`,
    ));
  }

  // 2. Last day by shift
  const day = shiftTotals[lastCompleteDate];
  const beforeStart = f?.projectStart && lastCompleteDate < f.projectStart;
  if (beforeStart) {
    // The line has not started yet (e.g. a new line with no reports): nothing is missing.
  } else if (!day) {
    add("bad", L(`لا يوجد أي تقرير إنتاج ليوم ${dayLbl}`, `No production report for ${dayLbl}`));
  } else {
    [["Morning", "☀️", "الصباحية", "Morning"], ["Evening", "🌙", "المسائية", "Evening"]].forEach(([k, ic, ar, en]) => {
      const v = day[k];
      const pct = shiftTarget ? (v / shiftTarget) * 100 : 0;
      if (v === 0) add("bad", L(`${ic} الوردية ${ar} يوم ${dayLbl}: لا يوجد تقرير`, `${ic} ${en} shift ${dayLbl}: no report`));
      else if (pct < 85) add(pct < 70 ? "bad" : "warn", L(`${ic} الوردية ${ar} يوم ${dayLbl}: ${num(v)} من ${num(shiftTarget)} (${pct.toFixed(0)}%)`, `${ic} ${en} shift ${dayLbl}: ${num(v)} of ${num(shiftTarget)} (${pct.toFixed(0)}%)`));
      else if (pct >= 100) add("good", L(`${ic} الوردية ${ar} يوم ${dayLbl}: ${num(v)} من ${num(shiftTarget)} ✓`, `${ic} ${en} shift ${dayLbl}: ${num(v)} of ${num(shiftTarget)} ✓`));
    });
  }

  // 3. Downtime
  if (downtime.lastDayMinutes >= 30) {
    add(downtime.lastDayMinutes >= 90 ? "bad" : "warn", L(
      `توقفات يوم ${dayLbl}: ${num(downtime.lastDayMinutes)} دقيقة`,
      `Downtime on ${dayLbl}: ${num(downtime.lastDayMinutes)} min`,
    ));
  }
  if (downtime.topStage7 && downtime.topStage7.minutes >= 60) {
    add("warn", L(
      `أكثر محطة توقفاً آخر 7 أيام: ${stageName(downtime.topStage7.stage, true)} (${num(downtime.topStage7.minutes)} دقيقة)`,
      `Most downtime last 7 days: ${stageName(downtime.topStage7.stage, false)} (${num(downtime.topStage7.minutes)} min)`,
    ));
  }

  // 4. Catch-up needed
  if (f.remaining > 0 && f.daysLeftToPlan > 0 && f.requiredRate > f.dailyTarget * 1.02) {
    add(f.requiredRate > f.dailyTarget * 1.15 ? "bad" : "warn", L(
      `للحاق بالموعد نحتاج ${num(f.requiredRate)} يومياً بدل ${num(f.dailyTarget)}`,
      `To meet the plan we need ${num(f.requiredRate)}/day instead of ${num(f.dailyTarget)}`,
    ));
  }

  // 5. Kit supply
  const runway = Math.floor(kitRunway.runwayDays || 0);
  const next = kitMetrics.nearestIncomingDays;
  if (kitRunway.received > 0) {
    if (next != null && runway < next) {
      add("bad", L(`الكيت يكفي ${runway} يوم والدفعة القادمة بعد ${next} يوم`, `Kits last ${runway} days, next delivery in ${next} days`));
    } else if (next == null && runway < 14) {
      add(runway < 7 ? "bad" : "warn", L(`الكيت يكفي ${runway} يوم ولا توجد دفعة قادمة مسجلة`, `Kits last ${runway} days and no delivery is scheduled`));
    }
  }

  // 6. Dominant defect code
  const top = topDefects?.top4?.[0];
  if (top && top.pct >= 25) {
    add("warn", L(
      `كود العطل ${top.code} في ${top.stationBadge} = ${top.pct.toFixed(0)}% من العيوب`,
      `Defect code ${top.code} at ${top.stationBadge} = ${top.pct.toFixed(0)}% of defects`,
    ));
  }

  const rank = { bad: 0, warn: 1, good: 2 };
  out.sort((a, b) => rank[a.level] - rank[b.level]);
  return out.slice(0, 6);
}

const ICON = { bad: AlertOctagon, warn: AlertTriangle, good: CheckCircle2 };
const COLOR = { bad: C.bad, warn: C.warn, good: C.good };

export default function AttentionList(props) {
  const { isArabic } = useLanguage();
  const alerts = buildAlerts({ ...props, isArabic });
  const problems = alerts.filter((a) => a.level !== "good").length;

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={sectionTitle}>{isArabic ? "يحتاج انتباه" : "Needs attention"}</h3>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: problems ? C.bad : C.good }}>
          {problems ? (isArabic ? `${problems} تنبيه` : `${problems} alert(s)`) : isArabic ? "لا يوجد" : "None"}
        </span>
      </div>
      {alerts.length === 0 || problems === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.good, fontWeight: 700, padding: "8px 0" }}>
          <CheckCircle2 size={18} /> {isArabic ? "كل شيء ماشي حسب الخطة" : "Everything is on plan"}
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map((a, i) => {
          const Icon = ICON[a.level];
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: tint(COLOR[a.level]), color: C.text, fontSize: "0.88rem", fontWeight: 600, lineHeight: 1.5 }}>
              <Icon size={18} color={COLOR[a.level]} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{a.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
