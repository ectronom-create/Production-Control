import React from "react";
import { Award } from "lucide-react";

export default function ProgramOverviewHero({
  productionMetrics,
  projectStatus,
}) {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #0b1528 0%, #11203d 50%, #0d1930 100%)",
        color: "#f8fafc",
        borderRadius: 18,
        padding: "30px 34px",
        boxShadow:
          "0 20px 25px -5px rgba(11, 21, 40, 0.4), 0 8px 10px -6px rgba(11, 21, 40, 0.2)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderTop: "4px solid #00afaa",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background glow */}
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 220,
          height: 220,
          background:
            "radial-gradient(circle, rgba(0, 175, 170, 0.25) 0%, rgba(0, 175, 170, 0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          marginBottom: 26,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(0, 175, 170, 0.15)",
              border: "1.5px solid rgba(0, 175, 170, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(0, 175, 170, 0.2)",
            }}
          >
            <Award size={32} color="#00afaa" />
          </div>
          <div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              Program Executive Overview
            </div>
            <h2
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                margin: "2px 0 0",
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              3-Phase Smart Meters Rollout (300K Contract)
            </h2>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              background: projectStatus.bg,
              color: projectStatus.color,
              border: `1px solid ${projectStatus.border}`,
              padding: "8px 18px",
              borderRadius: 9999,
              fontSize: "0.85rem",
              fontWeight: 800,
              letterSpacing: "0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: projectStatus.color,
                display: "inline-block",
              }}
            />
            <span>Status: {projectStatus.label}</span>
          </span>
        </div>
      </div>

      {/* Major Progress Bar */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
          }}
        >
          <span
            style={{ fontSize: "0.92rem", color: "#cbd5e1", fontWeight: 600 }}
          >
            Total Completed:{" "}
            <b
              style={{
                color: "#38bdf8",
                fontSize: "1.25rem",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {productionMetrics.overallCompleted.toLocaleString()}
            </b>{" "}
            / {productionMetrics.overallTarget.toLocaleString()} Meters
          </span>
          <span
            style={{
              fontSize: "1.45rem",
              fontWeight: 900,
              color: "#10b981",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {productionMetrics.overallPct.toFixed(2)}% Completed
          </span>
        </div>

        <div
          style={{
            height: 16,
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: 8,
            overflow: "hidden",
            padding: 2,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, productionMetrics.overallPct)}%`,
              background: "linear-gradient(90deg, #00afaa 0%, #10b981 100%)",
              borderRadius: 6,
              transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: "0 0 12px rgba(16, 185, 129, 0.4)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
