import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const scanRoots = ["apps/api-node/src", "apps/web/src", "apps/mobile", "docs", "scripts"];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".sql", ".json"]);
const skippedDirectories = new Set(["node_modules", "dist", "build", ".git", "Archive"]);
const skippedFiles = new Set(["release-quality-check.mjs"]);
const mojibakePattern = /[\u00c3\u00c2\u00c4\u00c6\u0102\ufffd]|\u00e1\u00ba|\u00e1\u00bb/;
const brokenQuestionPattern = /"[^"]*\p{L}\?[\p{L}\?][^"]*"|'[^']*\p{L}\?[\p{L}\?][^']*'|>[^<]*\p{L}\?[\p{L}\?][^<]*</u;
const jsxQuestionSeparatorPattern = /\}\s*\?\s*\{/;
const knownBadVietnameseFragments = [
  "Li\u1ea8n",
  "B\u1ea8ng",
  "ch\u1ea8ng",
  "gi\u1ea8ng",
  "vi\u1ea8n",
  "l\u0110\u00f3ng",
  "B\u1ea8n",
  "v? tr?",
  "Chua co",
  "Dang tai",
  "Khong co",
  "Luu xu",
  "Quan ly",
  "Bao cao",
  "Khu vuc",
  "Nguoi dung",
  "Diem ban",
  "Tao bai",
  "??ng",
  "ch?a ??c",
  "Khong tai",
  "Khong gui",
  "Khong vao",
  "Khong mo",
  "Nh?n",
  "H?n",
  "Ch?n",
  "m?n",
];

function loadEnvFile(filePath, options = { overridePlaceholderValues: false }) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    const current = process.env[key];
    if (!current || (options.overridePlaceholderValues && !isConfigured(current) && isConfigured(value))) {
      process.env[key] = value;
    }
  }
}

function walk(dir, hits) {
  const fullDir = path.join(repoRoot, dir);
  if (!fs.existsSync(fullDir)) {
    return;
  }
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const fullPath = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) {
        walk(path.relative(repoRoot, fullPath), hits);
      }
      continue;
    }
    if (!allowedExtensions.has(path.extname(entry.name))) {
      continue;
    }
    if (skippedFiles.has(entry.name)) {
      continue;
    }
    const text = fs.readFileSync(fullPath, "utf8");
    text.split(/\r?\n/).forEach((line, index) => {
      if (
        mojibakePattern.test(line) ||
        brokenQuestionPattern.test(line) ||
        jsxQuestionSeparatorPattern.test(line) ||
        knownBadVietnameseFragments.some((fragment) => line.includes(fragment))
      ) {
        hits.push(`${path.relative(repoRoot, fullPath)}:${index + 1}: ${line.trim().slice(0, 180)}`);
      }
    });
  }
}

function isConfigured(value) {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed !== "YOUR_VALUE_HERE");
}

loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(repoRoot, "apps", "api-node", ".env"), { overridePlaceholderValues: true });

const textHits = [];
for (const root of scanRoots) {
  walk(root, textHits);
}

if (textHits.length > 0) {
  console.error(`Release text scan failed: ${textHits.length} suspicious line(s).`);
  for (const hit of textHits.slice(0, 80)) {
    console.error(hit);
  }
  process.exit(1);
}

const cloudinaryKeys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const missingCloudinary = cloudinaryKeys.filter((key) => !isConfigured(process.env[key]));
if (missingCloudinary.length > 0) {
  console.warn(
    `Release warning: missing ${missingCloudinary.join(", ")}. Live image upload is unavailable; use seeded images or configure Cloudinary before demo.`
  );
} else {
  console.log("Cloudinary config check passed.");
}

if (!isConfigured(process.env.GOOGLE_VISION_API_KEY) && !isConfigured(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.warn("Release warning: Google Vision credentials are missing. OCR/tagging may use fallback behavior.");
} else {
  console.log("Google Vision config check passed.");
}

console.log("Release text scan passed.");
