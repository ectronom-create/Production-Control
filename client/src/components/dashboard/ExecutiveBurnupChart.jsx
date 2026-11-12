import React, { useState } from "react";
import { TrendingUp, Award, Layers, Cpu, Info } from "lucide-react";

export default function ExecutiveBurnupChart({ burnupData, targets, overallCompleted, overallTarget }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!burnupData || burnupData.length === 0) return null;

  const width = 900;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 60 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Max value for scaling
  const maxVal = Math.max(
    overallTarget || 300000,
    ...burnupData.map((d) => Math.max(d.actual, d.target, d.fw || 0)),
    1000,
  );

  const getX = (idx) => {
    if (burnupData.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (idx / (burnupData.length - 1)) * innerWidth;
  };

  const getY = (val) => {
    return padding.top + innerHeight - (val / maxVal) * innerHeight;
  };

  // Build SVG path strings
  const actualPoints = burnupData.map((d, i) => `${getX(i)},${getY(d.actual)}`).join(" ");
  const targetPoints = burnupData.map((d, i) => `${getX(i)},${getY(d.target)}`).join(" ");
  const fwPoints = burnupData.map((d, i) => `${getX(i)},${getY(d.fw)}`).join(" ");

  // Fill area under actual
  const actualArea = `${padding.left},${padding.top + innerHeight} ${actualPoints} ${padding.left + innerWidth},${padding.top + innerHeight}`;

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: "24px 28px",
        border: "1.5px solid #e2e8f0",
        boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdfa", border: "1px solid #99f6e4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={22} color="#00afaa" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--navy)" }}>
              Cumulative Project Burn-up & Velocity Trajectory
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              Tracking actual cumulative milestone fulfillment vs. planned 300K sprint velocity
            </p>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "0.78rem", fontWeight: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#00afaa" }}>
            <span style={{ width: 12, height: 4, background: "#00afaa", borderRadius: 2 }} />
            <span>Cumulative Achieved ({overallCompleted.toLocaleString()})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#2563eb" }}>
            <span style={{ width: 12, height: 2, background: "#2563eb", borderTop: "2px dashed #2563eb" }} />
            <span>Planned Target Trajectory</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9333ea" }}>
            <span style={{ width: 12, height: 3, background: "#9333ea", borderRadius: 2 }} />
            <span>Firmware Flashed</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto", minWidth: 600, display: "block" }}
        >
          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + innerHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1.5"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Area Under Actual */}
          <polygon
            points={actualArea}
            fill="url(#burnup-teal-gradient)"
            opacity="0.18"
          />

          <defs>
            <linearGradient id="burnup-teal-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00afaa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00afaa" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Target Dashed Line */}
          <polyline
            points={targetPoints}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeDasharray="5,4"
          />

          {/* Firmware Line */}
          <polyline
            points={fwPoints}
            fill="none"
            stroke="#a855f7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Actual Line */}
          <polyline
            points={actualPoints}
            fill="none"
            stroke="#00afaa"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Hover Dots */}
          {burnupData.map((d, i) => (
            <circle
              key={d.date}
              cx={getX(i)}
              cy={getY(d.actual)}
              r={hoveredPoint?.date === d.date ? 6 : 3}
              fill="#ffffff"
              stroke="#00afaa"
              strokeWidth={hoveredPoint?.date === d.date ? 3 : 2}
              style={{ cursor: "pointer", transition: "all 0.15s ease" }}
              onMouseEnter={() => setHoveredPoint(d)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* X-Axis Date Labels */}
          {burnupData.map((d, i) => {
            const step = Math.max(1, Math.floor(burnupData.length / 8));
            if (i % step !== 0 && i !== burnupData.length - 1) return null;
            const parts = d.date.split("-");
            const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
            return (
              <text
                key={d.date}
                x={getX(i)}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
                fontWeight="600"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Floating Hover Details Card */}
      {hoveredPoint && (
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 28,
            background: "#0f172a",
            color: "#ffffff",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: "0.76rem",
            boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
            lineHeight: 1.5,
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 800, color: "#38bdf8", borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: 4, marginBottom: 4 }}>
            Date: {hoveredPoint.date}
          </div>
          <div>Cumulative Achieved: <strong style={{ color: "#00afaa" }}>{hoveredPoint.actual.toLocaleString()}</strong> meters</div>
          <div>Day Output: <strong>+{hoveredPoint.dayActual.toLocaleString()}</strong> meters</div>
          <div>FW Flashed: <strong>{hoveredPoint.fw.toLocaleString()}</strong> meters</div>
          <div>Target Pace: <strong>{hoveredPoint.target.toLocaleString()}</strong> meters</div>
        </div>
      )}
    </div>
  );
}
