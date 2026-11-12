import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  AlertOctagon,
  CheckCircle2,
  RotateCcw,
  Factory,
  Lightbulb,
} from "lucide-react";

export default function DefectCalibrationCard({
  defectMetrics,
  recordsCount,
  topDefectCodes,
}) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)",
        borderRadius: 16,
        padding: "26px 30px",
        border: "1.5px solid #fecdd3",
        borderTop: "4px solid #e11d48",
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
          marginBottom: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#fee2e2",
              border: "1px solid #fecdd3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={24} color="#dc2626" />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#881337",
                letterSpacing: "-0.01em",
              }}
            >
              Defect Meters Analysis & Calibration
            </h3>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "0.82rem",
                color: "#9f1239",
              }}
            >
              Reconciling actual physical defects with shift reports and
              eliminating rework loops
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/defect-meters")}
          className="btn btn-secondary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.84rem",
            fontWeight: 700,
            color: "#b91c1c",
            border: "1.5px solid #fca5a5",
            padding: "8px 16px",
            borderRadius: 8,
            background: "#ffffff",
            cursor: "pointer",
          }}
        >
          <span>View Defect Shifts & Details</span>
          <ArrowUpRight size={15} />
        </button>
      </div>

      {/* 4 KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {/* Card 1: Actual Physical Defective Meters */}
        <div
          style={{
            background: "#fef2f2",
            border: "1.5px solid #fca5a5",
            borderRadius: 12,
            padding: "18px 20px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#991b1b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertOctagon size={15} color="#dc2626" />
              Actual Net Defective Meters
            </span>
            <span
              className="badge badge-red"
              style={{
                fontSize: "0.72rem",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#dc2626",
                  display: "inline-block",
                }}
              />
              Live Dynamic
            </span>
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 900,
              color: "#b91c1c",
              lineHeight: 1.1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {defectMetrics.actualPhysicalDefects.toLocaleString()}
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#991b1b",
                marginLeft: 6,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Net Meters
            </span>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #fecaca",
              fontSize: "0.78rem",
              color: "#7f1d1d",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            <span>
              Previous Base:{" "}
              <strong>
                {defectMetrics.baseActualDefects.toLocaleString()}
              </strong>
            </span>
            <span
              style={{
                background: "#fee2e2",
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 700,
                color: "#991b1b",
                border: "1px solid #fca5a5",
              }}
            >
              + {defectMetrics.liveLoggedDefects.toLocaleString()} Live Logged
            </span>
          </div>
        </div>

        {/* Card 2: Reported Boards KO */}
        <div
          style={{
            background: "#fffbeb",
            border: "1.5px solid #fcd34d",
            borderRadius: 12,
            padding: "18px 20px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#92400e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertTriangle size={15} color="#d97706" />
              Reported Failures (Boards KO)
            </span>
            <span className="badge badge-amber" style={{ fontSize: "0.72rem" }}>
              {recordsCount} Reports
            </span>
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 900,
              color: "#b45309",
              lineHeight: 1.1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {defectMetrics.totalReportedKO.toLocaleString()}
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#92400e",
                marginLeft: 6,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Failed Cases
            </span>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #fde68a",
              fontSize: "0.8rem",
              color: "#78350f",
            }}
          >
            Total reported failure records (Nb Boards - Boards OK)
          </div>
        </div>

        {/* Card 3: Calibration Ratio */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderRadius: 12,
            padding: "18px 20px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#166534",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CheckCircle2 size={15} color="#16a34a" />
              Calibration Ratio (Accuracy)
            </span>
            <span className="badge badge-green" style={{ fontSize: "0.72rem" }}>
              Ratio Factor
            </span>
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 900,
              color: "#15803d",
              lineHeight: 1.1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {(defectMetrics.calibrationRatio * 100).toFixed(2)}%
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#166534",
                marginLeft: 6,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Accuracy
            </span>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #bbf7d0",
              fontSize: "0.8rem",
              color: "#14532d",
            }}
          >
            Every 100 reported KO cases correspond to{" "}
            <strong>{Math.round(defectMetrics.calibrationRatio * 100)}</strong>{" "}
            actual physical defects
          </div>
        </div>

        {/* Card 4: Repaired and Recycled Meters */}
        <div
          style={{
            background: "#eef2ff",
            border: "1.5px solid #c7d2fe",
            borderRadius: 12,
            padding: "18px 20px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#3730a3",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RotateCcw size={15} color="#4f46e5" />
              Repaired & Recycled (Rework)
            </span>
            <span className="badge badge-blue" style={{ fontSize: "0.72rem" }}>
              {defectMetrics.repairRatePct.toFixed(1)}% Rework
            </span>
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 900,
              color: "#4338ca",
              lineHeight: 1.1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {defectMetrics.totalRepairedMeters.toLocaleString()}
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#3730a3",
                marginLeft: 6,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Repaired
            </span>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #c7d2fe",
              fontSize: "0.8rem",
              color: "#312e81",
            }}
          >
            Failed in stations, repaired successfully and returned to line
          </div>
        </div>
      </div>

      {/* ── Top 4 Recurring Defect Codes from Production Reports ── */}
      <div
        style={{
          marginTop: 26,
          paddingTop: 22,
          borderTop: "1.5px dashed #fecdd3",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BarChart3 size={20} color="#dc2626" />
            </div>
            <div>
              <h4
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  color: "#881337",
                }}
              >
                Top 4 Recurring Failure Codes (Shift Production Reports)
              </h4>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.78rem",
                  color: "#9f1239",
                }}
              >
                Pareto failure distribution calculated directly from all shift
                production reports
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="badge badge-red"
              style={{
                fontSize: "0.76rem",
                padding: "5px 12px",
                fontWeight: 700,
              }}
            >
              Top 4 = {topDefectCodes.top4SharePct.toFixed(1)}% of All Reported
              Defects
            </span>
          </div>
        </div>

        {/* 4 Defect Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
          }}
        >
          {topDefectCodes.top4.map((item, idx) => {
            const rankStyles = [
              {
                border: "#fca5a5",
                bg: "#fff1f2",
                badgeBg: "#fee2e2",
                badgeColor: "#991b1b",
                barColor: "#dc2626",
                label: "#1 Highest Failure",
                sub: "Critical Bottleneck",
              },
              {
                border: "#fdba74",
                bg: "#fff7ed",
                badgeBg: "#ffedd5",
                badgeColor: "#c2410c",
                barColor: "#ea580c",
                label: "#2 High Frequency",
                sub: "Significant Defect",
              },
              {
                border: "#fcd34d",
                bg: "#fffbeb",
                badgeBg: "#fef3c7",
                badgeColor: "#92400e",
                barColor: "#d97706",
                label: "#3 Moderate Rate",
                sub: "Quality Action Needed",
              },
              {
                border: "#93c5fd",
                bg: "#eff6ff",
                badgeBg: "#dbeafe",
                badgeColor: "#1e40af",
                barColor: "#2563eb",
                label: "#4 Notable Rate",
                sub: "Recurring Pattern",
              },
            ];
            const style = rankStyles[idx] || rankStyles[3];

            return (
              <div
                key={item.code}
                style={{
                  background: style.bg,
                  border: `1.5px solid ${style.border}`,
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  transition: "transform 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      background: style.badgeBg,
                      color: style.badgeColor,
                      padding: "3px 8px",
                      borderRadius: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {style.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: style.badgeColor,
                    }}
                  >
                    {item.pct.toFixed(1)}% Share
                  </span>
                </div>

                <div style={{ margin: "8px 0 12px" }}>
                  <div
                    style={{
                      fontSize: "1.55rem",
                      fontWeight: 900,
                      fontFamily: "JetBrains Mono, monospace",
                      color: style.badgeColor,
                      letterSpacing: "0.5px",
                    }}
                  >
                    Code {item.code}
                  </div>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 800,
                      color: "#334155",
                      marginTop: 4,
                    }}
                  >
                    <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {item.qty.toLocaleString()}
                    </span>{" "}
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      Failure Cases
                    </span>
                  </div>

                  {/* Originating Workstation Information */}
                  <div
                    style={{
                      marginTop: 12,
                      padding: "8px 10px",
                      background: "#ffffff",
                      borderRadius: 8,
                      border: `1px solid ${style.border}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Factory size={16} color={style.badgeColor} />
                    <div style={{ fontSize: "0.74rem", lineHeight: 1.3 }}>
                      <div style={{ fontWeight: 800, color: style.badgeColor }}>
                        {item.stationName}
                      </div>
                      <div
                        style={{
                          fontSize: "0.67rem",
                          fontWeight: 600,
                          color: "#64748b",
                        }}
                      >
                        Originating Workstation
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div
                    style={{
                      width: "100%",
                      height: 7,
                      background: "rgba(0,0,0,0.08)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(8, item.pct))}%`,
                        height: "100%",
                        background: style.barColor,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "#64748b",
                      marginTop: 6,
                      textAlign: "right",
                    }}
                  >
                    {style.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pareto Insight Footer */}
        <div
          style={{
            marginTop: 16,
            background: "#ffffff",
            border: "1.5px solid #fecdd3",
            borderRadius: 12,
            padding: "12px 18px",
            fontSize: "0.84rem",
            color: "#881337",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: 1,
              minWidth: 260,
            }}
          >
            <Lightbulb size={20} color="#e11d48" style={{ flexShrink: 0 }} />
            <span>
              <strong>Pareto Distribution & Workstation Concentration:</strong>{" "}
              The top 4 failure codes account for{" "}
              <strong>{topDefectCodes.top4Sum.toLocaleString()}</strong> cases (
              {topDefectCodes.top4SharePct.toFixed(1)}% of all reported
              defects). Line failures are heavily concentrated in the{" "}
              <strong>RF Test Station</strong> (Codes -910, -640, -920) and{" "}
              <strong>Multi-Test Workstation</strong> (Code -312).
            </span>
          </div>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#9f1239",
              fontWeight: 700,
              background: "#fee2e2",
              padding: "4px 10px",
              borderRadius: 6,
              whiteSpace: "nowrap",
            }}
          >
            Direct Live Shift Reports
          </span>
        </div>
      </div>
    </div>
  );
}
