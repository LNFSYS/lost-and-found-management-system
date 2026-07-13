export function isConfigured(value: string | undefined): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed !== "YOUR_VALUE_HERE");
}
