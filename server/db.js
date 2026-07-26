import fs from 'node:fs';
import crypto from 'node:crypto';

import pg from 'pg';

const { Pool } = pg;

export function createDatabase(connectionString) {
  const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30000 });
  return {
    query: (text, values) => pool.query(text, values),
    close: () => pool.end(),
  };
}

export async function migrate(db) {
  await db.query(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
}

export async function createInvite(db, role = 'admin', hours = 24) {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await db.query(
    'INSERT INTO invites (token_hash, role, expires_at) VALUES ($1, $2, now() + $3 * interval \'1 hour\')',
    [hash, role, hours],
  );
  return token;
}
