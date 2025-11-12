export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // ✅ Nutzerfreundliche Rundung: Keine Dezimalstellen für große Zahlen
  const value = bytes / Math.pow(k, i);
  let roundedValue: number;
  
  if (value >= 100) {
    // > 100: Keine Dezimalstellen (z.B. "156 MB")
    roundedValue = Math.round(value);
  } else if (value >= 10) {
    // 10-100: Ganze Zahlen (z.B. "45 MB")
    roundedValue = Math.round(value);
  } else {
    // < 10: 1 Dezimalstelle (z.B. "4.5 MB")
    roundedValue = Math.round(value * 10) / 10;
  }

  return `${roundedValue} ${sizes[i]}`;
}
