import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { get, run } from "../db/connection.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

const toPublicUser = (row) => ({ id: row.id, email: row.email, role: row.role });

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["PARENT", "TEACHER"]).default("PARENT"),
});

router.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { email, password, role } = parsed.data;

    const existing = get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    run("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)", [
      id,
      email,
      passwordHash,
      role,
    ]);
    const user = get("SELECT * FROM users WHERE id = ?", [id]);

    const token = signToken(user);
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { email, password } = parsed.data;

    const user = get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});

export default router;
