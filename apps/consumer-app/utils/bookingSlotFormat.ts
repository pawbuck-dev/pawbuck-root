/** Local calendar day YYYY-MM-DD from an ISO instant (device timezone). */
export function localDateKeyFromUtc(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const p = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${y}-${p(m)}-${p(day)}`;
}

/** e.g. "9:30 AM" in device locale. */
export function formatTimeLabelFromUtc(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
