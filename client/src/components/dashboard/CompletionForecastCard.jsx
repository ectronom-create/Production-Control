import { CalendarCheck, TrendingUp, TrendingDown, Target, Gauge } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function fmtDate(dStr, isArabic) {
  if (!dStr) return "—";
  const [y, m, d] = dStr.split("-").map(Number);
  return `${d} ${(isArabic ? MONTHS_AR : MONTHS_EN)[m - 1]} ${y}`;
}

const n = (v) => Math.round(v || 0).toLocaleString("en-US");

function Tile({ icon: Icon, label, value, sub, color = "var(--navy)" }) {
  return (
    <div
      style={{
        flex: "1 1 200px",
        background: "var(--gray-50)",
        border: "1px solid var(--gray-200)",
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.76rem", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        <Icon size={15} color={color} /> {label}
      </div>
      <div style={{ fontSize: "1.45rem", fontWeight: 900, color, marginTop: 6, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.78rem", color: "var(--gray-600)", marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

export default function CompletionForecastCard({ forecast: f }) {
  const { isArabic } = useLanguage();
  const L = (ar, en) => (isArabic ? ar : en);
  if (!f) return null;

  const done = f.remaining === 0;
  const ahead = f.variance >= 0;
  const statusColor = done ? "#16a34a" : f.onTrack ? "#16a34a" : f.slipDays != null && f.slipDays <= 14 ? "#d97706" : "#dc2626";

  let headline;
  if (done) headline = L("✅ تم إنجاز الكمية الكاملة", "✅ Full quantity completed");
  else if (f.projectedFinish == null)
    headline = L("لا يوجد إنتاج في آخر 7 أيام — لا يمكن حساب التوقع", "No output in the last 7 days — cannot forecast");
  else if (f.onTrack)
    headline = L(
      `على المسار — متوقع الانتهاء قبل الموعد بـ ${Math.abs(f.slipDays)} يوم`,
      `On track — expected ${Math.abs(f.slipDays)} day(s) before plan`,
    );
  else
    headline = L(
      `متأخر — متوقع الانتهاء بعد الموعد بـ ${f.slipDays} يوم`,
      `Behind — expected ${f.slipDays} day(s) after plan`,
    );

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: "22px 26px",
        border: "1px solid #e2e8f0",
        borderInlineStart: `5px solid ${statusColor}`,
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: "1.1rem", color: "var(--navy)" }}>
            <CalendarCheck size={22} color="var(--teal)" />
            {L("توقع موعد الانتهاء", "Completion Forecast")}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginTop: 4 }}>
            {L(
              `الهدف ${n(f.dailyTarget)} عداد يومياً، 7 أيام في الأسبوع بدون عطل — بداية المشروع ${fmtDate(f.projectStart, true)} — محسوب حتى ${fmtDate(f.lastDataDate, true)}`,
              `Target ${n(f.dailyTarget)} meters/day, 7 days a week, no holidays — project start ${fmtDate(f.projectStart)} — calculated up to ${fmtDate(f.lastDataDate)}`,
            )}
          </div>
          {f.openingLumpDate && (
            <div style={{ fontSize: "0.76rem", color: "var(--gray-500)", marginTop: 2 }}>
              {L(
                `إنتاج ${fmtDate(f.projectStart, true)} – ${fmtDate(f.openingLumpDate, true)} مرفوع كإجمالي واحد بتاريخ ${fmtDate(f.openingLumpDate, true)}، ومحسوب ضمن المنجز.`,
                `Output from ${fmtDate(f.projectStart)} to ${fmtDate(f.openingLumpDate)} was uploaded as one total on ${fmtDate(f.openingLumpDate)} and is included.`,
              )}
            </div>
          )}
        </div>
        <div style={{ fontWeight: 800, color: statusColor, background: `${statusColor}12`, border: `1px solid ${statusColor}44`, padding: "6px 14px", borderRadius: 999, fontSize: "0.88rem" }}>
          {headline}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Tile
          icon={Target}
          label={L("الموعد المخطط", "Planned finish")}
          value={fmtDate(f.plannedFinish, isArabic)}
          sub={L(`${n(f.total)} ÷ ${n(f.dailyTarget)} = ${n(f.plannedDays)} يوم`, `${n(f.total)} ÷ ${n(f.dailyTarget)} = ${n(f.plannedDays)} days`)}
          color="var(--navy)"
        />
        <Tile
          icon={CalendarCheck}
          label={L("الانتهاء المتوقع (بالمعدل الحالي)", "Expected finish (current pace)")}
          value={done ? L("مكتمل", "Done") : fmtDate(f.projectedFinish, isArabic)}
          sub={
            done
              ? ""
              : L(
                  `بمعدل آخر 7 أيام: ${n(f.recentRate)} عداد/يوم. لو التزمنا بـ ${n(f.dailyTarget)} من الآن: ${fmtDate(f.finishAtTargetRate, true)}`,
                  `At last-7-day pace: ${n(f.recentRate)}/day. At ${n(f.dailyTarget)}/day from now: ${fmtDate(f.finishAtTargetRate)}`,
                )
          }
          color={statusColor}
        />
        <Tile
          icon={ahead ? TrendingUp : TrendingDown}
          label={L("مقارنة بالخطة حتى الآن", "Vs plan so far")}
          value={`${ahead ? "+" : "−"}${n(Math.abs(f.variance))}`}
          sub={L(
            `${ahead ? "متقدمين" : "متأخرين"} بما يعادل ${Math.abs(f.varianceDays).toFixed(1)} يوم إنتاج. المنجز ${n(f.completedToDate)} من المطلوب ${n(f.targetToDate)} خلال ${f.elapsedDays} يوم`,
            `${ahead ? "Ahead" : "Behind"} by ${Math.abs(f.varianceDays).toFixed(1)} production days. Done ${n(f.completedToDate)} of ${n(f.targetToDate)} required in ${f.elapsedDays} days`,
          )}
          color={ahead ? "#16a34a" : "#dc2626"}
        />
        <Tile
          icon={Gauge}
          label={L("المطلوب يومياً للحاق بالموعد", "Needed per day to hit plan")}
          value={done ? "—" : f.daysLeftToPlan > 0 ? n(f.requiredRate) : L("فات الموعد", "Past due")}
          sub={
            done
              ? ""
              : L(
                  `المتبقي ${n(f.remaining)} عداد في ${Math.max(0, f.daysLeftToPlan)} يوم${f.requiredRate > f.dailyTarget ? ` — أعلى من الهدف بـ ${n(f.requiredRate - f.dailyTarget)}` : ""}`,
                  `${n(f.remaining)} left in ${Math.max(0, f.daysLeftToPlan)} days${f.requiredRate > f.dailyTarget ? ` — ${n(f.requiredRate - f.dailyTarget)} above target` : ""}`,
                )
          }
          color={f.requiredRate > f.dailyTarget ? "#dc2626" : "#16a34a"}
        />
      </div>
    </div>
  );
}
