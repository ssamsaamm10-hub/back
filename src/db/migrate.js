// Idempotent schema setup. Safe to run on every server boot.
//
// Design principle carried through from the platform spec: static CONTENT
// (regions, lessons, harakat sets, words, catalog items) is fully decoupled
// from per-child STATE (progress, ownership, sessions, mastery). Nothing
// here ever cascades a content edit into a child's history, or vice versa.

import { db } from "./connection.js";

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'PARENT',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS child_profiles (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🦁',
      color TEXT NOT NULL DEFAULT 'primary',
      stars INTEGER NOT NULL DEFAULT 0,
      gems INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_child_profiles_owner ON child_profiles(owner_id);

    -- ── Content catalog (static) ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      missions INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      region_slug TEXT NOT NULL REFERENCES regions(slug),
      title TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      steps_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS harakat_items (
      id TEXT PRIMARY KEY,
      base TEXT NOT NULL,
      haraka TEXT NOT NULL,
      display TEXT NOT NULL,
      name TEXT NOT NULL,
      sound TEXT NOT NULL,
      color TEXT NOT NULL,
      "order" INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS harakat_questions (
      id TEXT PRIMARY KEY,
      display TEXT NOT NULL,
      name TEXT NOT NULL,
      sound TEXT NOT NULL,
      options_csv TEXT NOT NULL,
      answer TEXT NOT NULL,
      "order" INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS word_items (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL,
      plain TEXT NOT NULL,
      letters_csv TEXT NOT NULL,
      pool_csv TEXT NOT NULL,
      "order" INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS read_sentences (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      "order" INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection_catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      type TEXT NOT NULL,
      "order" INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS avatar_catalog (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      "order" INTEGER NOT NULL
    );

    -- ── Per-child state (dynamic) ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS child_region_progress (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES child_profiles(id),
      region_slug TEXT NOT NULL REFERENCES regions(slug),
      completed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'LOCKED',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(child_id, region_slug)
    );

    CREATE TABLE IF NOT EXISTS mastery_records (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES child_profiles(id),
      lesson_id TEXT REFERENCES lessons(id),
      concept_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      accuracy_score REAL NOT NULL DEFAULT 0,
      attempts_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mastery_child_concept ON mastery_records(child_id, concept_key);

    CREATE TABLE IF NOT EXISTS session_logs (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES child_profiles(id),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      duration_seconds INTEGER NOT NULL,
      region_slug TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_session_logs_child ON session_logs(child_id);

    CREATE TABLE IF NOT EXISTS child_collection_items (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES child_profiles(id),
      item_id TEXT NOT NULL REFERENCES collection_catalog(id),
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(child_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS child_avatar_items (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES child_profiles(id),
      item_id TEXT NOT NULL REFERENCES avatar_catalog(id),
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(child_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS avatar_loadouts (
      id TEXT PRIMARY KEY,
      child_id TEXT UNIQUE NOT NULL REFERENCES child_profiles(id),
      hat_id TEXT,
      cape_id TEXT,
      pet_id TEXT,
      accessory_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
