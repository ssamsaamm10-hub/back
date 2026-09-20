import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
fs.mkdirSync(dataDir, { recursive: true });

const dbFile = process.env.DATABASE_FILE || path.join(dataDir, "dev.db");

export const db = new DatabaseSync(dbFile);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

// Thin helpers around the synchronous node:sqlite API so route files read
// like normal SQL instead of repeating .prepare()/.run() everywhere.
export function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

export function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

export function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

export function transaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
