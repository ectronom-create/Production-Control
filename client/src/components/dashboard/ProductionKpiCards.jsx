import React from "react";
import { Layers, Target, Calendar, Clock, Zap } from "lucide-react";

export default function ProductionKpiCards({
  productionMetrics,
  weekStartDateStr,
}) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)",
        borderRadius: 16,
        padding: "26px 30px",
        border: "1.5px solid #bfdbfe",
        borderTop: "4px solid #2563eb",
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
            background: "#dbeafe",
            border: "1px solid #bfdbfe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Layers size={24} color="#1d4ed8" />
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "#1e3a8a",
              letterSpacing: "-0.01em",
            }}
          >
            Production — 3-Phase Target Hierarchy & Actuals
          </h3>
          <p
            style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}
          >
            Tracking cumulative, weekly, daily, and shift-level assembly line
            completion
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
        {/* Card 1: Overall Target */}
        <div
          className="card-white"
          style={{ borderLeft: "4px solid var(--navy)" }}
        >
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
              Overall Target
            </span>
            <Target size={18} color="var(--navy)" />
          </div>
          <div
            style={{
              fontSize: "1.95rem",
              fontWeight: 900,
              color: "var(--navy)",
              lineHeight: 1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {productionMetrics.overallTarget.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--gray-500)",
              marginTop: 10,
            }}
          >
            Cumulative Delivered:{" "}
            <b style={{ color: "#16a34a" }}>
              {productionMetrics.overallCompleted.toLocaleString()}
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
                color: "#16a34a",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {productionMetrics.overallPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 2: Weekly Production Target */}
        <div className="card-white" style={{ borderLeft: "4px solid #3b82f6" }}>
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
              Weekly Target (7 Days)
            </span>
            <Calendar size={18} color="#3b82f6" />
          </div>
          <div
            style={{
              fontSize: "1.95rem",
              fontWeight: 900,
              color: "#1d4ed8",
              lineHeight: 1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {productionMetrics.weeklyTarget.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--gray-500)",
              marginTop: 10,
            }}
          >
            Actual ({weekStartDateStr} to {productionMetrics.activeDate}):{" "}
            <b style={{ color: "#1d4ed8" }}>
              {productionMetrics.weeklyActual.toLocaleString()}
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
                color:
                  productionMetrics.weeklyPct >= 90 ? "#16a34a" : "#d97706",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {productionMetrics.weeklyPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 3: Daily Production Target */}
        <div
          className="card-white"
          style={{ borderLeft: "4px solid var(--teal)" }}
        >
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
              Daily Target
            </span>
            <Clock size={18} color="var(--teal)" />
          </div>
          <div
            style={{
              fontSize: "1.95rem",
              fontWeight: 900,
              color: "var(--teal-dark)",
              lineHeight: 1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {productionMetrics.dailyTarget.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--gray-500)",
              marginTop: 10,
            }}
          >
            Actual ({productionMetrics.activeDate}):{" "}
            <b style={{ color: "var(--teal-dark)" }}>
              {productionMetrics.dailyActual.toLocaleString()}
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
                color: productionMetrics.dailyPct >= 90 ? "#16a34a" : "#d97706",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {productionMetrics.dailyPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 4: Shift Target */}
        <div className="card-white" style={{ borderLeft: "4px solid #8b5cf6" }}>
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
              Target per Shift (2 Shifts/Day)
            </span>
            <Zap size={18} color="#8b5cf6" />
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
            {productionMetrics.shiftTarget.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--gray-500)",
              marginTop: 10,
            }}
          >
            Actual per Shift:{" "}
            <b style={{ color: "#7c3aed" }}>
              {productionMetrics.shiftActual.toLocaleString()}
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
                color: productionMetrics.shiftPct >= 90 ? "#16a34a" : "#d97706",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {productionMetrics.shiftPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
