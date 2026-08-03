import assert from "node:assert/strict";
import test from "node:test";
import { searchCompanionInternals } from "./search-companion.service.js";

test("Search Companion keeps only the final four serial characters", () => {
  assert.equal(
    searchCompanionInternals.normalizeAnswer({ field: "partialSerial", value: "SN-ABCD-12345678" }),
    "5678"
  );
});
test("public Search Companion text excludes private ownership signals", () => {
  const lines = searchCompanionInternals.publicSupplement({
    primaryColor: "xanh",
    brand: "Sony",
    routeAreas: ["Alpha", "Beta"],
    distinguishingMarks: "vết xước hình chữ X",
    partialSerial: "5678"
  });
  const text = lines.join(" ");
  assert.match(text, /Sony/);
  assert.match(text, /Alpha/);
  assert.doesNotMatch(text, /5678|chữ X/);
});

test("supplemental matching text can use private answers without returning FOUND details", () => {
  const text = searchCompanionInternals.supplementalText({ accessories: "ốp xanh", partialSerial: "1234" });
  assert.match(text, /ốp xanh/);
  assert.match(text, /1234/);
});
