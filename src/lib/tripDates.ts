export type TripLengthPreset = "weekend" | "week" | "two-weeks" | "month";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  return Math.max(
    1,
    Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );
}

/** Quick trip windows starting from today (or the nearest useful weekend). */
export function getTripPresetRange(
  preset: TripLengthPreset,
  base = new Date(),
): { from: string; to: string } {
  const start = new Date(base);
  const end = new Date(base);

  switch (preset) {
    case "weekend": {
      const dow = start.getDay();
      const fri = new Date(start);
      if (dow === 0) fri.setDate(start.getDate() - 2);
      else if (dow === 6) fri.setDate(start.getDate() - 1);
      else if (dow < 5) fri.setDate(start.getDate() + (5 - dow));
      const sun = new Date(fri);
      sun.setDate(fri.getDate() + 2);
      return { from: isoDate(fri), to: isoDate(sun) };
    }
    case "week":
      end.setDate(start.getDate() + 6);
      return { from: isoDate(start), to: isoDate(end) };
    case "two-weeks":
      end.setDate(start.getDate() + 13);
      return { from: isoDate(start), to: isoDate(end) };
    case "month":
      end.setDate(start.getDate() + 29);
      return { from: isoDate(start), to: isoDate(end) };
    default:
      return { from: isoDate(start), to: isoDate(end) };
  }
}

export function tripMatchesPreset(
  from: string,
  to: string,
  preset: TripLengthPreset,
): boolean {
  if (!from || !to) return false;
  const range = getTripPresetRange(preset);
  return from === range.from && to === range.to;
}
