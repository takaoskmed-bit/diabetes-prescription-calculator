const dayMilliseconds = 24 * 60 * 60 * 1000;

export function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function calculateDaysUntilDate(
  todayDateInputValue: string,
  nextDateInputValue: string,
) {
  const today = parseDateInputValue(todayDateInputValue);
  const nextDate = parseDateInputValue(nextDateInputValue);

  if (!today || !nextDate) {
    return "";
  }

  const diffDays = Math.round(
    (nextDate.getTime() - today.getTime()) / dayMilliseconds,
  );

  return String(Math.max(0, diffDays));
}
