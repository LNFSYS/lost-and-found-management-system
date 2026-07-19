const startedAt = Date.now();
const durationBucketsMs = [50, 100, 250, 500, 1_000, 2_500, 5_000];

interface HttpMetric {
  count: number;
  durationMs: number;
  buckets: number[];
}

const httpMetrics = new Map<string, HttpMetric>();
const counters = new Map<string, number>();
const gauges = new Map<string, number>();
let activeSockets = 0;

function safeLabel(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n");
}

function counterKey(name: string, labels: Record<string, string>) {
  return `${name}:${Object.entries(labels).sort().map(([key, value]) => `${key}=${value}`).join(",")}`;
}

export const metricsService = {
  recordHttpRequest(method: string, route: string, status: number, durationMs: number) {
    const normalizedRoute = route || "unmatched";
    const key = JSON.stringify([method, normalizedRoute, status]);
    const metric = httpMetrics.get(key) ?? {
      count: 0,
      durationMs: 0,
      buckets: durationBucketsMs.map(() => 0)
    };
    metric.count += 1;
    metric.durationMs += durationMs;
    durationBucketsMs.forEach((bucket, index) => {
      if (durationMs <= bucket) {
        metric.buckets[index] += 1;
      }
    });
    httpMetrics.set(key, metric);
  },

  increment(name: string, labels: Record<string, string> = {}, amount = 1) {
    const key = counterKey(name, labels);
    counters.set(key, (counters.get(key) ?? 0) + amount);
  },

  setGauge(name: string, value: number) {
    gauges.set(name, Number.isFinite(value) ? value : 0);
  },

  socketConnected() {
    activeSockets += 1;
  },

  socketDisconnected() {
    activeSockets = Math.max(0, activeSockets - 1);
  },

  renderPrometheus() {
    const memory = process.memoryUsage();
    const lines = [
      "# HELP lnfs_process_uptime_seconds API process uptime.",
      "# TYPE lnfs_process_uptime_seconds gauge",
      `lnfs_process_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
      "# HELP lnfs_process_resident_memory_bytes Resident memory used by the API process.",
      "# TYPE lnfs_process_resident_memory_bytes gauge",
      `lnfs_process_resident_memory_bytes ${memory.rss}`,
      "# HELP lnfs_process_heap_used_bytes JavaScript heap used by the API process.",
      "# TYPE lnfs_process_heap_used_bytes gauge",
      `lnfs_process_heap_used_bytes ${memory.heapUsed}`,
      "# HELP lnfs_socket_connections Active Socket.IO connections in this process.",
      "# TYPE lnfs_socket_connections gauge",
      `lnfs_socket_connections ${activeSockets}`,
      "# HELP lnfs_http_requests_total HTTP requests handled by route and status.",
      "# TYPE lnfs_http_requests_total counter",
      "# HELP lnfs_http_request_duration_milliseconds HTTP request duration histogram.",
      "# TYPE lnfs_http_request_duration_milliseconds histogram"
    ];

    for (const [key, metric] of httpMetrics) {
      const [method, route, status] = JSON.parse(key) as [string, string, number];
      const labels = `method="${safeLabel(method)}",route="${safeLabel(route)}",status="${status}"`;
      lines.push(`lnfs_http_requests_total{${labels}} ${metric.count}`);
      durationBucketsMs.forEach((bucket, index) => {
        lines.push(`lnfs_http_request_duration_milliseconds_bucket{${labels},le="${bucket}"} ${metric.buckets[index]}`);
      });
      lines.push(`lnfs_http_request_duration_milliseconds_bucket{${labels},le="+Inf"} ${metric.count}`);
      lines.push(`lnfs_http_request_duration_milliseconds_sum{${labels}} ${metric.durationMs.toFixed(3)}`);
      lines.push(`lnfs_http_request_duration_milliseconds_count{${labels}} ${metric.count}`);
    }

    for (const [key, value] of counters) {
      const separator = key.indexOf(":");
      const name = separator >= 0 ? key.slice(0, separator) : key;
      const rawLabels = separator >= 0 ? key.slice(separator + 1) : "";
      const labels = rawLabels
        ? `{${rawLabels.split(",").map((entry) => {
            const [label, labelValue] = entry.split("=");
            return `${label}="${safeLabel(labelValue)}"`;
          }).join(",")}}`
        : "";
      lines.push(`${name}${labels} ${value}`);
    }
    for (const [name, value] of gauges) {
      lines.push(`${name} ${value}`);
    }

    return `${lines.join("\n")}\n`;
  },

  resetForTest() {
    httpMetrics.clear();
    counters.clear();
    gauges.clear();
    activeSockets = 0;
  }
};
