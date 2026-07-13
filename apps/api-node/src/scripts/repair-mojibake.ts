import { dbPool } from "../config/db.js";
import type { RowDataPacket } from "mysql2/promise";

interface TextColumnRow extends RowDataPacket {
  tableName: string;
  columnName: string;
}

interface TextValueRow extends RowDataPacket {
  id: string;
  value: string | null;
}

const applyChanges = process.argv.includes("--apply");
const mojibakePattern = /(?:\u00c3.|\u00c2.|\u00c4.|\u00c6.|\u00e1[\u00ba\u00bb])/g;

// Windows-1252 characters that cannot be represented by Node's latin1 codec.
const windows1252Bytes = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85], [0x2020, 0x86],
  [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95],
  [0x2013, 0x96], [0x2014, 0x97], [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f]
]);

function quoteIdentifier(identifier: string) {
  return `\`${identifier.replaceAll("`", "``")}\``;
}

function mojibakeScore(value: string) {
  return value.match(mojibakePattern)?.length ?? 0;
}

function repairVietnameseMojibake(value: string) {
  if (mojibakeScore(value) === 0) {
    return null;
  }

  const bytes: number[] = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    const mappedByte = windows1252Bytes.get(codePoint);
    if (mappedByte !== undefined) {
      bytes.push(mappedByte);
    } else if (codePoint <= 0xff) {
      bytes.push(codePoint);
    } else {
      return null;
    }
  }

  try {
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
    return repaired !== value && mojibakeScore(repaired) < mojibakeScore(value) ? repaired : null;
  } catch {
    return null;
  }
}

async function listTextColumns() {
  const [rows] = await dbPool.query<TextColumnRow[]>(
    `
      SELECT c.table_name AS tableName, c.column_name AS columnName
      FROM information_schema.columns c
      INNER JOIN information_schema.columns id_column
        ON id_column.table_schema = c.table_schema
        AND id_column.table_name = c.table_name
        AND id_column.column_name = 'id'
      WHERE c.table_schema = DATABASE()
        AND c.data_type IN ('char', 'varchar', 'text', 'mediumtext', 'longtext')
        AND c.table_name <> 'schema_migrations'
      ORDER BY c.table_name, c.ordinal_position
    `
  );
  return rows;
}

async function main() {
  const columns = await listTextColumns();
  let candidates = 0;
  let repaired = 0;

  if (applyChanges) {
    console.warn("Applying reversible text repairs. Back up a shared/demo database before running this command.");
  } else {
    console.log("Dry run only. Re-run with --apply after reviewing the output.");
  }

  for (const column of columns) {
    const table = quoteIdentifier(column.tableName);
    const field = quoteIdentifier(column.columnName);
    const [rows] = await dbPool.query<TextValueRow[]>(
      `SELECT id, ${field} AS value FROM ${table} WHERE ${field} IS NOT NULL`
    );

    for (const row of rows) {
      if (!row.value) {
        continue;
      }
      const nextValue = repairVietnameseMojibake(row.value);
      if (!nextValue) {
        continue;
      }

      candidates += 1;
      console.log(`${column.tableName}.${column.columnName} id=${row.id}: ${JSON.stringify(row.value)} -> ${JSON.stringify(nextValue)}`);
      if (applyChanges) {
        await dbPool.execute(`UPDATE ${table} SET ${field} = ? WHERE id = ?`, [nextValue, row.id]);
        repaired += 1;
      }
    }
  }

  console.log(
    applyChanges
      ? `Encoding repair completed: ${repaired}/${candidates} value(s) updated.`
      : `Encoding repair dry run completed: ${candidates} value(s) can be repaired.`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbPool.end();
  });
