export function parseJsonObjectColumn(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }

  let parsedValue: unknown = Buffer.isBuffer(value) ? value.toString("utf8") : value;

  if (typeof parsedValue === "string") {
    if (!parsedValue.trim()) {
      return null;
    }

    try {
      parsedValue = JSON.parse(parsedValue) as unknown;
    } catch {
      return null;
    }
  }

  if (
    typeof parsedValue !== "object" ||
    parsedValue === null ||
    Array.isArray(parsedValue)
  ) {
    return null;
  }

  return parsedValue as Record<string, unknown>;
}
