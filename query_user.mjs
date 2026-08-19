import dotenv from 'dotenv';
dotenv.config({ path: '.env.prod' });
import { sql } from '@vercel/postgres';

async function main() {
  try {
    const res = await sql`SELECT id, name, email, role, password FROM users WHERE name ILIKE '%Loveyy%' OR email ILIKE '%Loveyy%'`;
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
}
main();
