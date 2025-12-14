// lib/time.ts
export function getJstYmd(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // 例: "2025-12-11"
  return fmt.format(date);
}
