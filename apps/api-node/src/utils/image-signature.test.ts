import assert from "node:assert/strict";
import test from "node:test";
import { detectImageFormat, hasMatchingImageSignature } from "./image-signature.js";

test("detects supported image signatures", () => {
  assert.equal(detectImageFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "jpg");
  assert.equal(detectImageFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.equal(detectImageFormat(Buffer.from("RIFF0000WEBP", "ascii")), "webp");
});

test("rejects spoofed or mismatched image content", () => {
  assert.equal(detectImageFormat(Buffer.from("not an image")), null);
  assert.equal(hasMatchingImageSignature(Buffer.from("not an image"), "image/png"), false);
  assert.equal(hasMatchingImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/png"), false);
  assert.equal(hasMatchingImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"), true);
});
