import { Router } from "express";
import { all, get } from "../db/connection.js";
import * as s from "../lib/serialize.js";

const router = Router();

// Content endpoints are intentionally public/read-only — they serve the
// same static catalog to every learner. Ownership and progress on top of
// this content lives in the per-child routes instead.

router.get("/regions", (req, res, next) => {
  try {
    res.json(all('SELECT * FROM regions ORDER BY "order" ASC').map(s.region));
  } catch (err) {
    next(err);
  }
});

router.get("/lessons/:lessonId", (req, res, next) => {
  try {
    const row = get("SELECT * FROM lessons WHERE id = ?", [req.params.lessonId]);
    if (!row) return res.status(404).json({ error: "Lesson not found" });
    res.json(s.lesson(row));
  } catch (err) {
    next(err);
  }
});

router.get("/regions/:slug/lessons", (req, res, next) => {
  try {
    const rows = all('SELECT * FROM lessons WHERE region_slug = ? ORDER BY "order" ASC', [req.params.slug]);
    res.json(rows.map(s.lesson));
  } catch (err) {
    next(err);
  }
});

router.get("/harakat/sets", (req, res, next) => {
  try {
    res.json(all('SELECT * FROM harakat_items ORDER BY "order" ASC').map(s.harakatItem));
  } catch (err) {
    next(err);
  }
});

router.get("/harakat/questions", (req, res, next) => {
  try {
    res.json(all('SELECT * FROM harakat_questions ORDER BY "order" ASC').map(s.harakatQuestion));
  } catch (err) {
    next(err);
  }
});

router.get("/words", (req, res, next) => {
  try {
    res.json(all('SELECT * FROM word_items ORDER BY "order" ASC').map(s.wordItem));
  } catch (err) {
    next(err);
  }
});

router.get("/read-sentences", (req, res, next) => {
  try {
    res.json(all('SELECT * FROM read_sentences ORDER BY "order" ASC').map(s.readSentence));
  } catch (err) {
    next(err);
  }
});

router.get("/collection/catalog", (req, res, next) => {
  try {
    res.json(all('SELECT * FROM collection_catalog ORDER BY "order" ASC').map(s.collectionCatalogItem));
  } catch (err) {
    next(err);
  }
});

router.get("/avatar/catalog", (req, res, next) => {
  try {
    const rows = all('SELECT * FROM avatar_catalog ORDER BY category ASC, "order" ASC');
    const grouped = rows.reduce((acc, row) => {
      (acc[row.category] ??= []).push(s.avatarCatalogItem(row));
      return acc;
    }, {});
    res.json(grouped);
  } catch (err) {
    next(err);
  }
});

export default router;
