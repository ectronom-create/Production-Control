import React from "react";
import { Cpu, Target, Calendar, Clock, Zap } from "lucide-react";

export default function FirmwareKpiCards({
  fwMetrics,
  weekStartDateStr,
  activeDate,
}) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #fbf7ff 0%, #ffffff 100%)",
        borderRadius: 16,
        padding: "26px 30px",
        border: "1.5px solid #e9d5ff",
        borderTop: "4px solid #9333ea",
        boxShadow:
          "0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "#f3e8ff",
            border: "1px solid #e9d5ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Cpu size={24} color="#7c3aed" />
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "#581c87",
              letterSpacing: "-0.01em",
            }}
          >
            Firmware (FW) — Flashing Targets & Completion
          </h3>
          <p
            style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}
          >
            Monitoring flashing station throughput and meter software updates
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 18,
        }}
      >
        {/* Card 1: Overall FW Target */}
        <div className="card-white" style={{ borderLeft: "4px solid #7c3aed" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--gray-500)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Overall FW Target
            </span>
            <Target size={18} color="#7c3aed" />
          </div>
          <div
            style={{
              fontSize: "1.95rem",
              fontWeight: 900,
              color: "#7c3aed",
              lineHeight: 1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {fwMetrics.overallTarget.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--gray-500)",
              marginTop: 10,
            }}
          >
            Total FW Completed:{" "}
            <b style={{ color: "#7c3aed" }}>
              {fwMetrics.overallCompleted.toLocaleString()}
            </b>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid var(--gray-200)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
            }}
          >
            <span>Achievement:</span>
            <span
              style={{
                fontWeight: 800,
                color: fwMetrics.overallPct >= 90 ? "#16a34a" : "#7c3aed",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {fwMetrics.overallPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 2: Weekly FW Target */}
        <div className="card-white" style={{ borderLeft: "4px solid #a855f7" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--gray-500)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Weekly FW Target
            </span>
            <Calendar size={18} color="#a855f7" />
          </div>
          <div
            style={{
              fontSize: "1.95rem",
              fontWeight: 900,
              color: "#9333ea",
              lineHeight: 1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {fwMetrics.weeklyTarget.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--gray-500)",
              marginTop: 10,
            }}
          >
            Actual Flashed ({weekStartDateStr} to {activeDate}):{" "}
            <b style={{ color: "#9333ea" }}>
              {fwMetrics.weeklyActual.toLocaleString()}
            </b>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid var(--gray-200)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
            }}
          >
            <span>Achievement:</span>
            <span
              style={{
                fontWeight: 800,
                color: fwMetrics.weeklyPct >= 90 ? "#16a34a" : "#d97706",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {fwMetrics.weeklyPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 3: Daily FW Target */}
        <div className="card-white" style={{ borderLeft: "4px solid #ec4899" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--gray-500)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Daily FW Target
            </span>
            <Clock size={18} color="#ec4899" />
          </div>
          <div
            style={{
              fontSize: "1.95rem",
              fontWeight: 900,
              color: "#db2777",
              lineHeight: 1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {fwMetrics.dailyTarget.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--gray-500)",
              marginTop: 10,
            }}
          >
            Actual Flashed ({activeDate}):{" "}
            <b style={{ color: "#db2777" }}>
              {fwMetrics.dailyActual.toLocaleString()}
            </b>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid var(--gray-200)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
            }}
          >
            <span>Achievement:</span>
            <span
              style={{
                fontWeight: 800,
                color: fwMetrics.dailyPct >= 90 ? "#16a34a" : "#d97706",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {fwMetrics.dailyPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 4: Shift FW Target */}
        <div className="card-white" style={{ borderLeft: "4px solid #f43f5e" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--gray-500)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              FW Target per Shift
            </span>
            <Zap size={18} color="#f43f5e" />
          </div>
          <div
            style={{
              fontSize: "1.95rem",
              fontWeight: 900,
              color: "#e11d48",
              lineHeight: 1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {fwMetrics.shiftTarget.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--gray-500)",
              marginTop: 10,
            }}
          >
            Actual per Shift:{" "}
            <b style={{ color: "#e11d48" }}>
              {fwMetrics.shiftActual.toLocaleString()}
            </b>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid var(--gray-200)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
            }}
          >
            <span>Achievement:</span>
            <span
              style={{
                fontWeight: 800,
                color: fwMetrics.shiftPct >= 90 ? "#16a34a" : "#d97706",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {fwMetrics.shiftPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
