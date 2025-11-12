export function formatRelativeTime(value: string): string {
  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const date = new Date(value);
  const deltaMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, "minute");
  }
  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, "hour");
  }
  const deltaDays = Math.round(deltaHours / 24);
  return formatter.format(deltaDays, "day");
}
