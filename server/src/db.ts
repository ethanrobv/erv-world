import Database from 'better-sqlite3';
import path from 'path';

/**
 * Resolved path for the SQLite database file.
 * We use process.cwd() to ensure the file is created in the server root.
 */
const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'fishing.db');

/**
 * The main SQLite database instance.
 * WAL mode is enabled for performance.
 */
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT,
    xp INTEGER DEFAULT 0,
    fishing_log TEXT DEFAULT '{}',
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
