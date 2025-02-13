export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Runde auf maximal eine Dezimalstelle
  const value = bytes / Math.pow(k, i);
  const roundedValue = Math.round(value * 10) / 10;

  return `${roundedValue} ${sizes[i]}`;
}
