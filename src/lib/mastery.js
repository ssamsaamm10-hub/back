// Shared rule for turning a stream of right/wrong attempts into a mastery
// status. Kept in one place so "what counts as stalled" is defined once —
// this is exactly the number the teacher/parent dashboard's stall alerts
// read back out.
const STALL_ATTEMPTS_THRESHOLD = 3;
const MASTERY_ACCURACY_THRESHOLD = 0.8;

export function nextMasteryState(existing, wasCorrect) {
  const prevAttempts = existing?.attemptsCount ?? 0;
  const prevCorrectCount = Math.round((existing?.accuracyScore ?? 0) * prevAttempts);

  const attemptsCount = prevAttempts + 1;
  const correctCount = prevCorrectCount + (wasCorrect ? 1 : 0);
  const accuracyScore = correctCount / attemptsCount;

  let status;
  if (accuracyScore >= MASTERY_ACCURACY_THRESHOLD && attemptsCount >= 2) {
    status = "MASTERED";
  } else if (attemptsCount >= STALL_ATTEMPTS_THRESHOLD && accuracyScore < MASTERY_ACCURACY_THRESHOLD) {
    status = "STALLED";
  } else {
    status = "IN_PROGRESS";
  }

  return { attemptsCount, accuracyScore, status };
}
