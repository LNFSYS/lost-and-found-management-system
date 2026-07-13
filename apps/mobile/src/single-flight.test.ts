import assert from "node:assert/strict";
import test from "node:test";
import { SingleFlight } from "./single-flight.js";

test("concurrent callers share one refresh operation", async () => {
  const gate = new SingleFlight<string>();
  let calls = 0;
  const refresh = () =>
    gate.run(async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return "refreshed";
    });

  const results = await Promise.all(Array.from({ length: 12 }, refresh));
  assert.equal(calls, 1);
  assert.deepEqual(results, Array.from({ length: 12 }, () => "refreshed"));
});

test("a completed or failed operation does not permanently lock the gate", async () => {
  const gate = new SingleFlight<number>();
  await assert.rejects(() => gate.run(async () => Promise.reject(new Error("expired"))));
  const value = await gate.run(async () => 2);
  assert.equal(value, 2);
});
