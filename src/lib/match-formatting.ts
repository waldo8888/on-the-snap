export function formatMatchDuration(
  startedAt: string | null,
  completedAt: string | null
) {
  if (!startedAt || !completedAt) {
    return null;
  }

  const startTime = new Date(startedAt).getTime();
  const endTime = new Date(completedAt).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
    return null;
  }

  const totalMinutes = Math.round((endTime - startTime) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}
