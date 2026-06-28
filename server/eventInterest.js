export function computeInterestScore(event) {
  let score = 0;

  if (typeof event.popularity === "number" && event.popularity > 0) {
    score += Math.min(
      72,
      Math.round(Math.log10(event.popularity + 1) * 20),
    );
  }
  if (event.imageUrl) score += 12;
  if (event.category === "festival") score += 14;
  if (event.category === "sports" || event.category === "music") score += 10;
  if (event.isLongWeekend) score += 18;
  if (event.source === "ticketmaster" || event.source === "seatgeek") {
    score += 4;
  }

  return Math.min(100, score);
}

/** Tag high-interest ticket events for map/list emphasis. */
export function applyEventInterest(events) {
  const withScores = events.map((event) => ({
    ...event,
    interestScore: computeInterestScore(event),
  }));

  const ticketLike = withScores.filter((e) => e.category !== "holiday");
  if (ticketLike.length === 0) return withScores;

  const sorted = [...ticketLike].sort(
    (a, b) => (b.interestScore ?? 0) - (a.interestScore ?? 0),
  );
  const rankIndex = Math.max(0, Math.floor(sorted.length * 0.12) - 1);
  const threshold = Math.max(28, sorted[rankIndex]?.interestScore ?? 40);

  return withScores.map((event) => ({
    ...event,
    featured:
      event.category !== "holiday" &&
      (event.interestScore ?? 0) >= threshold,
  }));
}
