import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const keyLength = 64;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, keyLength);
  return `scrypt:${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [algorithm, saltHex, keyHex] = stored.split(':');
  if (algorithm !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function newSessionToken() {
  const selector = crypto.randomBytes(16).toString('hex');
  const verifier = crypto.randomBytes(32).toString('hex');
  return {
    token: `${selector}.${verifier}`,
    selector,
    verifierHash: crypto.createHash('sha256').update(verifier).digest('hex'),
  };
}

export function sessionVerifierHash(token) {
  const [selector, verifier] = token.split('.');
  if (!selector || !verifier) return null;
  return { selector, verifierHash: crypto.createHash('sha256').update(verifier).digest('hex') };
}
