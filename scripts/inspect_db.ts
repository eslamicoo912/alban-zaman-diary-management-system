import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('alban-dairy.db');
const db = new Database(dbPath);

const rows = db.prepare('SELECT name, length(data) as size FROM collections').all() as { name: string; size: number }[];
console.log('Collections in database:');
console.table(rows);

const usersRow = db.prepare("SELECT data FROM collections WHERE name = 'users'").get() as { data: string } | undefined;
if (usersRow) {
  try {
    const users = JSON.parse(usersRow.data);
    console.log('Users in database:', users);
  } catch (e) {
    console.log('Error parsing users data:', e);
  }
} else {
  console.log('No users collection found in database.');
}
