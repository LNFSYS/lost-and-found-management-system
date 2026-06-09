export function isConfigured(value: string | undefined): value is string {
  return Boolean(value && value.trim() !== "" && value !== "YOUR_VALUE_HERE");
}
