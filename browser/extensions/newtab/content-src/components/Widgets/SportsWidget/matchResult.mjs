/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Resolves the winning team's `key` for a finished match, or null for a draw.
// Mirrors the score resolution used in SportsMatchRow: regular + extra time,
// then a penalty shootout when the aggregate is level.
export const getMatchWinnerKey = match => {
  if (!match) {
    return null;
  }
  const homeScore = (match.home_score || 0) + (match.home_extra || 0);
  const awayScore = (match.away_score || 0) + (match.away_extra || 0);
  if (homeScore > awayScore) {
    return match.home_team.key;
  }
  if (awayScore > homeScore) {
    return match.away_team.key;
  }
  // Level aggregate: a shootout decides it only when both penalty scores are
  // present (mirrors the SportsMatchRow `hasPenalties` guard).
  const hasPenalties =
    match.home_penalty !== null &&
    match.home_penalty !== undefined &&
    match.away_penalty !== null &&
    match.away_penalty !== undefined;
  if (hasPenalties && match.home_penalty !== match.away_penalty) {
    return match.home_penalty > match.away_penalty
      ? match.home_team.key
      : match.away_team.key;
  }
  return null;
};
