export const child = (row) => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  emoji: row.emoji,
  color: row.color,
  stars: row.stars,
  gems: row.gems,
  createdAt: row.created_at,
});

export const region = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  subtitle: row.subtitle,
  emoji: row.emoji,
  color: row.color,
  order: row.order,
  missions: row.missions,
});

export const lesson = (row) => ({
  id: row.id,
  regionSlug: row.region_slug,
  title: row.title,
  order: row.order,
  steps: JSON.parse(row.steps_json),
});

export const harakatItem = (row) => ({
  id: row.id,
  base: row.base,
  haraka: row.haraka,
  display: row.display,
  name: row.name,
  sound: row.sound,
  color: row.color,
  order: row.order,
});

export const harakatQuestion = (row) => ({
  id: row.id,
  display: row.display,
  name: row.name,
  sound: row.sound,
  options: row.options_csv.split(","),
  answer: row.answer,
  order: row.order,
});

export const wordItem = (row) => ({
  id: row.id,
  word: row.word,
  plain: row.plain,
  letters: row.letters_csv.split(","),
  pool: row.pool_csv.split(","),
  order: row.order,
});

export const readSentence = (row) => ({ id: row.id, text: row.text, order: row.order });

export const collectionCatalogItem = (row) => ({
  id: row.id,
  name: row.name,
  emoji: row.emoji,
  type: row.type,
  order: row.order,
});

export const avatarCatalogItem = (row) => ({
  id: row.id,
  category: row.category,
  name: row.name,
  emoji: row.emoji,
  order: row.order,
});

export const regionProgress = (row) => ({
  id: row.id,
  childId: row.child_id,
  regionSlug: row.region_slug,
  completed: row.completed,
  status: row.status,
  updatedAt: row.updated_at,
});

export const masteryRecord = (row) => ({
  id: row.id,
  childId: row.child_id,
  lessonId: row.lesson_id,
  conceptKey: row.concept_key,
  status: row.status,
  accuracyScore: row.accuracy_score,
  attemptsCount: row.attempts_count,
  lastAttemptAt: row.last_attempt_at,
});

export const sessionLog = (row) => ({
  id: row.id,
  childId: row.child_id,
  startedAt: row.started_at,
  durationSeconds: row.duration_seconds,
  regionSlug: row.region_slug,
});

export const avatarLoadout = (row) =>
  row && {
    id: row.id,
    childId: row.child_id,
    hatId: row.hat_id,
    capeId: row.cape_id,
    petId: row.pet_id,
    accessoryId: row.accessory_id,
    updatedAt: row.updated_at,
  };
