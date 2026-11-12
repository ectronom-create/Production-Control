import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ArrowLeft,
  RefreshCw,
  Printer,
  Sliders,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function ManagementHeader({
  availableDates,
  activeDate,
  todayStr,
  onDateChange,
  onRefresh,
  isLiveSyncing,
  lastSyncedAt,
  syncError,
  onOpenReport,
  onOpenSettings,
}) {
  const navigate = useNavigate();

  const formattedTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";

  return (
    <div
      className="page-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              background: "linear-gradient(135deg, #11203d, #00afaa)",
              color: "white",
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: "0.76rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              boxShadow: "0 2px 4px rgba(0, 175, 170, 0.25)",
            }}
          >
            EXECUTIVE
          </span>
          <h1 className="page-title" style={{ margin: 0, fontSize: "1.65rem" }}>
            Management Dashboard
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <p className="page-subtitle" style={{ margin: 0 }}>
            3-Phase Production targets, Firmware milestones, and high-level project yield
          </p>
          {/* Live Sync Status Pill */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 9999,
              background: syncError ? "#fee2e2" : "#ecfdf5",
              color: syncError ? "#b91c1c" : "#047857",
              border: `1px solid ${syncError ? "#fecaca" : "#a7f3d0"}`,
            }}
            title={syncError || `Live sync active across all tables • Last updated: ${formattedTime}`}
          >
            {syncError ? (
              <>
                <WifiOff size={11} color="#b91c1c" />
                <span>Cached Data</span>
              </>
            ) : (
              <>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#10b981",
                    display: "inline-block",
                    boxShadow: "0 0 6px #10b981",
                  }}
                />
                <span>Live Realtime Sync ({formattedTime})</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Date Selector */}
        {availableDates.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#ffffff",
              padding: "7px 12px",
              borderRadius: 10,
              border: "1.5px solid var(--gray-200)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <Calendar size={15} color="var(--teal)" />
            <label
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--gray-600)",
              }}
            >
              Inspect Date:
            </label>
            <select
              value={activeDate}
              onChange={(e) => onDateChange(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                fontWeight: 700,
                fontSize: "0.84rem",
                color: "var(--navy)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} {d === todayStr ? "(Today)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Executive Print / PDF Report Button */}
        <button
          type="button"
          className="btn-outline"
          onClick={onOpenReport}
          title="Print or Export Formal A4 Executive Report"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "#ffffff",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: "0.82rem",
            color: "var(--navy)",
            border: "1.5px solid var(--gray-200)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            cursor: "pointer",
          }}
        >
          <Printer size={15} color="var(--teal)" />
          <span>Executive Report</span>
        </button>

        {/* Settings / Edit Targets Modal Trigger */}
        <button
          type="button"
          className="btn-outline"
          onClick={onOpenSettings}
          title="Configure Production Targets & Baselines"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "#ffffff",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: "0.82rem",
            color: "var(--navy)",
            border: "1.5px solid var(--gray-200)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            cursor: "pointer",
          }}
        >
          <Sliders size={15} color="#4f46e5" />
          <span>Baselines</span>
        </button>

        {/* Back to Operations Dashboard */}
        <button
          type="button"
          className="btn-outline"
          onClick={() => navigate("/dashboard")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: "#ffffff",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "0.82rem",
            border: "1.5px solid var(--gray-200)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={15} />
          Operations
        </button>

        {/* Refresh button */}
        <button
          type="button"
          className="btn-outline"
          onClick={onRefresh}
          title="Refresh All Records & Targets"
          style={{
            padding: "8px 12px",
            background: "#ffffff",
            borderRadius: 10,
            border: "1.5px solid var(--gray-200)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={15} />
        </button>
      </div>
    </div>
  );
}
