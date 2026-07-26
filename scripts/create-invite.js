import { createDatabase, createInvite, migrate } from '../server/db.js';

const role = process.argv[2] === 'staff' ? 'staff' : 'admin';
const db = createDatabase(process.env.DATABASE_URL);
await migrate(db);
const token = await createInvite(db, role);
await db.close();
const appUrl = process.env.APP_URL || 'http://127.0.0.1:5000';
console.log(`Invite (${role}, valid 24h):`);
console.log(`${appUrl.replace(/\/$/, '')}/?invite=${token}`);
