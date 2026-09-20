import { Router } from "express";
import { all, get } from "../db/connection.js";
import { requireAuth, requireOwnChild } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.use("/:childId", requireOwnChild);

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const startOfDay = (d) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };

router.get("/:childId/insights", (req, res, next) => {
  try {
    const child = req.child;
    const activeProgress = get(
      `SELECT cp.*, r.name as region_name, r."order" as region_order
       FROM child_region_progress cp JOIN regions r ON r.slug = cp.region_slug
       WHERE cp.child_id = ? AND cp.status = 'ACTIVE' ORDER BY r."order" ASC LIMIT 1`,
      [child.id]
    );
    const masteryRecords = all("SELECT * FROM mastery_records WHERE child_id = ?", [child.id]);
    const sessions = all("SELECT * FROM session_logs WHERE child_id = ? ORDER BY started_at DESC LIMIT 200", [
      child.id,
    ]).map((r) => ({ ...r, started_at: new Date(r.started_at) }));

    const mastered = masteryRecords.filter((m) => m.status === "MASTERED").map((m) => m.concept_key);
    const needsPractice = masteryRecords
      .filter((m) => m.status === "IN_PROGRESS" || m.status === "STALLED")
      .map((m) => m.concept_key);
    const stalled = masteryRecords
      .filter((m) => m.status === "STALLED")
      .map((m) => `${m.concept_key} — لم يُتقَن بعد ${m.attempts_count} محاولات`);

    const today = startOfDay(new Date());
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today); day.setDate(day.getDate() - i);
      const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
      const minutes = sessions
        .filter((se) => se.started_at >= day && se.started_at < nextDay)
        .reduce((sum, se) => sum + se.duration_seconds, 0) / 60;
      weekly.push({ day: DAYS[day.getDay()], minutes: Math.round(minutes) });
    }

    const thisWeek = weekly.filter((w) => w.minutes > 0).length;
    const totalMinutes = Math.round(sessions.reduce((sum, se) => sum + se.duration_seconds, 0) / 60);

    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const day = new Date(today); day.setDate(day.getDate() - i);
      const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
      const has = sessions.some((se) => se.started_at >= day && se.started_at < nextDay);
      if (has) streak++;
      else if (i > 0) break;
    }

    const stalledRecord = masteryRecords.find((m) => m.status === "STALLED");
    const suggestion =
      stalled.length > 0
        ? `يحتاج إلى مزيد من التدريب على: ${stalledRecord?.concept_key ?? "المفهوم الحالي"}. جرّب جلسة قصيرة ٥ دقائق يوميًا.`
        : needsPractice.length > 0
        ? "التقدّم جيد — استمر بجلسات قصيرة ومنتظمة."
        : "أداء ممتاز هذا الأسبوع! يمكن الانتقال إلى تحدٍّ جديد.";

    res.json({
      childName: child.name,
      currentArea: activeProgress?.region_name ?? null,
      mastered,
      needsPractice,
      stalled,
      sessions: { thisWeek, totalMinutes, streak },
      weekly,
      suggestion,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
