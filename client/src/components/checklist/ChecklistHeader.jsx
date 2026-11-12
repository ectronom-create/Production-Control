import React from "react";
import {
  Printer,
  CheckCircle2,
  Save,
  Users,
  Clock,
  Calendar,
} from "lucide-react";

export default function ChecklistHeader({
  activeDate,
  setActiveDate,
  activeShift,
  setActiveShift,
  supervisorName,
  setSupervisorName,
  stats,
  isSaving,
  isViewer,
  markAllPass,
  handleSaveChecklist,
  openPrintModal,
  isArabic,
  t,
}) {
  return (
    <div
      className="card-white"
      style={{
        padding: "16px 20px",
        border: "1px solid #cbd5e1",
        boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: 14,
        }}
      >
        {/* Logo & Form Details */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/ectron-logo.png"
            alt="ECTRON"
            style={{ height: 38, objectFit: "contain" }}
          />
          <div
            style={{
              borderLeft: isArabic ? "none" : "2px solid #cbd5e1",
              borderRight: isArabic ? "2px solid #cbd5e1" : "none",
              paddingLeft: isArabic ? 0 : 14,
              paddingRight: isArabic ? 14 : 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.18rem",
                  fontWeight: 900,
                  color: "var(--navy)",
                }}
              >
                {t("checklistTitle")}
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  background: "#e0f2fe",
                  color: "#0369a1",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                Form No: PSM-CHK-06-2026
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  background: "#f1f5f9",
                  color: "#475569",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                Rev: 00
              </span>
            </div>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "0.78rem",
                color: "#64748b",
              }}
            >
              {t("checklistSubtitle")}
            </p>
          </div>
        </div>

        {/* Quick Header Buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => openPrintModal(null)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
            }}
          >
            <Printer size={15} /> {t("printForm")}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={markAllPass}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderColor: "#10b981",
              color: "#047857",
              fontWeight: 800,
              fontSize: "0.82rem",
            }}
          >
            <CheckCircle2 size={16} /> {t("quickMarkAllPass")}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={isSaving || isViewer}
            onClick={handleSaveChecklist}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background:
                stats.overallStatus === "CRITICAL_BLOCKER"
                  ? "#ef4444"
                  : stats.overallStatus === "LINE_CLEARED_PASS"
                    ? "#10b981"
                    : "#0284c7",
              borderColor: "transparent",
              fontWeight: 800,
              fontSize: "0.85rem",
            }}
          >
            <Save size={16} />
            {isSaving ? t("signingOff") : t("signOffLine")}
          </button>
        </div>
      </div>

      {/* Metadata Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          paddingTop: 14,
        }}
      >
        {/* Supervisor */}
        <div>
          <label
            style={{
              fontSize: "0.74rem",
              fontWeight: 800,
              color: "var(--navy)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: 4,
            }}
          >
            <Users size={13} color="#7c3aed" /> {t("supervisor")}:
          </label>
          <input
            type="text"
            className="search-input"
            value={supervisorName}
            onChange={(e) => setSupervisorName(e.target.value)}
            placeholder={isArabic ? "اسم المشرف" : "Supervisor name"}
            style={{ fontWeight: 700, fontSize: "0.84rem" }}
          />
        </div>

        {/* Shift */}
        <div>
          <label
            style={{
              fontSize: "0.74rem",
              fontWeight: 800,
              color: "var(--navy)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: 4,
            }}
          >
            <Clock size={13} color="#d97706" /> {t("shift")}:
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "Day", label: isArabic ? "نهاري" : "Day", icon: "☀️" },
              { key: "Night", label: isArabic ? "ليلي" : "Night", icon: "🌙" },
            ].map((sh) => (
              <button
                key={sh.key}
                type="button"
                onClick={() => setActiveShift(sh.key)}
                style={{
                  flex: 1,
                  padding: "7px 12px",
                  borderRadius: 6,
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  border:
                    activeShift === sh.key
                      ? "2px solid #0284c7"
                      : "1px solid #cbd5e1",
                  background: activeShift === sh.key ? "#e0f2fe" : "#ffffff",
                  color: activeShift === sh.key ? "#0369a1" : "#64748b",
                }}
              >
                {sh.icon} {sh.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label
            style={{
              fontSize: "0.74rem",
              fontWeight: 800,
              color: "var(--navy)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: 4,
            }}
          >
            <Calendar size={13} color="#dc2626" /> {t("date")}:
          </label>
          <input
            type="date"
            className="search-input"
            value={activeDate}
            onChange={(e) => setActiveDate(e.target.value)}
            style={{ fontWeight: 700, fontSize: "0.84rem" }}
          />
        </div>
      </div>
    </div>
  );
}
