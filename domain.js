// Domain rules for the tire-change Verdict. Terms follow GLOSSARY.md.

export const THRESHOLD_C = 7;
export const NEAR_THRESHOLD_MARGIN_C = 1;
export const WEEK_DAYS = 7;

/** Aug–Jan asks about switching to winter tires, Feb–Jul about switching to summer tires. */
export function defaultDirection(date = new Date()) {
  const month = date.getMonth(); // 0 = January
  return month >= 7 || month === 0 ? "winter" : "summer";
}

/** Season key, e.g. "2026-winter" for Aug 2026–Jan 2027. A Season Alert goes out at most once per Season. */
export function seasonKey(date = new Date()) {
  const year = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
  return `${year}-${defaultDirection(date)}`;
}

export function mean(values) {
  const known = values.filter((v) => typeof v === "number");
  if (known.length === 0) return null;
  return known.reduce((sum, v) => sum + v, 0) / known.length;
}

/**
 * Weekly Mean: mean of the 7 complete days before `todayIndex`.
 * Returns null when too many of those days are missing to trust the result.
 */
export function weeklyMean(dailyMeans, todayIndex) {
  const week = dailyMeans.slice(Math.max(0, todayIndex - WEEK_DAYS), todayIndex);
  const known = week.filter((v) => typeof v === "number");
  return known.length >= WEEK_DAYS - 2 ? mean(known) : null;
}

/** Trailing 7-day mean for every day that has a full window behind it. */
export function rollingWeeklyMeans(dailyMeans) {
  return dailyMeans.map((_, i) =>
    i < WEEK_DAYS - 1 ? null : mean(dailyMeans.slice(i - WEEK_DAYS + 1, i + 1)),
  );
}

export function verdict(direction, weeklyMeanC) {
  if (direction === "allseason") return { isTime: false, nearThreshold: false }; // that's the whole point of them
  const isTime = direction === "winter" ? weeklyMeanC <= THRESHOLD_C : weeklyMeanC > THRESHOLD_C;
  const nearThreshold = Math.abs(weeklyMeanC - THRESHOLD_C) <= NEAR_THRESHOLD_MARGIN_C;
  return { isTime, nearThreshold };
}
