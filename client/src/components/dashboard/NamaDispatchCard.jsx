import React from "react";
import {
  Layers,
  CheckCircle2,
  Clock,
  Zap,
  Package,
  Calendar,
} from "lucide-react";

export default function NamaDispatchCard({ namaDispatchPlan }) {
  const getBatchIcon = (idx) => {
    switch (idx) {
      case 0:
        return <CheckCircle2 size={18} color="#16a34a" />;
      case 1:
        return <Clock size={18} color="#2563eb" />;
      case 2:
        return <Zap size={18} color="#d97706" />;
      default:
        return <Package size={18} color="#7c3aed" />;
    }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: "26px 30px",
        border: "1px solid #e2e8f0",
        boxShadow:
          "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
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
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={22} color="#1d4ed8" />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "var(--navy)",
                letterSpacing: "-0.01em",
              }}
            >
              Dispatched to Nama / Field — Plan of Dispatch
            </h3>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "0.82rem",
                color: "#64748b",
              }}
            >
              Field dispatch roadmap, release schedule dates, and contract batch
              quantities
            </p>
          </div>
        </div>

        <span
          className="badge badge-viewer"
          style={{ fontSize: "0.82rem", padding: "6px 14px", fontWeight: 700 }}
        >
          Total Planned: 50,025 Meters
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {namaDispatchPlan.map((p, idx) => (
          <div
            key={p.batch}
            style={{
              background: "#f8fafc",
              border:
                idx === 0
                  ? "1.5px solid #86efac"
                  : idx === 1
                    ? "1.5px solid #93c5fd"
                    : "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "18px 20px",
              position: "relative",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "0.98rem",
                  color: "var(--navy)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {getBatchIcon(idx)}
                {p.batch}
              </span>
              <span
                className={`badge ${p.statusClass}`}
                style={{ fontSize: "0.74rem" }}
              >
                {p.status}
              </span>
            </div>

            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: idx === 0 ? "#16a34a" : "var(--navy)",
                lineHeight: 1.1,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {p.qty.toLocaleString()}{" "}
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#64748b",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Meters
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid #e2e8f0",
                fontSize: "0.82rem",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Calendar size={14} color="#64748b" />
              <span>
                Scheduled Date:{" "}
                <strong style={{ color: "var(--navy)" }}>{p.date}</strong>
              </span>
            </div>

            <div
              style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}
            >
              {p.notes}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
