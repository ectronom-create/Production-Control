import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Boxes,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";

export default function KitSupplyRunwayCard({ kitMetrics, kitRunwayMetrics }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #f5f7ff 0%, #ffffff 100%)",
        borderRadius: 16,
        padding: "26px 30px",
        border: "1.5px solid #c7d2fe",
        borderTop: "4px solid #4f46e5",
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
              background: "#ede9fe",
              border: "1px solid #c7d2fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Package size={24} color="#4f46e5" />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#312e81",
                letterSpacing: "-0.01em",
              }}
            >
              Kit Meters Supply & Delivery Plan
            </h3>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "0.82rem",
                color: "#4338ca",
              }}
            >
              Real-time tracking of received shipments vs. scheduled future
              deliveries in the pipeline
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/kit-meters")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#4f46e5",
            color: "white",
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            fontSize: "0.84rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
          }}
        >
          <span>Open Kit Meters Page</span>
          <ArrowUpRight size={16} />
        </button>
      </div>

      {/* 4 Executive KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {/* Card 1: Received Shipments */}
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
              Received Shipments
            </span>
            <span className="badge badge-green" style={{ fontSize: "0.72rem" }}>
              {kitMetrics.receivedBatches} Batches
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
            {kitMetrics.receivedKits.toLocaleString()}
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#166534",
                marginLeft: 6,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Kits
            </span>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #bbf7d0",
              fontSize: "0.8rem",
              color: "#166534",
            }}
          >
            <strong>{kitMetrics.receivedPct.toFixed(1)}%</strong> of total
            pipeline received
          </div>
        </div>

        {/* Card 2: Delivery Plan (Incoming) */}
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
              <CalendarClock size={15} color="#4f46e5" />
              Delivery Plan
            </span>
            <span
              style={{
                background: "#e0e7ff",
                color: "#4338ca",
                fontWeight: 700,
                fontSize: "0.72rem",
                padding: "2px 8px",
                borderRadius: 9999,
              }}
            >
              {kitMetrics.plannedBatches} Batches
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
            {kitMetrics.plannedKits.toLocaleString()}
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#3730a3",
                marginLeft: 6,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Kits
            </span>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #c7d2fe",
              fontSize: "0.8rem",
              color: "#3730a3",
            }}
          >
            <strong>{kitMetrics.plannedPct.toFixed(1)}%</strong> scheduled for
            future delivery
          </div>
        </div>

        {/* Card 3: Next Incoming Shipment */}
        <div
          style={{
            background: "#f8fafc",
            border: "1.5px solid #e2e8f0",
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
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Clock size={15} color="#64748b" />
              Next Incoming Shipment
            </span>
            {kitMetrics.nearestIncomingDays !== null && (
              <span
                className="badge badge-purple"
                style={{ fontSize: "0.72rem" }}
              >
                {kitMetrics.nearestIncomingDays === 0
                  ? "Today (Expected)"
                  : kitMetrics.nearestIncomingDays === 1
                    ? "Tomorrow"
                    : `In ${kitMetrics.nearestIncomingDays} days`}
              </span>
            )}
          </div>
          {kitMetrics.nextIncomingBatch ? (
            <>
              <div
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "var(--navy)",
                  lineHeight: 1.2,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {kitMetrics.nextIncomingBatch.batch_number}
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#64748b",
                    marginLeft: 8,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  (
                  {(
                    parseInt(
                      kitMetrics.nextIncomingBatch.kit_quantity ??
                        kitMetrics.nextIncomingBatch.quantity,
                      10,
                    ) || 0
                  ).toLocaleString()}{" "}
                  kits)
                </span>
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid #e2e8f0",
                  fontSize: "0.8rem",
                  color: "#64748b",
                }}
              >
                Scheduled Date:{" "}
                <strong style={{ color: "var(--navy)" }}>
                  {kitMetrics.nextIncomingBatch.date}
                </strong>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#16a34a",
                  marginTop: 4,
                }}
              >
                All Shipments Received
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid #e2e8f0",
                  fontSize: "0.8rem",
                  color: "#94a3b8",
                }}
              >
                No pending future delivery batches
              </div>
            </>
          )}
        </div>

        {/* Card 4: Total Supply Breakdown */}
        <div
          style={{
            background: "#faf5ff",
            border: "1.5px solid #e9d5ff",
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
                color: "#6b21a8",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Boxes size={15} color="#7e22ce" />
              Total Supply Pipeline
            </span>
            <span
              className="badge badge-purple"
              style={{ fontSize: "0.72rem" }}
            >
              {kitMetrics.totalBatches} Total Batches
            </span>
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 900,
              color: "#6b21a8",
              lineHeight: 1.1,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {kitMetrics.totalKits.toLocaleString()}
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#7e22ce",
                marginLeft: 6,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Kits
            </span>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #e9d5ff",
              fontSize: "0.8rem",
              color: "#6b21a8",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              3-Phase:{" "}
              <strong>{kitMetrics.threePhaseKits.toLocaleString()}</strong>
            </span>
            <span>
              1-Phase:{" "}
              <strong>{kitMetrics.singlePhaseKits.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── Kit Inventory Balance & Factory Operational Runway ── */}
      <div
        style={{
          marginTop: 22,
          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
          borderRadius: 14,
          padding: "24px 26px",
          border: "1.5px solid #a7f3d0",
          borderRight: "4px solid #10b981",
          boxShadow: "0 1px 3px 0 rgba(16, 185, 129, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "#d1fae5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={20} color="#059669" />
            </div>
            <div>
              <h4
                style={{
                  margin: 0,
                  fontSize: "1.08rem",
                  fontWeight: 800,
                  color: "#064e3b",
                }}
              >
                Kit Inventory & Factory Operational Runway
              </h4>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.78rem",
                  color: "#047857",
                }}
              >
                Formula: (Received − Good Production Achieved − Actual Defects)
                ÷ {kitRunwayMetrics.dailyRate.toLocaleString()} meters/day
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              className={kitRunwayMetrics.isAdaptive ? "badge badge-blue" : "badge badge-admin"}
              style={{
                fontSize: "0.8rem",
                padding: "6px 12px",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: kitRunwayMetrics.isAdaptive ? "#2563eb" : "#0d9488",
                }}
              />
              {kitRunwayMetrics.isAdaptive
                ? `Adaptive Rate (7d avg): ${kitRunwayMetrics.dailyRate.toLocaleString()} meters / day`
                : `Fixed Benchmark: ${kitRunwayMetrics.dailyRate.toLocaleString()} meters / day`}
            </span>
          </div>
        </div>

        {/* 5 Cards Horizontal Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 18,
          }}
        >
          {/* 1. Received Kits */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1px solid #86efac",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "#166534",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              1. Received Kits
            </div>
            <div
              style={{
                fontSize: "1.55rem",
                fontWeight: 900,
                color: "#15803d",
                marginTop: 4,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {kitRunwayMetrics.received.toLocaleString()}
            </div>
            <div
              style={{ fontSize: "0.74rem", color: "#166534", marginTop: 2 }}
            >
              Total Shipments Received
            </div>
          </div>

          {/* 2. Finished Production Achieved */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1px solid #93c5fd",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "#1e40af",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              2. Good Production
            </div>
            <div
              style={{
                fontSize: "1.55rem",
                fontWeight: 900,
                color: "#1d4ed8",
                marginTop: 4,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {kitRunwayMetrics.achieved.toLocaleString()}
            </div>
            <div
              style={{ fontSize: "0.74rem", color: "#1e40af", marginTop: 2 }}
            >
              Total Finished Achieved
            </div>
          </div>

          {/* 3. Actual Physical Defects */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1px solid #fca5a5",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "#991b1b",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              3. Actual Defects
            </div>
            <div
              style={{
                fontSize: "1.55rem",
                fontWeight: 900,
                color: "#dc2626",
                marginTop: 4,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {kitRunwayMetrics.actualDefects.toLocaleString()}
            </div>
            <div
              style={{ fontSize: "0.74rem", color: "#991b1b", marginTop: 2 }}
            >
              Net Physical (No Duplicates)
            </div>
          </div>

          {/* 4. Remaining Kit Stock */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1.5px solid #fdba74",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                fontSize: "0.74rem",
                fontWeight: 800,
                color: "#9a3412",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              4. Remaining Kit Stock
            </div>
            <div
              style={{
                fontSize: "1.55rem",
                fontWeight: 900,
                color: "#ea580c",
                marginTop: 4,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {kitRunwayMetrics.remaining.toLocaleString()}
            </div>
            <div
              style={{ fontSize: "0.74rem", color: "#9a3412", marginTop: 2 }}
            >
              Available in Warehouse ({kitRunwayMetrics.remainingPct.toFixed(1)}
              %)
            </div>
          </div>

          {/* 5. Highlighted Runway Days Card */}
          <div
            style={{
              background:
                kitRunwayMetrics.runwayDays >= 6
                  ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
                  : "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
              borderRadius: 12,
              padding: "16px 18px",
              border:
                kitRunwayMetrics.runwayDays >= 6
                  ? "1.5px solid #10b981"
                  : "1.5px solid #f59e0b",
              boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                fontSize: "0.74rem",
                fontWeight: 800,
                color: kitRunwayMetrics.runwayDays >= 6 ? "#065f46" : "#92400e",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Factory Runway
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: kitRunwayMetrics.runwayDays >= 6 ? "#047857" : "#b45309",
                marginTop: 4,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {kitRunwayMetrics.runwayDays.toFixed(1)}{" "}
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Operating Days
              </span>
            </div>
            <div
              style={{
                fontSize: "0.74rem",
                color: kitRunwayMetrics.runwayDays >= 6 ? "#065f46" : "#92400e",
                marginTop: 2,
              }}
            >
              Approx. {Math.floor(kitRunwayMetrics.runwayDays)} full days &{" "}
              {Math.round((kitRunwayMetrics.runwayDays % 1) * 2)} shift
            </div>
          </div>
        </div>

        {/* Progress Bar & Strategic Supply Security Notice */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            padding: "14px 18px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              fontSize: "0.8rem",
            }}
          >
            <span style={{ fontWeight: 700, color: "#334155" }}>
              Received Kit Consumed:{" "}
              <strong>{kitRunwayMetrics.consumed.toLocaleString()}</strong> kits
              ({kitRunwayMetrics.consumedPct.toFixed(1)}%)
            </span>
            <span style={{ fontWeight: 800, color: "#ea580c" }}>
              Current Remaining Stock:{" "}
              <strong>{kitRunwayMetrics.remaining.toLocaleString()}</strong>{" "}
              kits ({kitRunwayMetrics.remainingPct.toFixed(1)}%)
            </span>
          </div>

          <div
            style={{
              width: "100%",
              height: 9,
              background: "#e2e8f0",
              borderRadius: 9999,
              overflow: "hidden",
              display: "flex",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: `${kitRunwayMetrics.consumedPct}%`,
                background: "#3b82f6",
                height: "100%",
              }}
              title="Consumed"
            />
            <div
              style={{
                width: `${kitRunwayMetrics.remainingPct}%`,
                background: "#f97316",
                height: "100%",
              }}
              title="Remaining"
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "0.8rem",
              color: "#475569",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: "#ecfdf5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={16} color="#059669" />
            </div>
            <span>
              <strong>Supply Chain Continuity:</strong>{" "}
              {kitMetrics.nextIncomingBatch ? (
                (() => {
                  const nextBatch = kitMetrics.nextIncomingBatch;
                  const nextQty = (
                    parseInt(
                      nextBatch.kit_quantity ?? nextBatch.quantity,
                      10,
                    ) || 0
                  ).toLocaleString();
                  const weekMatch = nextBatch.notes?.match(/W\d+/);
                  const weekLabel = weekMatch ? ` (${weekMatch[0]})` : "";
                  const daysLabel =
                    kitMetrics.nearestIncomingDays !== null
                      ? kitMetrics.nearestIncomingDays === 0
                        ? "arriving today"
                        : `in ${kitMetrics.nearestIncomingDays} day${kitMetrics.nearestIncomingDays > 1 ? "s" : ""}`
                      : "";
                  return (
                    <>
                      Current stock of{" "}
                      <strong>
                        {kitRunwayMetrics.runwayDays.toFixed(1)} operating days
                      </strong>{" "}
                      {kitRunwayMetrics.runwayDays >=
                      (kitMetrics.nearestIncomingDays ?? 0)
                        ? "comfortably covers plant production until the arrival of the next shipment batch "
                        : "covers plant production towards the next scheduled shipment batch "}
                      <strong>
                        {nextBatch.batch_number}
                        {weekLabel}
                      </strong>{" "}
                      scheduled on <strong>{nextBatch.date}</strong> ({nextQty}{" "}
                      kits{daysLabel ? ` • ${daysLabel}` : ""}), ensuring zero
                      line stoppage.
                    </>
                  );
                })()
              ) : (
                <>
                  Current stock of{" "}
                  <strong>
                    {kitRunwayMetrics.runwayDays.toFixed(1)} operating days
                  </strong>{" "}
                  provides adequate manufacturing buffer across all active
                  production lines.
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
