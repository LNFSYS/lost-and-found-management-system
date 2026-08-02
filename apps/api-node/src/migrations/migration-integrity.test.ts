import assert from "node:assert/strict";
import test from "node:test";
import { migrationChecksum, migrationLockName } from "./migration-integrity.js";

test("migration checksum is deterministic and detects content drift", () => {
  const original = migrationChecksum("ALTER TABLE users ADD COLUMN session_version INT;");
  assert.equal(original, migrationChecksum("ALTER TABLE users ADD COLUMN session_version INT;"));
  assert.notEqual(original, migrationChecksum("ALTER TABLE users ADD COLUMN session_version BIGINT;"));
  assert.match(original, /^[a-f0-9]{64}$/);
});

test("migration lock name is stable and within the MySQL named-lock limit", () => {
  const lockName = migrationLockName("lost_found_shared_development_database");
  assert.equal(lockName, migrationLockName("lost_found_shared_development_database"));
  assert.notEqual(lockName, migrationLockName("lost_found_demo_database"));
  assert.ok(lockName.length <= 64);
});
