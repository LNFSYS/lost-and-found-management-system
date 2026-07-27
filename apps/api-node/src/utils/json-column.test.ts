import assert from "node:assert/strict";
import test from "node:test";
import { parseJsonObjectColumn } from "./json-column.js";

test("parseJsonObjectColumn accepts MySQL JSON objects", () => {
  const metadata = { source: "warehouse", count: 2 };

  assert.deepEqual(parseJsonObjectColumn(metadata), metadata);
});

test("parseJsonObjectColumn accepts serialized JSON and buffers", () => {
  const expected = { action: "STATUS_CHANGED" };

  assert.deepEqual(parseJsonObjectColumn(JSON.stringify(expected)), expected);
  assert.deepEqual(
    parseJsonObjectColumn(Buffer.from(JSON.stringify(expected), "utf8")),
    expected
  );
});

test("parseJsonObjectColumn rejects empty, malformed, and non-object values", () => {
  assert.equal(parseJsonObjectColumn(null), null);
  assert.equal(parseJsonObjectColumn(""), null);
  assert.equal(parseJsonObjectColumn("{invalid"), null);
  assert.equal(parseJsonObjectColumn("[1,2,3]"), null);
  assert.equal(parseJsonObjectColumn(42), null);
});
