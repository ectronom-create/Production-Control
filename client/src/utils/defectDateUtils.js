export const getTodayDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getDaysAgoDateStr = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getMeterDateStr = (meter) => {
  if (!meter) return "";
  const raw =
    meter.logged_at ||
    meter.created_at ||
    (Array.isArray(meter.history) && meter.history[0]?.logged_at) ||
    meter.date;
  if (!raw) return "";

  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return raw.trim();
  }

  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      if (
        typeof raw === "string" &&
        raw.length >= 10 &&
        /^\d{4}-\d{2}-\d{2}/.test(raw)
      ) {
        return raw.slice(0, 10);
      }
      return "";
    }
    const y = d.getFullYear();
    const mth = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${mth}-${day}`;
  } catch {
    return "";
  }
};
