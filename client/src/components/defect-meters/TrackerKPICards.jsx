import React from "react";
import { Scan, Wrench, CheckCircle2, AlertTriangle } from "lucide-react";

export default function TrackerKPICards({ trackerKPIs, isArabic }) {
  const recoveryPct =
    trackerKPIs.total > 0
      ? Math.round((trackerKPIs.returnedToLine / trackerKPIs.total) * 100)
      : 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: 16,
      }}
    >
      {/* KPI 1: Total Defective Meters */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
          borderRadius: 14,
          border: "1.5px solid #bae6fd",
          borderTop: "4px solid #0284c7",
          padding: "18px 20px",
          boxShadow: "0 4px 16px rgba(2, 132, 199, 0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#e0f2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0284c7",
              }}
            >
              <Scan size={22} />
            </div>
            <span
              style={{
                fontSize: "0.70rem",
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: 999,
                background: "#e0f2fe",
                color: "#0369a1",
              }}
            >
              {isArabic ? "سجل الرصد" : "Total Intake"}
            </span>
          </div>

          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: 800,
              color: "#475569",
              marginTop: 12,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {isArabic ? "إجمالي العدادات المعطلة" : "Total Defective Meters"}
          </div>

          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: 900,
              color: "#0369a1",
              lineHeight: 1.15,
              marginTop: 4,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
            }}
          >
            {trackerKPIs.total}
            <span
              style={{ fontSize: "0.84rem", fontWeight: 700, color: "#64748b" }}
            >
              {isArabic ? "عداد" : "units"}
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: "0.74rem",
            color: "#64748b",
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid #e0f2fe",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#0284c7",
              display: "inline-block",
            }}
          />
          <span>
            {trackerKPIs.isFiltered
              ? isArabic
                ? `مفلترة (${trackerKPIs.total} من أصل ${trackerKPIs.allLifetimeTotal})`
                : `Filtered (${trackerKPIs.total} of ${trackerKPIs.allLifetimeTotal})`
              : isArabic
                ? "جميع الحالات المسجلة بالباركود"
                : "All barcode-scanned intakes"}
          </span>
        </div>
      </div>

      {/* KPI 2: Active Under Repair */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
          borderRadius: 14,
          border: "1.5px solid #fde68a",
          borderTop: "4px solid #f59e0b",
          padding: "18px 20px",
          boxShadow: "0 4px 16px rgba(217, 119, 6, 0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d97706",
              }}
            >
              <Wrench size={22} />
            </div>
            <span
              style={{
                fontSize: "0.70rem",
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: 999,
                background: "#fef3c7",
                color: "#92400e",
              }}
            >
              {isArabic ? "⏳ جاري الإصلاح" : "In Rework"}
            </span>
          </div>

          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: 800,
              color: "#475569",
              marginTop: 12,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {isArabic ? "قيد المعاينة والإصلاح حالياً" : "Active Under Repair"}
          </div>

          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: 900,
              color: "#b45309",
              lineHeight: 1.15,
              marginTop: 4,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
            }}
          >
            {trackerKPIs.underInspection}
            <span
              style={{ fontSize: "0.84rem", fontWeight: 700, color: "#92400e" }}
            >
              {isArabic ? "قيد الفحص" : "in shop"}
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: "0.74rem",
            color: "#b45309",
            fontWeight: 700,
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid #fef3c7",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#d97706",
              display: "inline-block",
            }}
          />
          <span>
            {isArabic
              ? "بانتظار الصيانة أو إعادة الاختبار"
              : "Awaiting rework / re-test"}
          </span>
        </div>
      </div>

      {/* KPI 3: Repaired & Returned */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
          borderRadius: 14,
          border: "1.5px solid #bbf7d0",
          borderTop: "4px solid #10b981",
          padding: "18px 20px",
          boxShadow: "0 4px 16px rgba(16, 185, 129, 0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#059669",
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <span
              style={{
                fontSize: "0.70rem",
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: 999,
                background: "#dcfce7",
                color: "#166534",
              }}
            >
              {recoveryPct}% {isArabic ? "استعادة" : "Recovery"}
            </span>
          </div>

          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: 800,
              color: "#475569",
              marginTop: 12,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {isArabic ? "تم الإصلاح وعاد للإنتاج" : "Repaired & Returned"}
          </div>

          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: 900,
              color: "#15803d",
              lineHeight: 1.15,
              marginTop: 4,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
            }}
          >
            {trackerKPIs.returnedToLine}
            <span
              style={{ fontSize: "0.84rem", fontWeight: 700, color: "#166534" }}
            >
              {isArabic ? "مستعاد للخط" : "recovered"}
            </span>
          </div>
        </div>

        <div>
          <div
            style={{
              width: "100%",
              height: 6,
              background: "#e2e8f0",
              borderRadius: 4,
              marginTop: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, recoveryPct)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                borderRadius: 4,
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "0.74rem",
              color: "#15803d",
              fontWeight: 700,
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{isArabic ? "نسبة الاستعادة:" : "Recovery Rate:"}</span>
            <span style={{ fontWeight: 900 }}>{recoveryPct}%</span>
          </div>
        </div>
      </div>

      {/* KPI 4: Recurring Failures */}
      <div
        style={{
          background:
            trackerKPIs.recurringCount > 0
              ? "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          borderRadius: 14,
          border: `1.5px solid ${trackerKPIs.recurringCount > 0 ? "#fca5a5" : "#cbd5e1"}`,
          borderTop: `4px solid ${trackerKPIs.recurringCount > 0 ? "#dc2626" : "#10b981"}`,
          padding: "18px 20px",
          boxShadow:
            trackerKPIs.recurringCount > 0
              ? "0 4px 16px rgba(220, 38, 38, 0.08)"
              : "0 4px 16px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background:
                  trackerKPIs.recurringCount > 0 ? "#fee2e2" : "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: trackerKPIs.recurringCount > 0 ? "#dc2626" : "#10b981",
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <span
              style={{
                fontSize: "0.70rem",
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: 999,
                background:
                  trackerKPIs.recurringCount > 0 ? "#fee2e2" : "#dcfce7",
                color: trackerKPIs.recurringCount > 0 ? "#991b1b" : "#166534",
              }}
            >
              {trackerKPIs.recurringCount > 0
                ? isArabic
                  ? "⚠️ تكرار عطل"
                  : "Repeated"
                : isArabic
                  ? "✅ صفر مكرر"
                  : "Zero Repeat"}
            </span>
          </div>

          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: 800,
              color: "#475569",
              marginTop: 12,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {isArabic ? "عدادات متكررة العطل (2+)" : "Recurring Failures (2+)"}
          </div>

          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: 900,
              color: trackerKPIs.recurringCount > 0 ? "#dc2626" : "#16a34a",
              lineHeight: 1.15,
              marginTop: 4,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
            }}
          >
            {trackerKPIs.recurringCount}
            <span
              style={{
                fontSize: "0.84rem",
                fontWeight: 700,
                color: trackerKPIs.recurringCount > 0 ? "#991b1b" : "#15803d",
              }}
            >
              {isArabic ? "حالة مكررة" : "repeats"}
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: "0.74rem",
            color: trackerKPIs.recurringCount > 0 ? "#b91c1c" : "#15803d",
            fontWeight: 700,
            marginTop: 12,
            paddingTop: 10,
            borderTop:
              trackerKPIs.recurringCount > 0
                ? "1px solid #fee2e2"
                : "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background:
                trackerKPIs.recurringCount > 0 ? "#dc2626" : "#10b981",
              display: "inline-block",
            }}
          />
          <span>
            {trackerKPIs.recurringCount > 0
              ? isArabic
                ? "تتطلب تدخلاً هندسياً حاسماً (دورتان فأكثر)"
                : "Requires engineering root cause"
              : isArabic
                ? "لا توجد عدادات مكررة (أداء ممتاز)"
                : "Zero repeated defectives"}
          </span>
        </div>
      </div>
    </div>
  );
}
