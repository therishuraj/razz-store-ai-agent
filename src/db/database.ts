import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "../../chat.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge_base (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    topic   TEXT NOT NULL,
    content TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id         TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    sender          TEXT NOT NULL CHECK(sender IN ('user', 'ai')),
    text            TEXT NOT NULL,
    timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );
`);

export default db;
