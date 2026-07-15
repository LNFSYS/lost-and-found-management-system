export type SupportedImageFormat = "jpg" | "png" | "webp";

const mimeFormats = new Map<string, SupportedImageFormat>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

function hasBytes(buffer: Buffer, offset: number, bytes: number[]) {
  return bytes.every((value, index) => buffer[offset + index] === value);
}

export function detectImageFormat(buffer: Buffer): SupportedImageFormat | null {
  if (buffer.length >= 8 && hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (buffer.length >= 3 && hasBytes(buffer, 0, [0xff, 0xd8, 0xff])) {
    return "jpg";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export function imageFormatForMime(mimeType: string) {
  return mimeFormats.get(mimeType.toLowerCase()) ?? null;
}

export function hasMatchingImageSignature(buffer: Buffer, mimeType: string) {
  const expected = imageFormatForMime(mimeType);
  return expected !== null && detectImageFormat(buffer) === expected;
}
