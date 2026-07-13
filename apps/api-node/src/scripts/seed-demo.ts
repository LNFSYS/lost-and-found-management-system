import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { dbPool } from "../config/db.js";
import { env } from "../config/env.js";
import { normalizeEmail } from "../utils/normalize-email.js";

interface IdRow extends RowDataPacket {
  id: string;
}

type DemoRole = "ADMIN" | "STAFF" | "STUDENT" | "LECTURER";

const demoPassword = process.env.DEMO_PASSWORD ?? "12345678";

async function ensureRole(code: DemoRole | "USER", name: string) {
  await dbPool.execute(
    `
      INSERT INTO roles (id, code, name, description)
      SELECT ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = ?)
    `,
    [randomUUID(), code, name, `${name} role`, code]
  );
}

async function getId(query: string, params: unknown[]) {
  const [rows] = await dbPool.query<IdRow[]>(query, params);
  return rows[0]?.id ?? null;
}

async function upsertUser(input: { email: string; fullName: string; role: DemoRole }) {
  const normalizedEmail = normalizeEmail(input.email);
  const passwordHash = await bcrypt.hash(demoPassword, env.bcryptSaltRounds);

  await dbPool.execute(
    `
      INSERT INTO users (
        id, email, normalized_email, password_hash, full_name, status, email_verified_at, failed_login_count
      )
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), 0)
      ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        full_name = VALUES(full_name),
        status = 'ACTIVE',
        email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()),
        failed_login_count = 0,
        locked_until = NULL,
        deleted_at = NULL
    `,
    [randomUUID(), input.email, normalizedEmail, passwordHash, input.fullName]
  );

  const userId = await getId("SELECT id FROM users WHERE normalized_email = ? LIMIT 1", [normalizedEmail]);
  if (!userId) {
    throw new Error(`Unable to create demo user ${input.email}`);
  }

  for (const roleCode of ["USER", input.role] as const) {
    const roleId = await getId("SELECT id FROM roles WHERE code = ? LIMIT 1", [roleCode]);
    if (!roleId) {
      throw new Error(`Missing role ${roleCode}`);
    }
    await dbPool.execute("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleId]);
  }

  return userId;
}

async function ensureHandoverPoint(input: {
  name: string;
  address: string;
  openingHours: string;
  contactInfo: string;
  mapPositionX: number;
  mapPositionY: number;
  createdBy: string;
}) {
  await dbPool.execute(
    `
      INSERT INTO handover_points (
        id, name, address, opening_hours, contact_info, is_active, map_position_x, map_position_y, created_by
      )
      SELECT ?, ?, ?, ?, ?, TRUE, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM handover_points WHERE name = ?)
    `,
    [
      randomUUID(),
      input.name,
      input.address,
      input.openingHours,
      input.contactInfo,
      input.mapPositionX,
      input.mapPositionY,
      input.createdBy,
      input.name
    ]
  );
}

async function ensureWarehouseItem(input: {
  handoverPointName: string;
  itemName: string;
  description: string;
  storageCode: string;
  createdBy: string;
}) {
  const handoverPointId = await getId("SELECT id FROM handover_points WHERE name = ? LIMIT 1", [input.handoverPointName]);
  if (!handoverPointId) {
    return;
  }

  await dbPool.execute(
    `
      INSERT INTO warehouse_items (
        id, handover_point_id, item_name, description, status, condition_notes, storage_code, created_by
      )
      SELECT ?, ?, ?, ?, 'STORED', 'Demo seed item', ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM warehouse_items WHERE storage_code = ? AND deleted_at IS NULL
      )
    `,
    [randomUUID(), handoverPointId, input.itemName, input.description, input.storageCode, input.createdBy, input.storageCode]
  );
}

async function main() {
  await ensureRole("USER", "User");
  await ensureRole("STUDENT", "Student");
  await ensureRole("LECTURER", "Lecturer");
  await ensureRole("STAFF", "Staff");
  await ensureRole("ADMIN", "Admin");

  const adminId = await upsertUser({ email: "adminlnf@gmail.com", fullName: "LNF Demo Admin", role: "ADMIN" });
  const staffId = await upsertUser({ email: "stafflnf@gmail.com", fullName: "LNF Demo Staff", role: "STAFF" });
  await upsertUser({ email: "studentlnf@gmail.com", fullName: "LNF Demo Student", role: "STUDENT" });
  await upsertUser({ email: "lecturerlnf@gmail.com", fullName: "LNF Demo Lecturer", role: "LECTURER" });

  await ensureHandoverPoint({
    name: "Alpha Lobby Handover Desk",
    address: "Alpha lobby, FPTU Da Nang",
    openingHours: "08:00 - 17:30",
    contactInfo: "Student Services",
    mapPositionX: 82,
    mapPositionY: 48,
    createdBy: adminId
  });
  await ensureHandoverPoint({
    name: "Main Gate Security Desk",
    address: "Main gate security room",
    openingHours: "24/7",
    contactInfo: "Campus Security",
    mapPositionX: 90,
    mapPositionY: 64,
    createdBy: adminId
  });
  await ensureHandoverPoint({
    name: "Quầy đồ nhặt được tại căng tin",
    address: "Main canteen counter",
    openingHours: "07:30 - 21:00",
    contactInfo: "Canteen team",
    mapPositionX: 35,
    mapPositionY: 55,
    createdBy: adminId
  });

  await ensureWarehouseItem({
    handoverPointName: "Alpha Lobby Handover Desk",
    itemName: "Demo AirPods case",
    description: "White wireless earbud case for matching and warehouse demo.",
    storageCode: "DEMO-ALPHA-001",
    createdBy: staffId
  });
  await ensureWarehouseItem({
    handoverPointName: "Main Gate Security Desk",
    itemName: "Demo student ID card",
    description: "Student ID card sample for handover point stock count.",
    storageCode: "DEMO-GATE-001",
    createdBy: staffId
  });

  console.log("Demo seed completed.");
  console.log(`Admin: adminlnf@gmail.com / ${demoPassword}`);
  console.log(`Staff: stafflnf@gmail.com / ${demoPassword}`);
  console.log(`Student: studentlnf@gmail.com / ${demoPassword}`);
  console.log(`Lecturer: lecturerlnf@gmail.com / ${demoPassword}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void dbPool.end();
  });
