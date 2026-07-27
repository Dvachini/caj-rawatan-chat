import crypto from 'node:crypto';

import { hashPassword, newSessionToken, sessionVerifierHash, verifyPassword } from './auth.js';

const sessionDays = 7;

export function createAuthStore(db) {
  return {
    async register({ email, password, token }) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      try {
        return await db.transaction(async (client) => {
          const invite = await client.query(
            `UPDATE invites
             SET used_at = now()
             WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
             RETURNING role`,
            [tokenHash],
          );

          if (!invite.rowCount) return null;

          const passwordHash = await hashPassword(password);
          const result = await client.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, $3)
             RETURNING id, email, role`,
            [email, passwordHash, invite.rows[0].role],
          );

          return result.rows[0];
        });
      } catch (error) {
        if (error.code === '23505') return null;
        throw error;
      }
    },

    async login(email, password) {
      const result = await db.query(
        'SELECT id, email, role, password_hash FROM users WHERE email = $1 AND disabled_at IS NULL',
        [email],
      );
      const row = result.rows[0];
      if (!row || !await verifyPassword(password, row.password_hash)) return null;
      const session = newSessionToken();
      await db.query(
        `INSERT INTO sessions (selector, verifier_hash, user_id, expires_at)
         VALUES ($1, $2, $3, now() + $4 * interval '1 day')`,
        [session.selector, session.verifierHash, row.id, sessionDays],
      );
      return { token: session.token, user: { id: row.id, email: row.email, role: row.role } };
    },

    async authenticate(token) {
      if (!token) return null;
      const parsed = sessionVerifierHash(token);
      if (!parsed) return null;
      const result = await db.query(
        `SELECT s.verifier_hash, u.id, u.email, u.role
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.selector = $1 AND s.expires_at > now() AND u.disabled_at IS NULL`,
        [parsed.selector],
      );
      const row = result.rows[0];
      if (!row) return null;
      const expected = Buffer.from(row.verifier_hash, 'hex');
      const actual = Buffer.from(parsed.verifierHash, 'hex');
      if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
      return { id: row.id, email: row.email, role: row.role };
    },

    async logout(token) {
      const parsed = token && sessionVerifierHash(token);
      if (parsed) await db.query('DELETE FROM sessions WHERE selector = $1', [parsed.selector]);
    },
  };
}
