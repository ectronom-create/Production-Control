import React from "react";

export default function SummaryMatrixTable({
  productionMetrics,
  fwMetrics,
  kitMetrics,
  defectMetrics,
}) {
  return (
    <div
      className="table-card"
      style={{
        background: "#ffffff",
        borderRadius: 16,
        border: "1px solid #cbd5e1",
        borderTop: "4px solid #334155",
        boxShadow:
          "0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--gray-200)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f8fafc",
        }}
      >
        <span
          style={{
            fontWeight: 800,
            color: "var(--navy)",
            fontSize: "1.05rem",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#3b82f6",
              display: "inline-block",
            }}
          />
          Target vs. Actual Matrix Summary
        </span>
        <span
          className="badge badge-admin"
          style={{ fontSize: "0.78rem", padding: "5px 12px" }}
        >
          Active Project Baselines
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ padding: "14px 20px" }}>Scope Metric</th>
              <th style={{ textAlign: "center", padding: "14px 16px" }}>
                Target Objective
              </th>
              <th style={{ textAlign: "center", padding: "14px 16px" }}>
                Actual Achieved
              </th>
              <th style={{ textAlign: "center", padding: "14px 16px" }}>
                Variance / Gap
              </th>
              <th style={{ textAlign: "center", padding: "14px 16px" }}>
                Achievement Rate %
              </th>
              <th style={{ textAlign: "center", padding: "14px 20px" }}>
                Performance Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                style={{
                  fontWeight: 700,
                  color: "var(--navy)",
                  padding: "14px 20px",
                }}
              >
                Overall 3-Phase Production
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.overallTarget.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#16a34a",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.overallCompleted.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  color: "#64748b",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                -
                {(
                  productionMetrics.overallTarget -
                  productionMetrics.overallCompleted
                ).toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#16a34a",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.overallPct.toFixed(1)}%
              </td>
              <td style={{ textAlign: "center", padding: "14px 20px" }}>
                <span className="badge badge-green">In Progress</span>
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontWeight: 700,
                  color: "var(--navy)",
                  padding: "14px 20px",
                }}
              >
                Weekly 3-Phase Production
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.weeklyTarget.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#1d4ed8",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.weeklyActual.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  color:
                    productionMetrics.weeklyActual >=
                    productionMetrics.weeklyTarget
                      ? "#16a34a"
                      : "#dc2626",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.weeklyActual >=
                productionMetrics.weeklyTarget
                  ? "+"
                  : ""}
                {(
                  productionMetrics.weeklyActual -
                  productionMetrics.weeklyTarget
                ).toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.weeklyPct.toFixed(1)}%
              </td>
              <td style={{ textAlign: "center", padding: "14px 20px" }}>
                <span
                  className={`badge ${productionMetrics.weeklyPct >= 90 ? "badge-green" : "badge-amber"}`}
                >
                  {productionMetrics.weeklyPct >= 90 ? "Met" : "Pending"}
                </span>
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontWeight: 700,
                  color: "var(--navy)",
                  padding: "14px 20px",
                }}
              >
                Daily 3-Phase Production
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.dailyTarget.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "var(--teal-dark)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.dailyActual.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  color:
                    productionMetrics.dailyActual >=
                    productionMetrics.dailyTarget
                      ? "#16a34a"
                      : "#dc2626",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.dailyActual >= productionMetrics.dailyTarget
                  ? "+"
                  : ""}
                {(
                  productionMetrics.dailyActual - productionMetrics.dailyTarget
                ).toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {productionMetrics.dailyPct.toFixed(1)}%
              </td>
              <td style={{ textAlign: "center", padding: "14px 20px" }}>
                <span
                  className={`badge ${productionMetrics.dailyPct >= 90 ? "badge-green" : "badge-amber"}`}
                >
                  {productionMetrics.dailyPct >= 90 ? "Met" : "Pending"}
                </span>
              </td>
            </tr>
            <tr style={{ background: "#faf5ff" }}>
              <td
                style={{
                  fontWeight: 700,
                  color: "#7c3aed",
                  padding: "14px 20px",
                }}
              >
                Overall Firmware (FW)
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {fwMetrics.overallTarget.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#7c3aed",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {fwMetrics.overallCompleted.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  color: "#64748b",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                -
                {(
                  fwMetrics.overallTarget - fwMetrics.overallCompleted
                ).toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#7c3aed",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {fwMetrics.overallPct.toFixed(1)}%
              </td>
              <td style={{ textAlign: "center", padding: "14px 20px" }}>
                <span className="badge badge-purple">On Track</span>
              </td>
            </tr>
            <tr style={{ background: "#faf5ff" }}>
              <td
                style={{
                  fontWeight: 700,
                  color: "#7c3aed",
                  padding: "14px 20px",
                }}
              >
                Daily Firmware (FW) Flashing
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {fwMetrics.dailyTarget.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#7c3aed",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {fwMetrics.dailyActual.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  color:
                    fwMetrics.dailyActual >= fwMetrics.dailyTarget
                      ? "#16a34a"
                      : "#dc2626",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {fwMetrics.dailyActual >= fwMetrics.dailyTarget ? "+" : ""}
                {(
                  fwMetrics.dailyActual - fwMetrics.dailyTarget
                ).toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {fwMetrics.dailyPct.toFixed(1)}%
              </td>
              <td style={{ textAlign: "center", padding: "14px 20px" }}>
                <span
                  className={`badge ${fwMetrics.dailyPct >= 90 ? "badge-green" : "badge-amber"}`}
                >
                  {fwMetrics.dailyPct >= 90 ? "Met" : "Pending"}
                </span>
              </td>
            </tr>
            <tr
              style={{ background: "#f5f3ff", borderTop: "2px solid #e0e7ff" }}
            >
              <td
                style={{
                  fontWeight: 700,
                  color: "#4338ca",
                  padding: "14px 20px",
                }}
              >
                Kit Meters Supply (Pipeline Received)
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {kitMetrics.totalKits.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#16a34a",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {kitMetrics.receivedKits.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  color: "#4338ca",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {kitMetrics.plannedKits > 0
                  ? `-${kitMetrics.plannedKits.toLocaleString()} planned`
                  : "0"}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#4338ca",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {kitMetrics.receivedPct.toFixed(1)}%
              </td>
              <td style={{ textAlign: "center", padding: "14px 20px" }}>
                <span
                  className={`badge ${kitMetrics.plannedBatches > 0 ? "badge-blue" : "badge-green"}`}
                >
                  {kitMetrics.plannedBatches > 0
                    ? `${kitMetrics.plannedBatches} Batches Planned`
                    : "All Batches Received"}
                </span>
              </td>
            </tr>
            <tr
              style={{ background: "#fff1f2", borderTop: "2px solid #fecdd3" }}
            >
              <td
                style={{
                  fontWeight: 700,
                  color: "#be123c",
                  padding: "14px 20px",
                }}
              >
                Defective Meters (Ground Truth vs. Reported KO)
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {defectMetrics.totalReportedKO.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#dc2626",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {defectMetrics.actualPhysicalDefects.toLocaleString()}
              </td>
              <td
                style={{
                  textAlign: "center",
                  color: "#16a34a",
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                -{defectMetrics.totalRepairedMeters.toLocaleString()} repaired
              </td>
              <td
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#be123c",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {(defectMetrics.calibrationRatio * 100).toFixed(1)}%
              </td>
              <td style={{ textAlign: "center", padding: "14px 20px" }}>
                <span className="badge badge-red">
                  {defectMetrics.actualPhysicalDefects.toLocaleString()} Net
                  Actual ({defectMetrics.repairRatePct.toFixed(1)}% Repaired)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
