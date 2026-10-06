/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Merino sends the literal string "Group Stage" for matches in the
// group phase; any other value signals a knockout stage.
const GROUP_STAGE_LABEL = "Group Stage";

// Map from the literal `match.stage` string Merino sends for each
// knockout phase to the corresponding Fluent message ID. Expected
// spellings, not yet observed in production (tournament hasn't reached
// knockouts at time of writing).
export const KNOCKOUT_STAGE_L10N_IDS = {
  "Round of 32": "newtab-sports-widget-round-32",
  "Round of 16": "newtab-sports-widget-round-16",
  "Quarter-finals": "newtab-sports-widget-quarter-finals",
  "Semi-finals": "newtab-sports-widget-semi-finals",
  "Bronze Final": "newtab-sports-widget-bronze-finals",
  Final: "newtab-sports-widget-final",
};

/**
 * Resolves a match to a Fluent ID for its section label.
 *
 * Group phase: derives the ID from the team's group letter, e.g.
 * a match in "Group A" yields newtab-sports-widget-group-a.
 *
 * Knockout phase: looks up `match.stage` in KNOCKOUT_STAGE_L10N_IDS.
 *
 * Returns `null` when the input doesn't match any known shape so
 * callers can fall back to raw `match.stage` text. Warns on each
 * unmapped value so unexpected backend data is visible in the console.
 */
export function getMatchSectionL10nId(match) {
  if (match?.stage === GROUP_STAGE_LABEL) {
    const groupString = match.home_team?.group || match.away_team?.group;
    const lastChar = groupString?.trim().slice(-1).toLowerCase();
    if (lastChar && lastChar >= "a" && lastChar <= "l") {
      return `newtab-sports-widget-group-${lastChar}`;
    }
    console.warn(
      `Sports widget: malformed team.group=${JSON.stringify(groupString)}; falling back to raw text.`
    );
    return null;
  }
  const id = KNOCKOUT_STAGE_L10N_IDS[match?.stage];
  if (!id && match?.stage) {
    console.warn(
      `Sports widget: unmapped match.stage=${JSON.stringify(match.stage)}; falling back to raw text.`
    );
  }
  return id ?? null;
}

/**
 * Returns the key used to group consecutive matches into a single
 * section: the full team group string ("Group A") for group stage,
 * or the raw `match.stage` value otherwise.
 */
export function getMatchSectionKey(match) {
  if (match?.stage === GROUP_STAGE_LABEL) {
    return match.home_team?.group || match.away_team?.group || match.stage;
  }
  return match?.stage;
}

/**
 * Groups a flat list of matches into ordered sections, preserving the
 * input order. Consecutive matches sharing the same section key go
 * under one section; if the same key reappears later it gets a new
 * section (we do not re-sort).
 */
export function groupMatchesBySection(matches) {
  const sections = [];
  for (const match of matches) {
    const key = getMatchSectionKey(match);
    const last = sections[sections.length - 1];
    if (last && last.key === key) {
      last.matches.push(match);
    } else {
      sections.push({ key, matches: [match] });
    }
  }
  return sections;
}
