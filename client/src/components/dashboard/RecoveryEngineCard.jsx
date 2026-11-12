import React from "react";
import { TrendingUp, Target, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RecoveryEngineCard({
  recoveryAnalysis,
  availableRecoveryMonths,
  selectedRecoveryMonth,
  setSelectedRecoveryMonth,
  recoveryHorizonDays,
  setRecoveryHorizonDays,
  targets,
}) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #fffdf5 0%, #ffffff 100%)",
        borderRadius: 16,
        padding: "26px 30px",
        border: "1.5px solid #fde68a",
        borderTop: "4px solid #d97706",
        boxShadow:
          "0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#fef3c7",
              border: "1px solid #fde68a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingUp size={24} color="#b45309" />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#78350f",
                letterSpacing: "-0.01em",
              }}
            >
              Monthly Target Performance & Recovery Engine
            </h3>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "0.82rem",
                color: "#92400e",
              }}
            >
              Sprint window: {recoveryAnalysis.fullMonthLabel} •{" "}
              {recoveryAnalysis.totalDaysInMonthWindow} Days Total (
              {recoveryAnalysis.elapsedDays} Days Recorded)
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {/* Month Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#ffffff",
              padding: "6px 12px",
              borderRadius: 8,
              border: "1.5px solid #cbd5e1",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <span
              style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}
            >
              Sprint Month:
            </span>
            <select
              value={selectedRecoveryMonth}
              onChange={(e) => setSelectedRecoveryMonth(e.target.value)}
              style={{
                fontSize: "0.82rem",
                fontWeight: 800,
                color: "var(--navy)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {availableRecoveryMonths.map((ym) => {
                const [y, m] = ym.split("-");
                const mNames = [
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                ];
                const label =
                  ym === "2026-10"
                    ? "October 2026 (2-Oct — 31-Oct)"
                    : `${mNames[parseInt(m, 10) - 1]} ${y} (1-${mNames[parseInt(m, 10) - 1]} — End)`;
                return (
                  <option key={ym} value={ym}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Recovery Horizon / Pace Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#ffffff",
              padding: "6px 12px",
              borderRadius: 8,
              border: "1.5px solid #cbd5e1",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <span
              style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}
            >
              Pace Horizon:
            </span>
            <select
              value={recoveryHorizonDays}
              onChange={(e) => setRecoveryHorizonDays(e.target.value)}
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--navy)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="month_end">
                To Month-End ({recoveryAnalysis.remainingDaysInMonth} Days Left)
              </option>
              <option value="3">3 Days (Urgent Sprint)</option>
              <option value="5">5 Days (Accelerated)</option>
              <option value="7">7 Days (Standard)</option>
              <option value="10">10 Days (Extended)</option>
              <option value="14">14 Days (2 Weeks)</option>
            </select>
          </div>

          <span
            className={`badge ${recoveryAnalysis.isTargetAchieved ? "badge-green" : "badge-red"}`}
            style={{
              fontSize: "0.82rem",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {recoveryAnalysis.isTargetAchieved ? (
              <>
                <CheckCircle2 size={14} color="#15803d" />
                <span>On Track / Target Met</span>
              </>
            ) : (
              <>
                <AlertCircle size={14} color="#b91c1c" />
                <span>
                  Active Deficit: -
                  {recoveryAnalysis.missingTarget.toLocaleString()} Meters
                </span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Dynamic Monthly Progress Bar */}
      <div
        style={{
          margin: "12px 0 22px",
          background: "#ffffff",
          borderRadius: 12,
          padding: "14px 18px",
          border: "1px solid #fde68a",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
            fontSize: "0.84rem",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--navy)" }}>
            {recoveryAnalysis.monthName} Target Progress:{" "}
            <strong style={{ color: "#16a34a" }}>
              {recoveryAnalysis.actualInPeriod.toLocaleString()}
            </strong>{" "}
            / {recoveryAnalysis.monthFullTarget.toLocaleString()} Meters (
            {recoveryAnalysis.monthOverallPct.toFixed(1)}% Completed) •{" "}
            <span style={{ color: "#64748b" }}>
              {recoveryAnalysis.remainingDaysInMonth} days left to month end
            </span>
          </span>
          <span
            style={{
              fontWeight: 800,
              color:
                recoveryAnalysis.achievementRate >= 85
                  ? "#16a34a"
                  : recoveryAnalysis.achievementRate >= 70
                    ? "#b45309"
                    : "#dc2626",
            }}
          >
            {recoveryAnalysis.achievementRate.toFixed(1)}% to Date Pace (
            {recoveryAnalysis.elapsedDays} Days Recorded)
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 10,
            background: "#e2e8f0",
            borderRadius: 9999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, recoveryAnalysis.monthOverallPct)}%`,
              height: "100%",
              background:
                recoveryAnalysis.monthOverallPct >= 75
                  ? "#16a34a"
                  : recoveryAnalysis.monthOverallPct >= 40
                    ? "#f59e0b"
                    : "#3b82f6",
              borderRadius: 9999,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* 4 Cards: Status, Missing, Daily Catchup, Shift Catchup */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            padding: "18px 20px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Month Actual ({recoveryAnalysis.periodLabel})
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 900,
              color: "var(--navy)",
              marginTop: 4,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {recoveryAnalysis.actualInPeriod.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>
            Expected to Date:{" "}
            <b>{recoveryAnalysis.targetInPeriod.toLocaleString()}</b> (
            {recoveryAnalysis.elapsedDays} Days @ 1,300/day)
          </div>
        </div>

        <div
          style={{
            background: "#fef2f2",
            padding: "18px 20px",
            borderRadius: 12,
            border: "1px solid #fee2e2",
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#b91c1c",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Target Deficit (Variance Gap)
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 900,
              color: "#b91c1c",
              marginTop: 4,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {recoveryAnalysis.missingTarget > 0
              ? `-${recoveryAnalysis.missingTarget.toLocaleString()}`
              : "0"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#991b1b", marginTop: 4 }}>
            Remaining to Month Target:{" "}
            <b>{recoveryAnalysis.remainingToMonthTarget.toLocaleString()}</b>{" "}
            meters
          </div>
        </div>

        <div
          style={{
            background: "#fffbeb",
            padding: "18px 20px",
            borderRadius: 12,
            border: "1px solid #fef3c7",
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#b45309",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Required Daily Pace (
            {recoveryHorizonDays === "month_end"
              ? "To Month-End"
              : `${recoveryAnalysis.recoveryDays} Days`}
            )
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 900,
              color: "#b45309",
              marginTop: 4,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {recoveryAnalysis.revisedDailyTarget.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#92400e", marginTop: 4 }}>
            Base 1,300 + <b>{recoveryAnalysis.dailyCatchUp}</b> catch-up/day (
            {recoveryAnalysis.recoveryDays} days left)
          </div>
        </div>

        <div
          style={{
            background: "#ede9fe",
            padding: "18px 20px",
            borderRadius: 12,
            border: "1px solid #ddd6fe",
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#6d28d9",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Required Shift Pace (2 Shifts)
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 900,
              color: "#6d28d9",
              marginTop: 4,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {recoveryAnalysis.revisedShiftTarget.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#5b21b6", marginTop: 4 }}>
            Base 650 + <b>{recoveryAnalysis.shiftCatchUp}</b> meters/shift (2
            shifts/day)
          </div>
        </div>
      </div>

      {/* Narrative Directive Box */}
      <div
        style={{
          background: "#f0fdfa",
          border: "1px solid #99f6e4",
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#ccfbf1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Target size={20} color="#0d9488" />
        </div>
        <div
          style={{ fontSize: "0.86rem", color: "#115e59", lineHeight: 1.55 }}
        >
          <strong style={{ color: "#0f766e" }}>
            Monthly Strategic Directive:
          </strong>{" "}
          {recoveryAnalysis.missingTarget > 0 ? (
            <>
              To achieve the full monthly target of{" "}
              <strong>
                {recoveryAnalysis.monthFullTarget.toLocaleString()} meters
              </strong>{" "}
              for {recoveryAnalysis.monthName} by{" "}
              <strong>{recoveryAnalysis.endDate}</strong>, the remaining{" "}
              <strong>
                {recoveryAnalysis.remainingToMonthTarget.toLocaleString()}{" "}
                meters
              </strong>{" "}
              must be produced at a pace of{" "}
              <strong>
                {recoveryAnalysis.revisedDailyTarget.toLocaleString()}{" "}
                meters/day
              </strong>{" "}
              (or{" "}
              <strong>
                {recoveryAnalysis.revisedShiftTarget.toLocaleString()}{" "}
                meters/shift
              </strong>
              ) across the{" "}
              <strong>{recoveryAnalysis.recoveryDays} operating days</strong>{" "}
              remaining in the month.
            </>
          ) : (
            <>
              The production target for {recoveryAnalysis.monthName} is
              currently on track with no deficit. Continue at the standard rate
              of{" "}
              <strong>{targets.dailyProd.toLocaleString()} meters/day</strong>.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
