import bcrypt from "bcryptjs";
import { dbPool } from "../config/db.js";

async function main() {
  const hash = await bcrypt.hash("Password123!", 10);
  const [result] = await dbPool.query(
    "UPDATE users SET password_hash = ?",
    [hash]
  );
  console.log("Passwords reset successfully:", result);
}

main()
  .catch(console.error)
  .finally(async () => {
    await dbPool.end();
  });
