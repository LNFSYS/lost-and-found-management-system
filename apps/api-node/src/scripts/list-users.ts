import { dbPool } from "../config/db.js";

async function main() {
  const [users] = await dbPool.query(
    `SELECT u.id, u.email, u.full_name, u.status, GROUP_CONCAT(r.code) as roles
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     GROUP BY u.id`
  );
  console.log("Users in Database:");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await dbPool.end();
  });
