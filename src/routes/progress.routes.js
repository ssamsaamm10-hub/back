import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { all, get, run, transaction } from "../db/connection.js";
import { requireAuth, requireOwnChild } from "../middleware/auth.js";
import { nextMasteryState } from "../lib/mastery.js";
import * as s from "../lib/serialize.js";

const router = Router();
router.use(requireAuth);
router.use("/:childId", requireOwnChild);

// ── Regions / map progress ──────────────────────────────────────────

router.get("/:childId/regions", (req, res, next) => {
  try {
    const regions = all('SELECT * FROM regions ORDER BY "order" ASC');
    const progress = all("SELECT * FROM child_region_progress WHERE child_id = ?", [req.child.id]);
    const progressBySlug = Object.fromEntries(progress.map((p) => [p.region_slug, p]));

    const merged = regions.map((r) => ({
      ...s.region(r),
      completed: progressBySlug[r.slug]?.completed ?? 0,
      status: progressBySlug[r.slug]?.status ?? "LOCKED",
    }));
    res.json(merged);
  } catch (err) {
    next(err);
  }
});

const completeMissionSchema = z.object({
  starsEarned: z.number().int().min(0).max(20).default(1),
  gemsEarned: z.number().int().min(0).max(20).default(0),
});

router.post("/:childId/regions/:slug/complete-mission", (req, res, next) => {
  try {
    const parsed = completeMissionSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const region = get("SELECT * FROM regions WHERE slug = ?", [req.params.slug]);
    if (!region) return res.status(404).json({ error: "Region not found" });

    const current = get("SELECT * FROM child_region_progress WHERE child_id = ? AND region_slug = ?", [
      req.child.id,
      region.slug,
    ]);
    if (!current) {
      return res.status(404).json({ error: "Region progress not initialized for this child" });
    }
    if (current.status === "LOCKED") {
      return res.status(403).json({ error: "This region is still locked" });
    }

    const completed = Math.min(region.missions, current.completed + 1);
    const status = completed >= region.missions ? "COMPLETED" : "ACTIVE";

    transaction(() => {
      run(
        `UPDATE child_region_progress SET completed = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
        [completed, status, current.id]
      );
      run("UPDATE child_profiles SET stars = stars + ?, gems = gems + ? WHERE id = ?", [
        parsed.data.starsEarned,
        parsed.data.gemsEarned,
        req.child.id,
      ]);

      // Unlock the next region in order once this one is fully completed.
      if (status === "COMPLETED") {
        const nextRegion = get('SELECT * FROM regions WHERE "order" > ? ORDER BY "order" ASC LIMIT 1', [
          region.order,
        ]);
        if (nextRegion) {
          run(
            `UPDATE child_region_progress SET status = 'ACTIVE' WHERE child_id = ? AND region_slug = ? AND status = 'LOCKED'`,
            [req.child.id, nextRegion.slug]
          );
        }
      }
    });

    const updated = get("SELECT * FROM child_region_progress WHERE id = ?", [current.id]);
    res.json(s.regionProgress(updated));
  } catch (err) {
    next(err);
  }
});

// ── Mastery attempts ────────────────────────────────────────────────

const attemptSchema = z.object({
  conceptKey: z.string().min(1),
  correct: z.boolean(),
  lessonId: z.string().optional(),
});

router.post("/:childId/mastery/attempt", (req, res, next) => {
  try {
    const parsed = attemptSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const { conceptKey, correct, lessonId } = parsed.data;

    const existingRow = get("SELECT * FROM mastery_records WHERE child_id = ? AND concept_key = ?", [
      req.child.id,
      conceptKey,
    ]);
    const existing = existingRow && {
      attemptsCount: existingRow.attempts_count,
      accuracyScore: existingRow.accuracy_score,
    };

    const { attemptsCount, accuracyScore, status } = nextMasteryState(existing, correct);

    let id;
    if (existingRow) {
      id = existingRow.id;
      run(
        `UPDATE mastery_records
         SET attempts_count = ?, accuracy_score = ?, status = ?, last_attempt_at = datetime('now'), lesson_id = ?
         WHERE id = ?`,
        [attemptsCount, accuracyScore, status, lessonId ?? existingRow.lesson_id, id]
      );
    } else {
      id = randomUUID();
      run(
        `INSERT INTO mastery_records (id, child_id, lesson_id, concept_key, status, accuracy_score, attempts_count)
         VALUES (?,?,?,?,?,?,?)`,
        [id, req.child.id, lessonId ?? null, conceptKey, status, accuracyScore, attemptsCount]
      );
    }

    const record = get("SELECT * FROM mastery_records WHERE id = ?", [id]);
    res.json(s.masteryRecord(record));
  } catch (err) {
    next(err);
  }
});

router.get("/:childId/mastery", (req, res, next) => {
  try {
    const records = all("SELECT * FROM mastery_records WHERE child_id = ? ORDER BY last_attempt_at DESC", [
      req.child.id,
    ]);
    res.json(records.map(s.masteryRecord));
  } catch (err) {
    next(err);
  }
});

// ── Sessions ─────────────────────────────────────────────────────────

const sessionSchema = z.object({
  durationSeconds: z.number().int().min(1).max(6 * 60 * 60),
  regionSlug: z.string().optional(),
  startedAt: z.string().datetime().optional(),
});

router.post("/:childId/sessions", (req, res, next) => {
  try {
    const parsed = sessionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const id = randomUUID();
    if (parsed.data.startedAt) {
      run("INSERT INTO session_logs (id, child_id, started_at, duration_seconds, region_slug) VALUES (?,?,?,?,?)", [
        id,
        req.child.id,
        parsed.data.startedAt,
        parsed.data.durationSeconds,
        parsed.data.regionSlug ?? null,
      ]);
    } else {
      run("INSERT INTO session_logs (id, child_id, duration_seconds, region_slug) VALUES (?,?,?,?)", [
        id,
        req.child.id,
        parsed.data.durationSeconds,
        parsed.data.regionSlug ?? null,
      ]);
    }

    const created = get("SELECT * FROM session_logs WHERE id = ?", [id]);
    res.status(201).json(s.sessionLog(created));
  } catch (err) {
    next(err);
  }
});

// ── Collection & avatar ownership ───────────────────────────────────

router.get("/:childId/collection", (req, res, next) => {
  try {
    const catalog = all('SELECT * FROM collection_catalog ORDER BY "order" ASC');
    const owned = all("SELECT item_id FROM child_collection_items WHERE child_id = ?", [req.child.id]);
    const ownedIds = new Set(owned.map((o) => o.item_id));
    res.json(catalog.map((item) => ({ ...s.collectionCatalogItem(item), owned: ownedIds.has(item.id) })));
  } catch (err) {
    next(err);
  }
});

router.post("/:childId/collection/:itemId/unlock", (req, res, next) => {
  try {
    const item = get("SELECT * FROM collection_catalog WHERE id = ?", [req.params.itemId]);
    if (!item) return res.status(404).json({ error: "Collection item not found" });

    const existing = get("SELECT * FROM child_collection_items WHERE child_id = ? AND item_id = ?", [
      req.child.id,
      item.id,
    ]);
    if (existing) return res.status(200).json({ id: existing.id, alreadyOwned: true });

    const id = randomUUID();
    run("INSERT INTO child_collection_items (id, child_id, item_id) VALUES (?,?,?)", [
      id,
      req.child.id,
      item.id,
    ]);
    res.status(201).json({ id, itemId: item.id, alreadyOwned: false });
  } catch (err) {
    next(err);
  }
});

router.get("/:childId/avatar", (req, res, next) => {
  try {
    const catalog = all('SELECT * FROM avatar_catalog ORDER BY category ASC, "order" ASC');
    const owned = all("SELECT item_id FROM child_avatar_items WHERE child_id = ?", [req.child.id]);
    const ownedIds = new Set(owned.map((o) => o.item_id));
    const loadoutRow = get("SELECT * FROM avatar_loadouts WHERE child_id = ?", [req.child.id]);

    const grouped = catalog.reduce((acc, item) => {
      (acc[item.category] ??= []).push({ ...s.avatarCatalogItem(item), owned: ownedIds.has(item.id) });
      return acc;
    }, {});

    res.json({ items: grouped, loadout: s.avatarLoadout(loadoutRow) });
  } catch (err) {
    next(err);
  }
});

const loadoutSchema = z.object({
  hatId: z.string().nullable().optional(),
  capeId: z.string().nullable().optional(),
  petId: z.string().nullable().optional(),
  accessoryId: z.string().nullable().optional(),
});

router.patch("/:childId/avatar/loadout", (req, res, next) => {
  try {
    const parsed = loadoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    // Verify the child actually owns every item they're trying to equip —
    // never trust equip requests from the client at face value.
    const idsToCheck = Object.values(parsed.data).filter(Boolean);
    if (idsToCheck.length > 0) {
      const placeholders = idsToCheck.map(() => "?").join(",");
      const ownedCount = all(
        `SELECT item_id FROM child_avatar_items WHERE child_id = ? AND item_id IN (${placeholders})`,
        [req.child.id, ...idsToCheck]
      ).length;
      if (ownedCount !== idsToCheck.length) {
        return res.status(403).json({ error: "One or more items are not owned by this child" });
      }
    }

    const existing = get("SELECT * FROM avatar_loadouts WHERE child_id = ?", [req.child.id]);
    const merged = {
      hat_id: "hatId" in parsed.data ? parsed.data.hatId : existing?.hat_id ?? null,
      cape_id: "capeId" in parsed.data ? parsed.data.capeId : existing?.cape_id ?? null,
      pet_id: "petId" in parsed.data ? parsed.data.petId : existing?.pet_id ?? null,
      accessory_id: "accessoryId" in parsed.data ? parsed.data.accessoryId : existing?.accessory_id ?? null,
    };

    if (existing) {
      run(
        `UPDATE avatar_loadouts SET hat_id=?, cape_id=?, pet_id=?, accessory_id=?, updated_at=datetime('now') WHERE child_id=?`,
        [merged.hat_id, merged.cape_id, merged.pet_id, merged.accessory_id, req.child.id]
      );
    } else {
      run(
        `INSERT INTO avatar_loadouts (id, child_id, hat_id, cape_id, pet_id, accessory_id) VALUES (?,?,?,?,?,?)`,
        [randomUUID(), req.child.id, merged.hat_id, merged.cape_id, merged.pet_id, merged.accessory_id]
      );
    }

    const updated = get("SELECT * FROM avatar_loadouts WHERE child_id = ?", [req.child.id]);
    res.json(s.avatarLoadout(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
