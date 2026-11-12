import React from "react";
import { Printer, X, Download, ShieldCheck, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import { printReportDocument } from "../../utils/printReport";

export default function ManagementReportModal({
  isOpen,
  onClose,
  productionMetrics,
  fwMetrics,
  recoveryAnalysis,
  kitMetrics,
  kitRunwayMetrics,
  defectMetrics,
  topDefectCodes,
  namaDispatchPlan,
  targets,
  todayStr,
  activeDate,
}) {
  if (!isOpen) return null;

  const handlePrint = () => {
    printReportDocument("mgmt-report-printable-area", { orientation: "landscape" });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-xl"
        style={{ maxWidth: 1120, maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Toolbar */}
        <div className="modal-header" style={{ padding: "16px 24px", borderBottom: "1.5px solid #e2e8f0" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--navy)" }}>
              Official Executive Management Report
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
              Standard A4 Landscape formal document for Executive Committee & General Management
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handlePrint}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700 }}
            >
              <Printer size={16} />
              Print / Save PDF (A4 Landscape)
            </button>
            <button className="btn-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Preview */}
        <div style={{ padding: "20px 24px", overflowY: "auto", background: "#f8fafc" }}>
          {/* Printable Document Box */}
          <div
            id="mgmt-report-printable-area"
            className="report-document"
            style={{
              background: "#ffffff",
              padding: "24px 30px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              color: "#0f172a",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {/* Header / Document Metas */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottom: "2px solid #0f172a", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img src="/ectron-logo.png" alt="ECTRON" style={{ height: 42, width: "auto" }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: "#142547", letterSpacing: "-0.02em" }}>
                    ECTRON PRODUCTION CONTROL — EXECUTIVE KPI AUDIT
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#475569", fontWeight: 600 }}>
                    3-Phase Smart Meters Rollout • Contract Objective: 300,000 Units
                  </p>
                </div>
              </div>

              <div style={{ textAlign: "right", fontSize: "0.78rem", color: "#475569", lineHeight: 1.4 }}>
                <div><strong>DOC REF:</strong> ECT-MGMT-KPI-2026-R1</div>
                <div><strong>INSPECT DATE:</strong> {activeDate || todayStr}</div>
                <div><strong>PRINTED AT:</strong> {todayStr}</div>
                <div style={{ color: "#00afaa", fontWeight: 800 }}>STATUS: OFFICIAL EXECUTIVE REPORT</div>
              </div>
            </div>

            {/* 1. Core Milestone Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <div style={{ border: "1.5px solid #bfdbfe", background: "#f0f7ff", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1e40af", textTransform: "uppercase" }}>3-Phase Cumulative Achieved</div>
                <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#1d4ed8", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>
                  {productionMetrics.overallCompleted.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#1e40af" }}>
                  <strong>{productionMetrics.overallPct.toFixed(1)}%</strong> of {productionMetrics.overallTarget.toLocaleString()} Contract
                </div>
              </div>

              <div style={{ border: "1.5px solid #e9d5ff", background: "#faf5ff", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#6b21a8", textTransform: "uppercase" }}>Firmware Flashed Milestone</div>
                <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#7c3aed", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>
                  {fwMetrics.overallCompleted.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#6b21a8" }}>
                  <strong>{fwMetrics.overallPct.toFixed(1)}%</strong> of {fwMetrics.overallTarget.toLocaleString()} Target
                </div>
              </div>

              <div style={{ border: "1.5px solid #86efac", background: "#f0fdf4", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>Factory Kit Runway</div>
                <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#15803d", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>
                  {kitRunwayMetrics.runwayDays.toFixed(1)} Days
                </div>
                <div style={{ fontSize: "0.72rem", color: "#166534" }}>
                  Stock: <strong>{kitRunwayMetrics.remaining.toLocaleString()}</strong> kits (@ {kitRunwayMetrics.dailyRate.toLocaleString()}/day)
                </div>
              </div>

              <div style={{ border: "1.5px solid #fecdd3", background: "#fff1f2", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#9f1239", textTransform: "uppercase" }}>Net Physical Defects</div>
                <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#be123c", fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>
                  {defectMetrics.actualPhysicalDefects.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#9f1239" }}>
                  Rework: <strong>{defectMetrics.repairRatePct.toFixed(1)}%</strong> ({defectMetrics.totalRepairedMeters.toLocaleString()} repaired)
                </div>
              </div>
            </div>

            {/* 2. Monthly Recovery Sprint & Pace Table */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                ● Monthly Target Recovery Engine ({recoveryAnalysis.fullMonthLabel})
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", borderTop: "1px solid #cbd5e1", borderBottom: "1.5px solid #cbd5e1" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Sprint Metric</th>
                    <th style={{ padding: "6px 10px", textAlign: "center" }}>Expected Target</th>
                    <th style={{ padding: "6px 10px", textAlign: "center" }}>Actual Achieved</th>
                    <th style={{ padding: "6px 10px", textAlign: "center" }}>Deficit / Variance Gap</th>
                    <th style={{ padding: "6px 10px", textAlign: "center" }}>Pace Required / Day</th>
                    <th style={{ padding: "6px 10px", textAlign: "center" }}>Pace Required / Shift</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px 10px", fontWeight: 700 }}>Month Sprint Progress ({recoveryAnalysis.elapsedDays} Days Recorded)</td>
                    <td style={{ padding: "6px 10px", textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>{recoveryAnalysis.monthFullTarget.toLocaleString()}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 800, color: "#16a34a", fontFamily: "JetBrains Mono, monospace" }}>{recoveryAnalysis.actualInPeriod.toLocaleString()}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 800, color: recoveryAnalysis.missingTarget > 0 ? "#b91c1c" : "#16a34a", fontFamily: "JetBrains Mono, monospace" }}>
                      {recoveryAnalysis.missingTarget > 0 ? `-${recoveryAnalysis.missingTarget.toLocaleString()}` : "0"}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 800, color: "#b45309", fontFamily: "JetBrains Mono, monospace" }}>{recoveryAnalysis.revisedDailyTarget.toLocaleString()}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 800, color: "#6d28d9", fontFamily: "JetBrains Mono, monospace" }}>{recoveryAnalysis.revisedShiftTarget.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Top 4 Recurring Failure Codes Table */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                ● Quality & Line Bottlenecks — Top 4 Recurring Failure Codes
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "#fff1f2", borderTop: "1px solid #fecdd3", borderBottom: "1.5px solid #fecdd3" }}>
                    <th style={{ padding: "6px 10px", textAlign: "center", width: "8%" }}>Rank</th>
                    <th style={{ padding: "6px 10px", textAlign: "left", width: "20%" }}>Failure Code</th>
                    <th style={{ padding: "6px 10px", textAlign: "center", width: "18%" }}>Failure Cases</th>
                    <th style={{ padding: "6px 10px", textAlign: "center", width: "16%" }}>Defect Share %</th>
                    <th style={{ padding: "6px 10px", textAlign: "left", width: "38%" }}>Originating Workstation</th>
                  </tr>
                </thead>
                <tbody>
                  {topDefectCodes.top4.map((it) => (
                    <tr key={it.code} style={{ borderBottom: "1px solid #fee2e2" }}>
                      <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 800, color: "#be123c" }}>#{it.rank}</td>
                      <td style={{ padding: "6px 10px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}>Code {it.code}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>{it.qty.toLocaleString()}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700 }}>{it.pct.toFixed(1)}%</td>
                      <td style={{ padding: "6px 10px", color: "#475569" }}>{it.stationName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Nama Dispatch Roadmap Summary */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                ● Dispatched to Nama / Field Roadmap
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {namaDispatchPlan.map((d) => (
                  <div key={d.batch} style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 10px", background: "#f8fafc", fontSize: "0.74rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                      <span>{d.batch}</span>
                      <span style={{ color: d.status === "Delivered" ? "#16a34a" : "#2563eb" }}>{d.status}</span>
                    </div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--navy)", fontFamily: "JetBrains Mono, monospace", margin: "2px 0" }}>
                      {d.qty.toLocaleString()} meters
                    </div>
                    <div style={{ color: "#64748b" }}>Date: <strong>{d.date}</strong></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formal Three Signatures */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, paddingTop: 16, borderTop: "2px solid #0f172a" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Prepared By:</div>
                <div style={{ height: 40 }} />
                <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: 4, fontSize: "0.78rem", fontWeight: 700 }}>
                  Operations & KPI Lead
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Reviewed By:</div>
                <div style={{ height: 40 }} />
                <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: 4, fontSize: "0.78rem", fontWeight: 700 }}>
                  Quality & Production Manager
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Approved By:</div>
                <div style={{ height: 40 }} />
                <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: 4, fontSize: "0.78rem", fontWeight: 700 }}>
                  General Factory Management
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1.5px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10, background: "#ffffff" }}>
          <button className="btn-outline" onClick={onClose} style={{ padding: "8px 18px" }}>
            Close Preview
          </button>
          <button className="btn-primary" onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px" }}>
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}
