import jwt from "jsonwebtoken";
import { get } from "../db/connection.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Fail loudly at boot rather than silently signing tokens with `undefined`.
  throw new Error("JWT_SECRET is not set. Add it to your .env file.");
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

// Requires a valid bearer token. Attaches { id, email, role } to req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Verifies the :childId route param belongs to the authenticated user.
// Prevents one parent from reading/writing another family's child data —
// ownership is always re-checked server-side against the DB, never assumed
// from the URL alone.
export function requireOwnChild(req, res, next) {
  const { childId } = req.params;
  if (!childId) return res.status(400).json({ error: "childId is required" });

  const child = get("SELECT * FROM child_profiles WHERE id = ?", [childId]);
  if (!child) return res.status(404).json({ error: "Child profile not found" });
  if (child.owner_id !== req.user.id) {
    return res.status(403).json({ error: "You do not have access to this child profile" });
  }
  req.child = child;
  next();
}
