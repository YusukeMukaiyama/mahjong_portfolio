(function (global) {
  function resolveHistoryRowName(row, participantNameById, fallbackNames) {
    const pid = row?.participant_id != null ? String(row.participant_id) : "";
    if (pid && participantNameById && typeof participantNameById.get === "function") {
      const nameFromMap = participantNameById.get(pid);
      if (typeof nameFromMap === "string" && nameFromMap.length) return nameFromMap;
    }

    const displayName = typeof row?.display_name === "string" ? row.display_name.trim() : "";
    if (displayName) return displayName;

    const seatIndex = Number(row?.seat_index);
    if (Number.isInteger(seatIndex) && Array.isArray(fallbackNames) && seatIndex >= 0 && seatIndex < fallbackNames.length) {
      const fallback = fallbackNames[seatIndex];
      if (typeof fallback === "string" && fallback.length) return fallback;
    }
    return Number.isInteger(seatIndex) ? `Seat ${seatIndex}` : "Seat ?";
  }

  global.resolveHistoryRowName = resolveHistoryRowName;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { resolveHistoryRowName };
  }
})(typeof window !== "undefined" ? window : globalThis);
