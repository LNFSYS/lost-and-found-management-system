import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  cwd: repoRoot,
  encoding: "utf8"
})
  .split("\0")
  .filter(Boolean);

const forbiddenFilePatterns = [
  { name: "environment file", pattern: /(^|\/)\.env(?:\..+)?$/i, allow: /\.env\.example$/i },
  { name: "private key file", pattern: /\.(?:pem|key|p12|pfx)$/i },
  { name: "cloud credential file", pattern: /(?:service[-_]?account|credentials?)[^/]*\.json$/i }
];

const secretPatterns = [
  { name: "private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { name: "GitHub token", pattern: /\b(?:ghp|github_pat)_[0-9A-Za-z_]{20,}\b/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "credential-bearing database URL",
    pattern: /\b(?:mysql|postgres(?:ql)?):\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/i
  }
];

const findings = [];

for (const relativePath of trackedFiles) {
  const normalizedPath = relativePath.replaceAll("\\", "/");
  for (const rule of forbiddenFilePatterns) {
    if (rule.pattern.test(normalizedPath) && !(rule.allow?.test(normalizedPath))) {
      findings.push({ file: normalizedPath, line: null, rule: rule.name });
    }
  }

  const absolutePath = path.join(repoRoot, relativePath);
  const stats = fs.statSync(absolutePath);
  if (stats.size > 2 * 1024 * 1024) {
    continue;
  }
  const buffer = fs.readFileSync(absolutePath);
  if (buffer.includes(0)) {
    continue;
  }
  const lines = buffer.toString("utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of secretPatterns) {
      if (rule.pattern.test(line)) {
        findings.push({ file: normalizedPath, line: index + 1, rule: rule.name });
      }
    }
  });
}

if (findings.length > 0) {
  console.error(`Secret scan failed with ${findings.length} finding(s). Values are intentionally redacted.`);
  for (const finding of findings) {
    console.error(`${finding.file}${finding.line ? `:${finding.line}` : ""}: ${finding.rule}`);
  }
  process.exit(1);
}

console.log(`Secret scan passed for ${trackedFiles.length} tracked file(s).`);
