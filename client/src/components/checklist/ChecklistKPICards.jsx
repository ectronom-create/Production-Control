import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function ChecklistKPICards({ stats, isArabic, t }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: 10,
        marginBottom: 16,
      }}
    >
      {/* 1. Readiness Score */}
      <div
        style={{
          background: "var(--white)",
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background:
              stats.overallStatus === "LINE_CLEARED_PASS"
                ? "#dcfce7"
                : stats.overallStatus === "CRITICAL_BLOCKER"
                  ? "#fee2e2"
                  : "#e0f2fe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {stats.overallStatus === "LINE_CLEARED_PASS" ? (
            <ShieldCheck size={20} color="#16a34a" />
          ) : stats.overallStatus === "CRITICAL_BLOCKER" ? (
            <AlertTriangle size={20} color="#dc2626" />
          ) : (
            <Clock size={20} color="#0284c7" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 800,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {t("lineReadinessScore")}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: "1.35rem",
                fontWeight: 900,
                color:
                  stats.overallStatus === "LINE_CLEARED_PASS"
                    ? "#16a34a"
                    : stats.overallStatus === "CRITICAL_BLOCKER"
                      ? "#dc2626"
                      : "var(--navy)",
              }}
            >
              {stats.readinessPct}%
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color:
                  stats.overallStatus === "LINE_CLEARED_PASS"
                    ? "#16a34a"
                    : stats.overallStatus === "CRITICAL_BLOCKER"
                      ? "#dc2626"
                      : "#64748b",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {stats.overallStatus === "LINE_CLEARED_PASS"
                ? isArabic
                  ? "جاهز"
                  : "Ready"
                : stats.overallStatus === "CRITICAL_BLOCKER"
                  ? isArabic
                    ? "مانع حرج"
                    : "Blocker"
                  : isArabic
                    ? "قيد الفحص"
                    : "Pending"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Verified PASS */}
      <div
        style={{
          background: "var(--white)",
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CheckCircle2 size={20} color="#16a34a" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 800,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {t("verifiedPass")}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{ fontSize: "1.35rem", fontWeight: 900, color: "#16a34a" }}
            >
              {stats.passedCount}
            </span>
            <span
              style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8" }}
            >
              / {stats.total}
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#16a34a",
                marginInlineStart: "auto",
              }}
            >
              {isArabic ? "مطابق" : "Pass"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Failed / Issues */}
      <div
        style={{
          background: "var(--white)",
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: stats.failedCount > 0 ? "#fee2e2" : "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <XCircle
            size={20}
            color={stats.failedCount > 0 ? "#dc2626" : "#64748b"}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 800,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {t("failedIssues")}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: "1.35rem",
                fontWeight: 900,
                color: stats.failedCount > 0 ? "#dc2626" : "#64748b",
              }}
            >
              {stats.failedCount}
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: stats.failedCount > 0 ? "#dc2626" : "#64748b",
                marginInlineStart: "auto",
              }}
            >
              {stats.failedCount > 0
                ? isArabic
                  ? "يتطلب معالجة"
                  : "Issues"
                : isArabic
                  ? "لا معوقات"
                  : "Zero"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Remaining Pending */}
      <div
        style={{
          background: "var(--white)",
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: stats.pendingCount > 0 ? "#fef3c7" : "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Clock
            size={20}
            color={stats.pendingCount > 0 ? "#d97706" : "#16a34a"}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 800,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {t("remainingPending")}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: "1.35rem",
                fontWeight: 900,
                color: stats.pendingCount > 0 ? "#d97706" : "#16a34a",
              }}
            >
              {stats.pendingCount}
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: stats.pendingCount > 0 ? "#d97706" : "#16a34a",
                marginInlineStart: "auto",
              }}
            >
              {stats.pendingCount === 0
                ? isArabic
                  ? "مكتمل"
                  : "All done"
                : isArabic
                  ? "متبقي"
                  : "Pending"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
