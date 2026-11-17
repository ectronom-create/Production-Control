import { getTodayString } from "./date";

export { getTodayString };

export function getBatchStatus(dateStr, notes = "") {
  const today = getTodayString();
  if (!dateStr) {
    return {
      isPlanned: false,
      label: "Received",
      sublabel: "Received",
      daysDiff: 0,
      color: "#15803d",
      bg: "#dcfce7",
      border: "#bbf7d0",
    };
  }

  const isPlanNote =
    typeof notes === "string" && notes.toLowerCase().includes("plan");
  const isPlanned = dateStr > today || (dateStr === today && isPlanNote);

  if (isPlanned) {
    const dToday = new Date(today + "T00:00:00");
    const dTarget = new Date(dateStr + "T00:00:00");
    const diffDays = Math.max(
      0,
      Math.ceil((dTarget - dToday) / (1000 * 60 * 60 * 24)),
    );
    return {
      isPlanned: true,
      label: "Delivery Plan",
      sublabel:
        diffDays === 0
          ? "Today (Expected)"
          : diffDays === 1
            ? "Tomorrow"
            : `In ${diffDays} days`,
      daysDiff: diffDays,
      color: "#4338ca",
      bg: "#eef2ff",
      border: "#c7d2fe",
    };
  } else {
    const dToday = new Date(today + "T00:00:00");
    const dTarget = new Date(dateStr + "T00:00:00");
    const diffDays = Math.floor((dToday - dTarget) / (1000 * 60 * 60 * 24));
    return {
      isPlanned: false,
      label: "Received",
      sublabel:
        diffDays === 0
          ? "Today"
          : diffDays === 1
            ? "Yesterday"
            : `${diffDays}d ago`,
      daysDiff: -diffDays,
      color: "#15803d",
      bg: "#dcfce7",
      border: "#bbf7d0",
    };
  }
}
