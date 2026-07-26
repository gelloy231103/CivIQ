export const PROFESSIONAL_EXAM_ITEMS = 170;
export const PROFESSIONAL_EXAM_MINUTES = 190;
export const QUESTION_TARGET_SECONDS = Math.round((PROFESSIONAL_EXAM_MINUTES * 60) / PROFESSIONAL_EXAM_ITEMS);

export function formatQuestionDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
