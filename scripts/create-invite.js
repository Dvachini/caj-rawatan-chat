import { createDatabase, createInvite, migrate } from '../server/db.js';

const role = process.argv[2] === 'staff' ? 'staff' : 'admin';
const db = createDatabase(process.env.DATABASE_URL);
await migrate(db);
const token = await createInvite(db, role);
await db.close();
console.log(`Invite (${role}, valid 24h):`);
console.log(`http://100.82.192.25:5000/?invite=${token}`);
