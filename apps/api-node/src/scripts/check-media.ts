import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('../../.env') });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'lnfs_user',
    password: process.env.DB_PASSWORD || 'lnfs_password',
    database: process.env.DB_NAME || 'fptu_lost_found'
  });

  try {
    const [rows] = await connection.query('SELECT * FROM post_media WHERE post_id = "fbe15f29-7c2a-467c-ae96-60ceabce080d"');
    console.log('MEDIA:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await connection.end();
  }
}

run();
