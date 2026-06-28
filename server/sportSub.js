export function inferSportSub({
  source,
  genre = "",
  subGenre = "",
  typeName = "",
  title = "",
  seatgeekType = "",
} = {}) {
  if (source === "api-football") return "football";

  const hay = [genre, subGenre, typeName, title, seatgeekType]
    .join(" ")
    .toLowerCase();

  if (
    /\b(nba|basketball|wnba|euroleague)\b/.test(hay) ||
    seatgeekType === "nba" ||
    seatgeekType === "ncaa_basketball"
  ) {
    return "basketball";
  }
  if (
    /\b(nfl|ncaa football|american football|gridiron)\b/.test(hay) ||
    seatgeekType === "nfl" ||
    seatgeekType === "ncaa_football"
  ) {
    return "american-football";
  }
  if (
    /\b(nhl|hockey|ice hockey)\b/.test(hay) ||
    seatgeekType === "nhl"
  ) {
    return "hockey";
  }
  if (
    /\b(mlb|baseball)\b/.test(hay) ||
    seatgeekType === "mlb"
  ) {
    return "baseball";
  }
  if (/\b(tennis|atp|wta|grand slam)\b/.test(hay)) return "tennis";
  if (/\b(f1|formula|nascar|motogp|racing|motorsport)\b/.test(hay)) {
    return "motorsport";
  }
  if (
    /\b(soccer|football|mls|premier league|la liga|bundesliga|fifa)\b/.test(
      hay,
    ) ||
    seatgeekType === "mls"
  ) {
    return "football";
  }

  return "other";
}
