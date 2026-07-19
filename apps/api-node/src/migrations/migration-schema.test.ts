import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const migrationsDirectory = path.dirname(fileURLToPath(import.meta.url));

test("CREATE TABLE migrations declare the canonical InnoDB charset and collation", async () => {
  const filenames = (await readdir(migrationsDirectory)).filter((filename) => filename.endsWith(".sql"));

  for (const filename of filenames) {
    const sql = await readFile(path.join(migrationsDirectory, filename), "utf8");
    const createTableCount = sql.match(/CREATE\s+TABLE/gi)?.length ?? 0;
    if (createTableCount === 0) {
      continue;
    }

    assert.equal(
      sql.match(/ENGINE\s*=\s*InnoDB/gi)?.length ?? 0,
      createTableCount,
      `${filename} must declare ENGINE=InnoDB for every table`
    );
    assert.equal(
      sql.match(/DEFAULT\s+CHARSET\s*=\s*utf8mb4\s+COLLATE\s*=\s*utf8mb4_unicode_ci/gi)?.length ?? 0,
      createTableCount,
      `${filename} must use the canonical utf8mb4 collation for every table`
    );
  }
});
