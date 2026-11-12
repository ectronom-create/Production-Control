import React, { useState, useEffect } from "react";
import { Sliders, X, RotateCcw, Check, Info } from "lucide-react";
import { DEFAULT_TARGETS } from "../../hooks/useManagementDashboardData";

export default function ManagementSettingsModal({
  isOpen,
  onClose,
  targets,
  onSaveTargets,
}) {
  const [formData, setFormData] = useState(targets);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(targets);
      setSavedSuccess(false);
    }
  }, [isOpen, targets]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleReset = () => {
    setFormData(DEFAULT_TARGETS);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveTargets({
      overallProd: Number(formData.overallProd) || DEFAULT_TARGETS.overallProd,
      weeklyProd: (Number(formData.dailyProd) || DEFAULT_TARGETS.dailyProd) * 7,
      dailyProd: Number(formData.dailyProd) || DEFAULT_TARGETS.dailyProd,
      shiftsPerDay: Number(formData.shiftsPerDay) || DEFAULT_TARGETS.shiftsPerDay,
      overallFw: Number(formData.overallFw) || DEFAULT_TARGETS.overallFw,
      weeklyFw: (Number(formData.dailyFw) || DEFAULT_TARGETS.dailyFw) * 7,
      dailyFw: Number(formData.dailyFw) || DEFAULT_TARGETS.dailyFw,
      baselineDefects: Number(formData.baselineDefects) || DEFAULT_TARGETS.baselineDefects,
      consumptionRateMode: formData.consumptionRateMode || "adaptive",
      fixedConsumptionRate: Number(formData.fixedConsumptionRate) || DEFAULT_TARGETS.fixedConsumptionRate,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 620 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: "18px 24px", borderBottom: "1.5px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sliders size={20} color="#0284c7" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--navy)" }}>
                Executive Target Baselines & Configuration
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                Customize contract targets, daily rates, shifts count, and calibration benchmarks
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "20px 24px", maxHeight: "70vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Group 1: 3-Phase Assembly Targets */}
            <div style={{ background: "#f8fafc", padding: "16px 18px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "0.84rem", fontWeight: 800, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 12 }}>
                1. Assembly Production Targets (3-Phase)
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group">
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Total Contract Target (Meters)</label>
                  <input
                    type="number"
                    value={formData.overallProd}
                    onChange={(e) => handleChange("overallProd", e.target.value)}
                    required
                    style={{ fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Daily Target (Meters / Day)</label>
                  <input
                    type="number"
                    value={formData.dailyProd}
                    onChange={(e) => handleChange("dailyProd", e.target.value)}
                    required
                    style={{ fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Operating Shifts per Day</label>
                  <select
                    value={formData.shiftsPerDay || 2}
                    onChange={(e) => handleChange("shiftsPerDay", e.target.value)}
                    style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #cbd5e1", fontWeight: 700 }}
                  >
                    <option value={1}>1 Shift / Day</option>
                    <option value={2}>2 Shifts / Day (Standard)</option>
                    <option value={3}>3 Shifts / Day (24/7 Continuous)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Calculated Shift Target</label>
                  <input
                    type="text"
                    disabled
                    value={`${Math.round((Number(formData.dailyProd) || 0) / (Number(formData.shiftsPerDay) || 2))} meters/shift`}
                    style={{ background: "#e2e8f0", color: "#475569", fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}
                  />
                </div>
              </div>
            </div>

            {/* Group 2: Firmware Targets */}
            <div style={{ background: "#faf5ff", padding: "16px 18px", borderRadius: 12, border: "1px solid #e9d5ff" }}>
              <span style={{ fontSize: "0.84rem", fontWeight: 800, color: "#6b21a8", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 12 }}>
                2. Firmware Flashing Targets
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group">
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Overall FW Milestone Target</label>
                  <input
                    type="number"
                    value={formData.overallFw}
                    onChange={(e) => handleChange("overallFw", e.target.value)}
                    required
                    style={{ fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Daily FW Flashing Target</label>
                  <input
                    type="number"
                    value={formData.dailyFw}
                    onChange={(e) => handleChange("dailyFw", e.target.value)}
                    required
                    style={{ fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}
                  />
                </div>
              </div>
            </div>

            {/* Group 3: Calibration & Runway Benchmarks */}
            <div style={{ background: "#f0fdf4", padding: "16px 18px", borderRadius: 12, border: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: "0.84rem", fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 12 }}>
                3. Defect Calibration & Kit Inventory Runway
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group">
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Historical Defect Baseline (Meters)</label>
                  <input
                    type="number"
                    value={formData.baselineDefects}
                    onChange={(e) => handleChange("baselineDefects", e.target.value)}
                    required
                    style={{ fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Consumption Rate Mode</label>
                  <select
                    value={formData.consumptionRateMode || "adaptive"}
                    onChange={(e) => handleChange("consumptionRateMode", e.target.value)}
                    style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #cbd5e1", fontWeight: 700 }}
                  >
                    <option value="adaptive">Adaptive (Last 7-day actual run-rate)</option>
                    <option value="fixed">Fixed Benchmark Rate</option>
                  </select>
                </div>
                {formData.consumptionRateMode === "fixed" && (
                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Fixed Consumption Rate (Meters / Day)</label>
                    <input
                      type="number"
                      value={formData.fixedConsumptionRate || 1200}
                      onChange={(e) => handleChange("fixedConsumptionRate", e.target.value)}
                      required
                      style={{ fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "#64748b" }}>
              <Info size={15} color="#0284c7" />
              <span>Configured targets are saved locally to your browser and persist across sessions.</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ padding: "16px 24px", borderTop: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
            <button
              type="button"
              className="btn-outline"
              onClick={handleReset}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", padding: "8px 14px", background: "#ffffff" }}
            >
              <RotateCcw size={14} />
              Reset to Factory Defaults
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn-outline"
                onClick={onClose}
                style={{ padding: "8px 16px", background: "#ffffff" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: "8px 20px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Check size={16} />
                {savedSuccess ? "Saved Successfully!" : "Save Baselines"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
