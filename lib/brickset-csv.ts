export function parseBricksetDate(dateStr: string): Date | null {
  if (!dateStr?.trim()) return null;
  const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function retirementFlagsFromBricksetExitDate(exitDate: string): {
  retired?: boolean;
  retiringSoon?: boolean;
} {
  const exit = parseBricksetDate(exitDate);
  if (!exit) return {};

  const monthsUntilExit =
    (exit.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsUntilExit > 0 && monthsUntilExit <= 12) {
    return { retiringSoon: true, retired: false };
  }
  if (monthsUntilExit <= 0) {
    return { retired: true, retiringSoon: false };
  }
  return { retired: false, retiringSoon: false };
}
