const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
// Listen on this computer only — not reachable from other devices on the network.
const HOST = process.env.HOST || "127.0.0.1";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((o) => o.trim());

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const SHIFTS = new Set(["Morning", "Evening"]);
const MAX_TARGETS = 100000;

app.disable("x-powered-by");
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  }),
);
app.use(express.json({ limit: "5mb" }));

// Read LOG.csv only when it changed (the files are large and read per request).
const logCache = new Map(); // path -> { mtimeMs, lines }
function readLogLines(file) {
  const { mtimeMs } = fs.statSync(file);
  const cached = logCache.get(file);
  if (cached && cached.mtimeMs === mtimeMs) return cached.lines;
  const lines = fs.readFileSync(file, "utf8").split("\n");
  logCache.set(file, { mtimeMs, lines });
  return lines;
}

function sendServerError(res, err) {
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

// Endpoint to sync FW count directly from master LOG.csv files on Google Drive
app.get("/api/sync-fw", (req, res) => {
  try {
    const targetDate = String(req.query.date || ""); // YYYY-MM-DD
    const targetShift = String(req.query.shift || ""); // Morning or Evening

    if (!DATE_RE.test(targetDate) || !SHIFTS.has(targetShift)) {
      return res.status(400).json({ error: "Invalid date or shift" });
    }

    const [yStr, mStr, dStr] = targetDate.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    const targetDateDmy =
      String(d).padStart(2, "0") +
      "/" +
      String(m).padStart(2, "0") +
      "/" +
      yStr;

    const nextDate = new Date(y, m - 1, d);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateDmy =
      String(nextDate.getDate()).padStart(2, "0") +
      "/" +
      String(nextDate.getMonth() + 1).padStart(2, "0") +
      "/" +
      nextDate.getFullYear();

    const files = [
      "H:/Other computers/Update PC 1/LOG_CSV/LOG.csv",
      "H:/Other computers/Update PC 2/LOG_CSV/LOG.csv",
    ];

    const filesExist = files.some((f) => fs.existsSync(f));
    if (!filesExist) {
      const cloudUrl = `https://script.google.com/macros/s/AKfycbxHUCPbr7nKCtK9x1NuQ_ObGoyOlbB6GCUWw09dYhAVJODPpAdPuW7OBDxtZgyqRrq1Pw/exec?date=${encodeURIComponent(targetDate)}&shift=${encodeURIComponent(targetShift)}`;
      fetch(cloudUrl)
        .then((cr) => cr.json())
        .then((data) => res.json(data))
        .catch((e) => sendServerError(res, e));
      return;
    }

    const uniqueSn = new Set();
    const pcStats = {};

    files.forEach((f) => {
      if (!fs.existsSync(f)) return;
      const lines = readLogLines(f);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(";");
        if (parts.length < 7) continue;
        const rDate = parts[0]?.trim();
        const rTime = parts[1]?.trim();
        const sn = parts[2]?.trim();
        const status = parts[6]?.trim()?.toUpperCase();
        const pc = parts[7]?.trim() || "Unknown";

        if (status !== "PASS" || !sn) continue;

        const hour = parseInt((rTime || "00:00:00").split(":")[0], 10);

        let isMatch = false;
        if (targetShift === "Morning") {
          if (rDate === targetDateDmy && hour >= 6 && hour < 18) isMatch = true;
        } else {
          if (rDate === targetDateDmy && hour >= 18) isMatch = true;
          else if (rDate === nextDateDmy && hour < 6) isMatch = true;
        }

        if (isMatch) {
          uniqueSn.add(sn);
          pcStats[pc] = (pcStats[pc] || 0) + 1;
        }
      }
    });

    return res.json({
      success: true,
      date: targetDate,
      shift: targetShift,
      count: uniqueSn.size,
      pcStats,
    });
  } catch (err) {
    return sendServerError(res, err);
  }
});

// Endpoint to check reconciliation of batch targets against Google Drive PASS logs by last 6 digits
app.post("/api/batch-fw-reconciliation", (req, res) => {
  try {
    // targets: Array of { batch_name, serial_number, sn_suffix }
    const targets = req.body?.targets || [];
    if (!Array.isArray(targets) || targets.length > MAX_TARGETS) {
      return res.status(400).json({ error: "Invalid targets" });
    }
    if (targets.length === 0) {
      return res.json({
        success: true,
        batches: {},
        totalTarget: 0,
        totalUpdated: 0,
        totalRemaining: 0,
      });
    }

    const files = [
      "H:/Other computers/Update PC 1/LOG_CSV/LOG.csv",
      "H:/Other computers/Update PC 2/LOG_CSV/LOG.csv",
    ];

    // Map: 6-digit suffix -> { date, time, pc, fullSn }
    const updatedSuffixMap = new Map();

    files.forEach((f) => {
      if (!fs.existsSync(f)) return;
      const lines = readLogLines(f);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(";");
        if (parts.length < 7) continue;
        const rDate = parts[0]?.trim();
        const rTime = parts[1]?.trim();
        const sn = parts[2]?.trim();
        const status = parts[6]?.trim()?.toUpperCase();
        const pc = parts[7]?.trim() || "Unknown";

        if (status !== "PASS" || !sn || sn === "SAG1030712345678") continue;
        const suffix = sn.slice(-6);
        if (suffix.length === 6 && !updatedSuffixMap.has(suffix)) {
          updatedSuffixMap.set(suffix, {
            date: rDate,
            time: rTime,
            pc,
            driveSn: sn,
          });
        }
      }
    });

    // Group results by batch_name
    const batchSummary = {};
    let totalTarget = 0;
    let totalUpdated = 0;

    targets.forEach((item) => {
      const bName = (item.batch_name || "General").trim();
      const sn = String(item.serial_number || "").trim();
      const suffix = item.sn_suffix
        ? String(item.sn_suffix).trim()
        : sn.slice(-6);

      if (!batchSummary[bName]) {
        batchSummary[bName] = {
          batchName: bName,
          targetCount: 0,
          updatedCount: 0,
          remainingCount: 0,
          updatedList: [],
          pendingList: [],
        };
      }

      batchSummary[bName].targetCount++;
      totalTarget++;

      if (updatedSuffixMap.has(suffix)) {
        const matchInfo = updatedSuffixMap.get(suffix);
        batchSummary[bName].updatedCount++;
        totalUpdated++;
        batchSummary[bName].updatedList.push({
          serial_number: sn,
          suffix,
          updated_at: `${matchInfo.date} ${matchInfo.time}`,
          pc: matchInfo.pc,
          drive_sn: matchInfo.driveSn,
        });
      } else {
        batchSummary[bName].remainingCount++;
        batchSummary[bName].pendingList.push({
          serial_number: sn,
          suffix,
        });
      }
    });

    // Compute percentages
    Object.values(batchSummary).forEach((b) => {
      b.progressPct =
        b.targetCount > 0
          ? parseFloat(((b.updatedCount / b.targetCount) * 100).toFixed(1))
          : 0;
      b.remainingCount = b.targetCount - b.updatedCount;
    });

    return res.json({
      success: true,
      batches: batchSummary,
      totalTarget,
      totalUpdated,
      totalRemaining: totalTarget - totalUpdated,
      overallProgressPct:
        totalTarget > 0
          ? parseFloat(((totalUpdated / totalTarget) * 100).toFixed(1))
          : 0,
    });
  } catch (err) {
    return sendServerError(res, err);
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, HOST, () => {
  console.log(`ECTRON API Server running on http://${HOST}:${PORT}`);
});
