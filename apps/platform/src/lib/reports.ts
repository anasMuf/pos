export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Default report window: first day of the current month through today.
export function defaultReportRange(today = new Date()): { from: string; to: string } {
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: toISODate(start), to: toISODate(today) };
}
