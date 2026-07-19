import assert from "node:assert/strict";
import test from "node:test";
import { metricsService } from "./metrics.service.js";

test("renders bounded HTTP and application metrics in Prometheus format", () => {
  metricsService.resetForTest();
  metricsService.recordHttpRequest("GET", "/api/posts/:id", 200, 42);
  metricsService.increment("lnfs_matching_jobs_total", { result: "completed" });
  metricsService.socketConnected();

  const output = metricsService.renderPrometheus();
  assert.match(output, /lnfs_http_requests_total\{method="GET",route="\/api\/posts\/:id",status="200"\} 1/);
  assert.match(output, /lnfs_http_request_duration_milliseconds_bucket.*le="50"\} 1/);
  assert.match(output, /lnfs_matching_jobs_total\{result="completed"\} 1/);
  assert.match(output, /lnfs_socket_connections 1/);
});
