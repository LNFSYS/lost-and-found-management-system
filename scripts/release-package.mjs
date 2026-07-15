import { execFileSync } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();
const outputArgument = process.argv[2];
const outputPath = path.resolve(repoRoot, outputArgument || "../fptu-lost-found-system-release.zip");
const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
  cwd: repoRoot,
  encoding: "utf8"
}).trim();

if (status) {
  console.error("Release packaging requires a clean Git working tree so the ZIP matches the reviewed commit.");
  process.exit(1);
}

execFileSync("git", ["archive", "--format=zip", `--output=${outputPath}`, "HEAD"], {
  cwd: repoRoot,
  stdio: "inherit"
});

console.log(`Created release-safe archive: ${outputPath}`);
console.log("The archive contains tracked files from HEAD only; ignored .env, dependencies and build outputs are excluded.");
