import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { createApp } from "../app.js";
import { metricsService } from "./metrics.service.js";

test("health responses expose request IDs and metrics use bounded route labels", async () => {
  metricsService.resetForTest();
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  try {
    const requestId = "test-request-id-123";
    const health = await fetch(`${baseUrl}/health`, { headers: { "X-Request-Id": requestId } });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get("x-request-id"), requestId);

    const metrics = await fetch(`${baseUrl}/metrics`);
    assert.equal(metrics.status, 200);
    const output = await metrics.text();
    assert.match(output, /lnfs_http_requests_total\{method="GET",route="\/api\/health",status="200"\} 1/);
    assert.doesNotMatch(output, /test-request-id-123/);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
