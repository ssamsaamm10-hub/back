import { randomUUID } from "node:crypto";
import { db, run, get, all } from "./connection.js";
import {
  REGIONS,
  LESSONS,
  HARAKAT_SETS,
  HARAKAT_QUESTIONS,
  WORDS,
  READ_SENTENCES,
  COLLECTION_ITEMS,
  AVATAR_ITEMS,
} from "../data/seedData.js";

export function seed() {
  seedRegions();
  seedLessons();
  seedHarakat();
  seedWords();
  seedReadSentences();
  seedCollection();
  seedAvatar();
}

function seedRegions() {
  for (const r of REGIONS) {
    const existing = get("SELECT id FROM regions WHERE slug = ?", [r.slug]);
    if (existing) {
      run(
        `UPDATE regions SET name=?, subtitle=?, emoji=?, color=?, "order"=?, missions=? WHERE slug=?`,
        [r.name, r.subtitle, r.emoji, r.color, r.order, r.missions, r.slug]
      );
    } else {
      run(
        `INSERT INTO regions (id, slug, name, subtitle, emoji, color, "order", missions) VALUES (?,?,?,?,?,?,?,?)`,
        [randomUUID(), r.slug, r.name, r.subtitle, r.emoji, r.color, r.order, r.missions]
      );
    }
  }
}

function seedLessons() {
  for (const l of LESSONS) {
    const existing = get(`SELECT id FROM lessons WHERE region_slug = ? AND "order" = ?`, [l.regionSlug, l.order]);
    if (!existing) {
      run(
        `INSERT INTO lessons (id, region_slug, title, "order", steps_json) VALUES (?,?,?,?,?)`,
        [randomUUID(), l.regionSlug, l.title, l.order, JSON.stringify(l.steps)]
      );
    }
  }
}

function seedHarakat() {
  if (all("SELECT id FROM harakat_items").length === 0) {
    for (const h of HARAKAT_SETS) {
      run(
        `INSERT INTO harakat_items (id, base, haraka, display, name, sound, color, "order") VALUES (?,?,?,?,?,?,?,?)`,
        [randomUUID(), h.base, h.haraka, h.display, h.name, h.sound, h.color, h.order]
      );
    }
  }
  if (all("SELECT id FROM harakat_questions").length === 0) {
    for (const q of HARAKAT_QUESTIONS) {
      run(
        `INSERT INTO harakat_questions (id, display, name, sound, options_csv, answer, "order") VALUES (?,?,?,?,?,?,?)`,
        [randomUUID(), q.display, q.name, q.sound, q.options.join(","), q.answer, q.order]
      );
    }
  }
}

function seedWords() {
  if (all("SELECT id FROM word_items").length === 0) {
    for (const w of WORDS) {
      run(
        `INSERT INTO word_items (id, word, plain, letters_csv, pool_csv, "order") VALUES (?,?,?,?,?,?)`,
        [randomUUID(), w.word, w.plain, w.letters.join(","), w.pool.join(","), w.order]
      );
    }
  }
}

function seedReadSentences() {
  if (all("SELECT id FROM read_sentences").length === 0) {
    for (const s of READ_SENTENCES) {
      run(`INSERT INTO read_sentences (id, text, "order") VALUES (?,?,?)`, [randomUUID(), s.text, s.order]);
    }
  }
}

function seedCollection() {
  if (all("SELECT id FROM collection_catalog").length === 0) {
    for (const c of COLLECTION_ITEMS) {
      run(`INSERT INTO collection_catalog (id, name, emoji, type, "order") VALUES (?,?,?,?,?)`, [
        randomUUID(),
        c.name,
        c.emoji,
        c.type,
        c.order,
      ]);
    }
  }
}

function seedAvatar() {
  if (all("SELECT id FROM avatar_catalog").length === 0) {
    for (const [category, items] of Object.entries(AVATAR_ITEMS)) {
      for (const i of items) {
        run(`INSERT INTO avatar_catalog (id, category, name, emoji, "order") VALUES (?,?,?,?,?)`, [
          randomUUID(),
          category,
          i.name,
          i.emoji,
          i.order,
        ]);
      }
    }
  }
}
