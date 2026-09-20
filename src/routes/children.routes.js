import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { all, get, run, transaction } from "../db/connection.js";
import { requireAuth, requireOwnChild } from "../middleware/auth.js";
import * as s from "../lib/serialize.js";
import { DEFAULT_OWNED_COLLECTION_NAMES, DEFAULT_OWNED_AVATAR_NAMES } from "../data/seedData.js";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res, next) => {
  try {
    const children = all("SELECT * FROM child_profiles WHERE owner_id = ? ORDER BY created_at ASC", [
      req.user.id,
    ]);
    res.json(children.map(s.child));
  } catch (err) {
    next(err);
  }
});

const createChildSchema = z.object({
  name: z.string().min(1).max(40),
  emoji: z.string().max(8).optional(),
  color: z.string().max(20).optional(),
});

router.post("/", (req, res, next) => {
  try {
    const parsed = createChildSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const childId = randomUUID();

    transaction(() => {
      run("INSERT INTO child_profiles (id, owner_id, name, emoji, color) VALUES (?,?,?,?,?)", [
        childId,
        req.user.id,
        parsed.data.name,
        parsed.data.emoji ?? "🦁",
        parsed.data.color ?? "primary",
      ]);

      // Unlock the first region (by order), lock the rest.
      const regions = all('SELECT * FROM regions ORDER BY "order" ASC');
      regions.forEach((r, idx) => {
        run(
          "INSERT INTO child_region_progress (id, child_id, region_slug, completed, status) VALUES (?,?,?,?,?)",
          [randomUUID(), childId, r.slug, 0, idx === 0 ? "ACTIVE" : "LOCKED"]
        );
      });

      // Grant the starter collection + avatar items every new profile ships with.
      const starterCollection = all(
        `SELECT * FROM collection_catalog WHERE name IN (${DEFAULT_OWNED_COLLECTION_NAMES.map(() => "?").join(",")})`,
        DEFAULT_OWNED_COLLECTION_NAMES
      );
      for (const item of starterCollection) {
        run("INSERT INTO child_collection_items (id, child_id, item_id) VALUES (?,?,?)", [
          randomUUID(),
          childId,
          item.id,
        ]);
      }

      const starterAvatar = all(
        `SELECT * FROM avatar_catalog WHERE name IN (${DEFAULT_OWNED_AVATAR_NAMES.map(() => "?").join(",")})`,
        DEFAULT_OWNED_AVATAR_NAMES
      );
      for (const item of starterAvatar) {
        run("INSERT INTO child_avatar_items (id, child_id, item_id) VALUES (?,?,?)", [
          randomUUID(),
          childId,
          item.id,
        ]);
      }

      run("INSERT INTO avatar_loadouts (id, child_id) VALUES (?, ?)", [randomUUID(), childId]);
    });

    const created = get("SELECT * FROM child_profiles WHERE id = ?", [childId]);
    res.status(201).json(s.child(created));
  } catch (err) {
    next(err);
  }
});

router.get("/:childId", requireOwnChild, (req, res) => {
  res.json(s.child(req.child));
});

const updateChildSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  emoji: z.string().max(8).optional(),
  color: z.string().max(20).optional(),
});

router.patch("/:childId", requireOwnChild, (req, res, next) => {
  try {
    const parsed = updateChildSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const fields = parsed.data;
    const setClauses = Object.keys(fields).map((k) => `${k} = ?`);
    if (setClauses.length > 0) {
      run(`UPDATE child_profiles SET ${setClauses.join(", ")} WHERE id = ?`, [
        ...Object.values(fields),
        req.child.id,
      ]);
    }
    const updated = get("SELECT * FROM child_profiles WHERE id = ?", [req.child.id]);
    res.json(s.child(updated));
  } catch (err) {
    next(err);
  }
});

router.delete("/:childId", requireOwnChild, (req, res, next) => {
  try {
    // Deleting a profile only removes that profile's own rows — never
    // touches catalog content.
    const childId = req.child.id;
    transaction(() => {
      run("DELETE FROM mastery_records WHERE child_id = ?", [childId]);
      run("DELETE FROM session_logs WHERE child_id = ?", [childId]);
      run("DELETE FROM child_collection_items WHERE child_id = ?", [childId]);
      run("DELETE FROM child_avatar_items WHERE child_id = ?", [childId]);
      run("DELETE FROM avatar_loadouts WHERE child_id = ?", [childId]);
      run("DELETE FROM child_region_progress WHERE child_id = ?", [childId]);
      run("DELETE FROM child_profiles WHERE id = ?", [childId]);
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
